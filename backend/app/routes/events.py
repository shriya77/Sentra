"""POST /api/events/typing and POST /api/events/voice."""
import tempfile
import os
from datetime import date, timedelta

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth_firebase import get_firebase_uid
from app.db import get_db
from app.models import TypingSession, DailySummary, User, VoiceSession
from app.schemas import TypingEventCreate
from app.engine.drift import compute_risk_for_date
from app.engine.voice_features import (
    VOICE_KEYS,
    extract_egemaps,
    get_audio_duration_sec,
    compute_voice_drift,
    drift_to_level,
    confidence_level,
    baseline_from_sessions,
    BASELINE_N,
)
from app.engine.speech_sentiment import get_speech_sentiment_only

router = APIRouter(prefix="/api/events", tags=["events"])


def _get_or_create_user(db: Session, user_id: str) -> User:
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        u = User(id=user_id, is_org_user=False)
        db.add(u)
        db.commit()
        db.refresh(u)
    return u


@router.post("/typing")
def submit_typing_event(payload: TypingEventCreate, uid: str = Depends(get_firebase_uid), db: Session = Depends(get_db)):
    _get_or_create_user(db, uid)
    today = date.today()
    session = TypingSession(
        user_id=uid,
        date=today,
        avg_interval_ms=payload.avg_interval_ms,
        std_interval_ms=payload.std_interval_ms,
        backspace_ratio=payload.backspace_ratio,
        session_duration_sec=payload.session_duration_sec,
        fragmentation_count=payload.fragmentation_count,
        late_night=payload.late_night,
    )
    db.add(session)
    db.commit()
    # Update daily summary typing aggregates (average of all sessions today)
    summaries = (
        db.query(TypingSession)
        .filter(TypingSession.user_id == uid, TypingSession.date == today)
        .all()
    )
    n = len(summaries)
    avg_i = sum(s.avg_interval_ms for s in summaries) / n
    std_i = sum(s.std_interval_ms for s in summaries) / n
    bs = sum(s.backspace_ratio for s in summaries) / n
    frag = sum(s.fragmentation_count for s in summaries)
    late = any(s.late_night for s in summaries)
    daily = db.query(DailySummary).filter(
        DailySummary.user_id == uid,
        DailySummary.date == today,
    ).first()
    if not daily:
        daily = DailySummary(
            user_id=uid,
            date=today,
            typing_avg_interval_ms=avg_i,
            typing_std_ms=std_i,
            typing_backspace_ratio=bs,
            typing_fragmentation=float(frag),
            typing_late_night=late,
        )
        db.add(daily)
    else:
        daily.typing_avg_interval_ms = avg_i
        daily.typing_std_ms = std_i
        daily.typing_backspace_ratio = bs
        daily.typing_fragmentation = float(frag)
        daily.typing_late_night = late
    db.commit()
    compute_risk_for_date(db, uid, today)
    return {"ok": True, "message": "Typing session recorded. No raw content is stored."}


@router.post("/voice")
async def submit_voice_event(
    file: UploadFile = File(..., description="Audio file (wav, mp3, etc.)"),
    analyze_speech: bool = Query(False, description="If true, transcribe and analyze sentiment of speech (no transcript stored)."),
    uid: str = Depends(get_firebase_uid),
    db: Session = Depends(get_db),
):
    """Accept audio upload, extract eGeMAPS, compute baseline drift, store voice strain. Optionally analyze speech sentiment."""
    _get_or_create_user(db, uid)
    today = date.today()

    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Expected an audio file.")

    suffix = os.path.splitext(file.filename or "")[1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    speech_sentiment = None
    try:
        duration_s = get_audio_duration_sec(tmp_path)
        features = extract_egemaps(tmp_path)
        if analyze_speech:
            speech_sentiment = get_speech_sentiment_only(tmp_path)
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    if not features:
        raise HTTPException(
            status_code=422,
            detail="Could not extract voice features. Install opensmile/soundfile and ensure the file is valid audio.",
        )

    used_keys = [k for k in VOICE_KEYS if k in features]
    if len(used_keys) < 4:
        raise HTTPException(
            status_code=422,
            detail="Not enough eGeMAPS features extracted. Need at least 4.",
        )

    # Baseline: last N voice sessions (any date – multiple recordings same day count)
    baseline_sessions = (
        db.query(VoiceSession)
        .filter(
            VoiceSession.user_id == uid,
            VoiceSession.voice_features.isnot(None),
        )
        .order_by(VoiceSession.date.desc(), VoiceSession.id.desc())
        .limit(BASELINE_N)
        .all()
    )
    sessions_for_baseline = [
        {"voice_features": s.voice_features}
        for s in baseline_sessions
    ]

    baseline_mean, baseline_std = baseline_from_sessions(sessions_for_baseline, VOICE_KEYS)

    # Total sessions after we save this one (for "Building baseline (k/7)" message)
    total_sessions_after = db.query(VoiceSession).filter(VoiceSession.user_id == uid).count() + 1

    if not baseline_mean or not baseline_std:
        # Building baseline: need at least 2 sessions to compute mean/std
        conf = "low"
        score_val = 0
        level = "low"
        drivers = []
        message = f"Building baseline ({total_sessions_after}/{BASELINE_N}). Keep recording to get strain level."
    else:
        result = compute_voice_drift(features, baseline_mean, baseline_std, VOICE_KEYS)
        drift = result["drift_score"]
        score_val, level = drift_to_level(drift)
        conf = confidence_level(len(baseline_sessions) + 1, duration_s, len(used_keys))
        drivers = result.get("drivers", [])
        message = "Your voice patterns are drifting from baseline." if level != "low" else None

    sent_compound = speech_sentiment.get("compound") if speech_sentiment else None
    sent_label = speech_sentiment.get("label") if speech_sentiment else None

    session = VoiceSession(
        user_id=uid,
        date=today,
        duration_sec=duration_s,
        voice_features=features,
        voice_strain_score=score_val,
        voice_strain_level=level,
        voice_confidence=conf,
        speech_sentiment_compound=sent_compound,
        speech_sentiment_label=sent_label,
    )
    db.add(session)
    db.commit()

    # Update or create daily summary voice fields (latest voice of the day)
    daily = (
        db.query(DailySummary)
        .filter(DailySummary.user_id == uid, DailySummary.date == today)
        .first()
    )
    if daily:
        daily.voice_strain_score = score_val
        daily.voice_strain_level = level
        daily.voice_confidence = conf
        daily.speech_sentiment_compound = sent_compound
        daily.speech_sentiment_label = sent_label
    else:
        daily = DailySummary(
            user_id=uid,
            date=today,
            voice_strain_score=score_val,
            voice_strain_level=level,
            voice_confidence=conf,
            speech_sentiment_compound=sent_compound,
            speech_sentiment_label=sent_label,
        )
        db.add(daily)
    db.commit()
    compute_risk_for_date(db, uid, today)

    payload = {
        "ok": True,
        "voice_strain_score": score_val,
        "voice_strain_level": level,
        "voice_confidence": conf,
        "drivers": drivers,
        "message": message,
    }
    if speech_sentiment is not None:
        payload["speech_sentiment"] = speech_sentiment
    return payload
