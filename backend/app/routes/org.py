"""GET /api/org/summary - Care Mode aggregate (counts, no PII)."""
from collections import Counter
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import RiskScore, User

router = APIRouter(prefix="/api/org", tags=["org"])


@router.get("/summary")
def org_summary(db: Session = Depends(get_db)):
    today = date.today()
    # Latest score per org user (today or most recent)
    org_ids = [r.id for r in db.query(User.id).filter(User.is_org_user == True).all()]
    if not org_ids:
        return {
            "counts": {"Stable": 0, "Watch": 0, "High": 0},
            "average_risk": 0,
            "momentum_distribution": {"stable": 0, "slow_rise": 0, "rapid_rise": 0},
            "total_users": 0,
        }
    status_counts = Counter()
    momentum_counts = Counter()
    scores = []
    for uid in org_ids:
        r = (
            db.query(RiskScore)
            .filter(RiskScore.user_id == uid, RiskScore.date <= today)
            .order_by(RiskScore.date.desc())
            .first()
        )
        if r:
            status_counts[r.status] += 1
            momentum_counts[r.momentum] += 1
            scores.append(r.wellbeing_score)
    total = len(org_ids)
    avg_risk = (100 - sum(scores) / len(scores)) if scores else 0
    return {
        "counts": dict(status_counts),
        "average_risk": round(avg_risk, 1),
        "momentum_distribution": dict(momentum_counts),
        "total_users": total,
    }
