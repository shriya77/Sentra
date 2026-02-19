"""Personal Behavioral Drift Engine: baseline, z-scores, risk score, momentum."""
from datetime import date, timedelta
from typing import Any, Optional

import numpy as np
from sqlalchemy.orm import Session

from app.models import DailySummary, RiskScore

EPS = 1e-6
DEFAULT_BASELINE_DAYS = 7
TREND_DAYS = 7

# Weights for risk (higher deviation = worse). Invert so "good" direction raises wellbeing.
WEIGHTS = {
    "sleep_hours": 0.15,       # too low or too high
    "sleep_quality": 0.15,
    "activity_minutes": 0.15,
    "mood_value": 0.2,
    "typing_avg_interval_ms": 0.12,
    "typing_std_ms": 0.08,
    "typing_backspace_ratio": 0.08,
    "typing_fragmentation": 0.07,
}


def _get_daily_feature_rows(db: Session, user_id: str, from_date: date, to_date: date) -> list[dict]:
    rows = (
        db.query(DailySummary)
        .filter(
            DailySummary.user_id == user_id,
            DailySummary.date >= from_date,
            DailySummary.date <= to_date,
        )
        .order_by(DailySummary.date)
        .all()
    )
    out = []
    for r in rows:
        out.append({
            "date": r.date,
            "sleep_hours": r.sleep_hours,
            "sleep_quality": r.sleep_quality,
            "activity_minutes": r.activity_minutes,
            "mood_value": r.mood_value,
            "typing_avg_interval_ms": r.typing_avg_interval_ms,
            "typing_std_ms": r.typing_std_ms,
            "typing_backspace_ratio": r.typing_backspace_ratio,
            "typing_fragmentation": r.typing_fragmentation,
        })
    return out


def _baseline_stats(rows: list[dict], baseline_days: int = DEFAULT_BASELINE_DAYS) -> dict[str, tuple[float, float]]:
    """Compute mean and std per signal over first N days. Return dict[signal_name] = (mean, std)."""
    if not rows or len(rows) < 2:
        return {}
    use = rows[: min(baseline_days, len(rows))]
    stats = {}
    for key in WEIGHTS:
        vals = [r.get(key) for r in use if r.get(key) is not None]
        if len(vals) < 2:
            continue
        arr = np.array(vals, dtype=float)
        stats[key] = (float(np.mean(arr)), float(np.std(arr)) + EPS)
    return stats


def _z_score(value: Optional[float], mean: float, std: float) -> float:
    if value is None or std <= 0:
        return 0.0
    return (value - mean) / std


def _deviation_to_risk(z: float, signal: str) -> float:
    """Map z-score to contribution to risk. For most signals: worse = higher z or lower value."""
    # Sleep hours: optimal ~7-8; both low and high are bad -> use abs(z) or one-sided
    if signal == "sleep_hours":
        # assume mean ~7, so low sleep = negative z = bad; high sleep = positive z = can be bad too
        return abs(z)
    # Sleep quality, activity, mood: higher is better -> negative z = worse
    if signal in ("sleep_quality", "activity_minutes", "mood_value"):
        return max(0, -z)
    # Typing: higher interval, std, backspace ratio, fragmentation = worse
    if signal in ("typing_avg_interval_ms", "typing_std_ms", "typing_backspace_ratio", "typing_fragmentation"):
        return max(0, z)
    return max(0, abs(z))


def _weighted_risk(day_row: dict, baseline: dict[str, tuple[float, float]]) -> tuple[float, list[str]]:
    """Returns (raw_risk_0_to_1, list of top driver keys)."""
    contributions = []
    for key, (mean, std) in baseline.items():
        val = day_row.get(key)
        if val is None:
            continue
        z = _z_score(val, mean, std)
        contrib = _deviation_to_risk(z, key) * WEIGHTS.get(key, 0)
        contributions.append((key, contrib))
    contributions.sort(key=lambda x: -x[1])
    total = sum(c[1] for c in contributions)
    # Normalize to 0-1 ish; cap and scale to 0-100 as "risk", then we use 100 - risk as wellbeing
    raw_risk = min(1.0, total * 2.0)  # scale so typical drift gives 0.2-0.6
    drivers = [c[0] for c in contributions[:3] if c[1] > 0.05]
    return raw_risk, drivers


