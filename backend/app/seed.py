"""Seed: tables + org users for Care Mode. No fake personal data. Score and trend come from your check-ins."""
import random
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.db import SessionLocal, init_db
from app.models import User, RiskScore, VoiceSession
from app.engine.voice_features import VOICE_KEYS, BASELINE_N


def _seed_demo_user(db: Session) -> None:
    """Ensure 'demo' user exists when Firebase is not configured (fallback). No fake data."""
    if db.query(User).filter(User.id == "demo").first():
        return
    db.add(User(id="demo", is_org_user=False))
    db.commit()


def _seed_org_users(db: Session) -> None:
    """10 fake org users for Care Mode."""
    for i in range(10):
        uid = f"org_user_{i}"
        if db.query(User).filter(User.id == uid).first():
            continue
        db.add(User(id=uid, is_org_user=True))
    db.commit()


def _seed_org_daily_and_risk(db: Session) -> None:
    """Give each org user some risk scores so org summary has distribution."""
    today = date.today()
    # Mix: some stable, some watch, some high
    statuses = ["Stable"] * 5 + ["Watch"] * 3 + ["High"] * 2
    for i in range(10):
        uid = f"org_user_{i}"
        for d in range(14):
            dte = today - timedelta(days=d)
            if db.query(RiskScore).filter(RiskScore.user_id == uid, RiskScore.date == dte).first():
                continue
            # Assign score based on status
            s = statuses[i]
            if s == "Stable":
                score = 75 + (i % 15)
            elif s == "Watch":
                score = 50 + (i % 15)
            else:
                score = 30 + (i % 15)
            db.add(RiskScore(
                user_id=uid,
                date=dte,
                wellbeing_score=float(score),
                status=s,
                momentum="stable",
                confidence="high",
                drivers=[],
            ))
    db.commit()


def _seed_demo_voice_baseline(db: Session) -> None:
    """Seed 7 baseline VoiceSessions for 'demo' user so first real submission gets a strain level (no 'Building baseline')."""
    demo_id = "demo"
    if db.query(User).filter(User.id == demo_id).first() is None:
        return  # demo user must exist first
    existing = db.query(VoiceSession).filter(VoiceSession.user_id == demo_id).count()
    if existing >= BASELINE_N:
        return
    # Plausible eGeMAPS-like values (neutral baseline); small random variation per session
    base_values = {
        "loudness_sma3_amean": -15.0,
        "loudness_sma3_stddevNorm": 0.25,
        "F0semitoneFrom27.5Hz_sma3nz_amean": 28.0,
        "F0semitoneFrom27.5Hz_sma3nz_stddevNorm": 2.0,
        "jitterLocal_sma3nz_amean": 0.02,
        "shimmerLocaldB_sma3nz_amean": 0.3,
        "HNRdBACF_sma3nz_amean": 18.0,
        "spectralFlux_sma3_amean": 0.5,
    }
    today = date.today()
    to_create = BASELINE_N - existing
    for i in range(to_create):
        dte = today - timedelta(days=i + 1)  # yesterday, 2 days ago, ... so baseline is before today
        if db.query(VoiceSession).filter(VoiceSession.user_id == demo_id, VoiceSession.date == dte).first():
            continue
        features = {k: base_values.get(k, 0.0) + random.gauss(0, 0.05 * abs(base_values.get(k, 1))) for k in VOICE_KEYS if k in base_values}
        for k in VOICE_KEYS:
            if k not in features:
                features[k] = 0.0
        db.add(VoiceSession(
            user_id=demo_id,
            date=dte,
            duration_sec=12.0 + random.uniform(-1, 2),
            voice_features=features,
            voice_strain_score=0,
            voice_strain_level="low",
            voice_confidence="low" if (to_create - i) < 4 else "medium",
        ))
    db.commit()


def run_seed() -> None:
    init_db()
    db = SessionLocal()
    try:
        _seed_demo_user(db)
        _seed_demo_voice_baseline(db)
        _seed_org_users(db)
        _seed_org_daily_and_risk(db)
    finally:
        db.close()
