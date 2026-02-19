"""POST /api/events/typing - typing metrics (no raw content)."""
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth_firebase import get_firebase_uid
from app.db import get_db
from app.models import TypingSession, DailySummary, User
from app.schemas import TypingEventCreate
from app.engine.drift import compute_risk_for_date

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