def _wellbeing_and_status(risk_0_1: float) -> tuple[float, str]:
    """Map risk [0,1] to wellbeing score 0-100 and status."""
    wellbeing = (1.0 - risk_0_1) * 100.0
    wellbeing = max(0, min(100, wellbeing))
    if wellbeing >= 70:
        status = "Stable"
    elif wellbeing >= 45:
        status = "Watch"
    else:
        status = "High"
    return round(wellbeing, 1), status


def _first_day_wellbeing(day_row: dict) -> tuple[float, str, list[str]]:
    """When there's no baseline yet, score from today's check-in only. Returns (wellbeing 0-100, status, drivers)."""
    drivers = []
    parts = []
    # Mood 1–10 scale (higher = better)
    mood = day_row.get("mood_value")
    if mood is not None:
        p = (float(mood) - 1) / 9.0 * 100.0
        parts.append(max(0, min(100, p)))
        drivers.append("mood_value")
    # Sleep quality 1-5 -> 20-100
    sq = day_row.get("sleep_quality")
    if sq is not None:
        p = (sq - 1) / 4.0 * 80.0 + 20.0
        parts.append(max(0, min(100, p)))
        drivers.append("sleep_quality")
    # Sleep hours: 7 optimal, penalty for <6 or >9
    sh = day_row.get("sleep_hours")
    if sh is not None:
        if sh < 5:
            p = 20.0
        elif sh < 6:
            p = 50.0
        elif sh <= 9:
            p = 70.0 + (4.0 - abs(sh - 7.5)) * 7.5
        else:
            p = max(40, 80 - (sh - 9) * 10)
        parts.append(max(0, min(100, p)))
        drivers.append("sleep_hours")
    # Activity 0-60+ min -> 0-100 (capped)
    act = day_row.get("activity_minutes")
    if act is not None:
        p = min(100, act / 60.0 * 100.0)
        parts.append(p)
        drivers.append("activity_minutes")
    if not parts:
        return 50.0, "Watch", []
    wellbeing = round(sum(parts) / len(parts), 1)
    wellbeing = max(0, min(100, wellbeing))
    if wellbeing >= 70:
        status = "Stable"
    elif wellbeing >= 45:
        status = "Watch"
    else:
        status = "High"
    return wellbeing, status, drivers[:3]


def _momentum(scores: list[float]) -> str:
    """scores ordered by date ascending (oldest first). Return stable / slow_rise / rapid_rise."""
    if len(scores) < 2:
        return "stable"
    x = np.arange(len(scores))
    y = np.array(scores)
    slope, _ = np.polyfit(x, y, 1)
    # wellbeing going down = risk rising
    if slope <= -2:
        return "rapid_rise"
    if slope <= -0.5:
        return "slow_rise"
    return "stable"


def _confidence(n_baseline: int, missing_count: int) -> str:
    if n_baseline < 4 or missing_count >= 4:
        return "low"
    if n_baseline >= 7 and missing_count <= 1:
        return "high"
    return "med"


