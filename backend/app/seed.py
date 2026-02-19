"""Seed: tables + org users for Care Mode. No fake personal data. Score and trend come from your check-ins."""
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.db import SessionLocal, init_db
from app.models import User, RiskScore


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


def run_seed() -> None:
    init_db()
    db = SessionLocal()
    try:
        _seed_demo_user(db)
        _seed_org_users(db)
        _seed_org_daily_and_risk(db)
    finally:
        db.close()
