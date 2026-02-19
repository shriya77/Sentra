"""GET /api/org/summary - Care Mode aggregate (counts, no PII)."""
from collections import Counter
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.engine.drift import _compute_momentum_label_and_strength, TREND_DAYS
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
            "momentum_counts": {"Rising": 0, "Stable": 0, "Recovering": 0},
            "system_strain": "Low",
            "top_org_driver": None,
            "total_users": 0,
        }
    status_counts = Counter()
    momentum_counts = Counter()
    momentum_label_counts = Counter()
    all_drivers = []
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
            
            # Compute momentum_label for this user
            user_scores = (
                db.query(RiskScore)
                .filter(
                    RiskScore.user_id == uid,
                    RiskScore.date >= today - timedelta(days=TREND_DAYS),
                    RiskScore.date <= today,
                )
                .order_by(RiskScore.date)
                .all()
            )
            if len(user_scores) >= 2:
                recent_scores = [s.wellbeing_score for s in user_scores]
                momentum_label, _ = _compute_momentum_label_and_strength(recent_scores)
                momentum_label_counts[momentum_label] += 1
            
            # Collect drivers
            if r.drivers:
                all_drivers.extend(r.drivers[:3])
    
    total = len(org_ids)
    avg_risk = (100 - sum(scores) / len(scores)) if scores else 0
    
    # Calculate system_strain
    watch_high_pct = ((status_counts.get("Watch", 0) + status_counts.get("High", 0)) / total * 100) if total > 0 else 0
    rising_count = momentum_label_counts.get("Rising", 0)
    
    if watch_high_pct > 45 or rising_count >= 3:
        system_strain = "Rising"
    elif watch_high_pct >= 25:
        system_strain = "Moderate"
    else:
        system_strain = "Low"
    
    # Find top org driver
    top_org_driver = None
    if all_drivers:
        driver_counter = Counter(all_drivers)
        top_driver_key = driver_counter.most_common(1)[0][0] if driver_counter else None
        if top_driver_key:
            from app.engine.insight import DRIVER_LABELS
            top_org_driver = DRIVER_LABELS.get(top_driver_key, top_driver_key)
    
    return {
        "counts": dict(status_counts),
        "average_risk": round(avg_risk, 1),
        "momentum_distribution": dict(momentum_counts),
        "momentum_counts": dict(momentum_label_counts),
        "system_strain": system_strain,
        "top_org_driver": top_org_driver,
        "total_users": total,
    }