def compute_risk_for_date(
    db: Session,
    user_id: str,
    target_date: date,
    baseline_days: int = DEFAULT_BASELINE_DAYS,
) -> Optional[RiskScore]:
    """Compute and persist risk score for one day. Returns the RiskScore or None if insufficient data."""
    # Build day_row for target_date from DailySummary if it exists
    summary = (
        db.query(DailySummary)
        .filter(DailySummary.user_id == user_id, DailySummary.date == target_date)
        .first()
    )
    if not summary:
        return None
    day_row = {
        "date": target_date,
        "sleep_hours": summary.sleep_hours,
        "sleep_quality": summary.sleep_quality,
        "activity_minutes": summary.activity_minutes,
        "mood_value": summary.mood_value,
        "typing_avg_interval_ms": summary.typing_avg_interval_ms,
        "typing_std_ms": summary.typing_std_ms,
        "typing_backspace_ratio": summary.typing_backspace_ratio,
        "typing_fragmentation": summary.typing_fragmentation,
    }
    end_baseline = target_date - timedelta(days=1)
    start_baseline = end_baseline - timedelta(days=baseline_days + 30)
    all_rows = _get_daily_feature_rows(db, user_id, start_baseline, end_baseline)
    baseline = _baseline_stats(all_rows, baseline_days) if all_rows else {}

    if not baseline:
        # First day(s): no baseline yet — score from today's check-in only
        wellbeing, status, drivers = _first_day_wellbeing(day_row)
        confidence = "low"
    else:
        risk_0_1, drivers = _weighted_risk(day_row, baseline)
        wellbeing, status = _wellbeing_and_status(risk_0_1)
        missing = sum(1 for k in WEIGHTS if day_row.get(k) is None)
        confidence = _confidence(baseline_days, missing)
    # Momentum from last TREND_DAYS wellbeing scores
    score_rows = (
        db.query(RiskScore)
        .filter(
            RiskScore.user_id == user_id,
            RiskScore.date >= target_date - timedelta(days=TREND_DAYS),
            RiskScore.date < target_date,
        )
        .order_by(RiskScore.date)
        .all()
    )
    recent_scores = [s.wellbeing_score for s in score_rows]
    momentum = _momentum(recent_scores + [wellbeing])
    existing = (
        db.query(RiskScore)
        .filter(RiskScore.user_id == user_id, RiskScore.date == target_date)
        .first()
    )
    if existing:
        existing.wellbeing_score = wellbeing
        existing.status = status
        existing.momentum = momentum
        existing.confidence = confidence
        existing.drivers = drivers
        db.commit()
        return existing
    risk_ent = RiskScore(
        user_id=user_id,
        date=target_date,
        wellbeing_score=wellbeing,
        status=status,
        momentum=momentum,
        confidence=confidence,
        drivers=drivers,
    )
    db.add(risk_ent)
    db.commit()
    db.refresh(risk_ent)
    return risk_ent


def get_today_score(db: Session, user_id: str) -> Optional[dict]:
    """Get or compute today's score for user. Returns dict for API."""
    today = date.today()
    r = db.query(RiskScore).filter(RiskScore.user_id == user_id, RiskScore.date == today).first()
    if not r:
        r = compute_risk_for_date(db, user_id, today)
    if not r:
        return None
    return {
        "wellbeing_score": r.wellbeing_score,
        "status": r.status,
        "momentum": r.momentum,
        "confidence": r.confidence,
        "drivers": r.drivers or [],
        "date": r.date.isoformat(),
    }


def get_trends(db: Session, user_id: str, days: int = 14) -> list[dict]:
    """Get wellbeing scores for the last `days` days (including today)."""
    end = date.today()
    start = end - timedelta(days=days - 1)
    rows = (
        db.query(RiskScore)
        .filter(
            RiskScore.user_id == user_id,
            RiskScore.date >= start,
            RiskScore.date <= end,
        )
        .order_by(RiskScore.date)
        .all()
    )
    # Fill missing days by computing
    result = []
    for d in range(days):
        dte = start + timedelta(days=d)
        r = next((x for x in rows if x.date == dte), None)
        if not r:
            r = compute_risk_for_date(db, user_id, dte)
        if r:
            result.append({
                "date": r.date.isoformat(),
                "wellbeing_score": r.wellbeing_score,
                "status": r.status,
                "momentum": r.momentum,
                "confidence": r.confidence,
            })
    return result
