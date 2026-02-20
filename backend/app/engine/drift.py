"""Personal Behavioral Drift Engine: baseline, z-scores, risk score, momentum."""
from datetime import date, timedelta
from typing import Any, Optional

import numpy as np
from sqlalchemy.orm import Session

from app.models import DailySummary, RiskScore

# Driver labels for human-readable display
DRIVER_LABELS = {
    "sleep_hours": "sleep amount",
    "sleep_quality": "sleep quality",
    "activity_minutes": "activity level",
    "mood_value": "mood",
    "typing_avg_interval_ms": "typing rhythm",
    "typing_std_ms": "typing consistency",
    "typing_backspace_ratio": "typing friction",
    "typing_fragmentation": "focus fragmentation",
    "voice_strain_score": "voice strain",
    "speech_sentiment_compound": "mood from words",
}

EPS = 1e-6
DEFAULT_BASELINE_DAYS = 7
TREND_DAYS = 7

# Weights for risk (higher deviation = worse). Invert so "good" direction raises wellbeing.
WEIGHTS = {
    "sleep_hours": 0.14,
    "sleep_quality": 0.14,
    "activity_minutes": 0.14,
    "mood_value": 0.18,
    "typing_avg_interval_ms": 0.11,
    "typing_std_ms": 0.07,
    "typing_backspace_ratio": 0.07,
    "typing_fragmentation": 0.06,
    "voice_strain_score": 0.09,  # higher score = more strain = worse
    "speech_sentiment_compound": 0.06,  # lower (more negative) = worse; opt-in so often None
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
            "voice_strain_score": float(r.voice_strain_score) if r.voice_strain_score is not None else None,
            "speech_sentiment_compound": float(r.speech_sentiment_compound) if r.speech_sentiment_compound is not None else None,
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
    # Sleep quality, activity, mood, speech sentiment: higher is better -> negative z = worse
    if signal in ("sleep_quality", "activity_minutes", "mood_value", "speech_sentiment_compound"):
        return max(0, -z)
    # Typing: higher interval, std, backspace ratio, fragmentation = worse
    if signal in ("typing_avg_interval_ms", "typing_std_ms", "typing_backspace_ratio", "typing_fragmentation"):
        return max(0, z)
    # Voice strain: higher score = worse
    if signal == "voice_strain_score":
        return max(0, z)
    return max(0, abs(z))


def _weighted_risk(day_row: dict, baseline: dict[str, tuple[float, float]]) -> tuple[float, list[str], list[tuple[str, float]]]:
    """Returns (raw_risk_0_to_1, list of top driver keys, list of (key, contribution) tuples)."""
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
    return raw_risk, drivers, contributions


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
    # Voice strain 0-100: higher score = more strain = worse -> invert to wellbeing
    vs = day_row.get("voice_strain_score")
    if vs is not None:
        parts.append(max(0, 100 - float(vs)))
        drivers.append("voice_strain_score")
    # Speech sentiment compound -1..1 -> 0-100 (higher = better)
    ssc = day_row.get("speech_sentiment_compound")
    if ssc is not None:
        p = (float(ssc) + 1) / 2.0 * 100.0
        parts.append(max(0, min(100, p)))
        drivers.append("speech_sentiment_compound")
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


def _compute_momentum_label_and_strength(scores: list[float]) -> tuple[str, Optional[str]]:
    """
    Compute momentum_label ("Rising" | "Stable" | "Recovering") and momentum_strength ("slow" | "rapid" | None).
    scores ordered by date ascending (oldest first).
    Uses simple threshold: slope > threshold → Rising, slope < -threshold → Recovering, else Stable
    """
    if len(scores) < 2:
        return "Stable", None
    
    # For 2 data points, check the actual change (more sensitive)
    if len(scores) == 2:
        score_change = scores[1] - scores[0]  # Today - Yesterday
        # If score dropped by 5+ points, that's "Rising" (risk increasing)
        if score_change <= -5:
            strength = "rapid" if score_change <= -15 else "slow"
            return "Rising", strength
        # If score improved by 5+ points, that's "Recovering"
        elif score_change >= 5:
            strength = "rapid" if score_change >= 15 else "slow"
            return "Recovering", strength
        else:
            return "Stable", None
    
    # For 3+ data points, use linear regression
    x = np.arange(len(scores))
    y = np.array(scores)
    slope, _ = np.polyfit(x, y, 1)
    
    # Lower threshold: 0.8 points per day (more sensitive to changes)
    # Positive slope = wellbeing improving = Recovering
    # Negative slope = wellbeing declining = Rising
    # Near zero = Stable
    
    if slope >= 0.8:
        # Recovering
        strength = "rapid" if slope >= 2.0 else "slow"
        return "Recovering", strength
    elif slope <= -0.8:
        # Rising (risk increasing)
        strength = "rapid" if slope <= -2.0 else "slow"
        return "Rising", strength
    else:
        return "Stable", None


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
        "voice_strain_score": float(summary.voice_strain_score) if summary.voice_strain_score is not None else None,
        "speech_sentiment_compound": float(summary.speech_sentiment_compound) if summary.speech_sentiment_compound is not None else None,
    }
    end_baseline = target_date - timedelta(days=1)
    start_baseline = end_baseline - timedelta(days=baseline_days + 30)
    all_rows = _get_daily_feature_rows(db, user_id, start_baseline, end_baseline)
    baseline = _baseline_stats(all_rows, baseline_days) if all_rows else {}

    driver_contributions_list = []
    if not baseline:
        # First day(s): no baseline yet, score from today's check-in only
        wellbeing, status, drivers = _first_day_wellbeing(day_row)
        confidence = "low"
    else:
        risk_0_1, drivers, contributions = _weighted_risk(day_row, baseline)
        wellbeing, status = _wellbeing_and_status(risk_0_1)
        missing = sum(1 for k in WEIGHTS if day_row.get(k) is None)
        confidence = _confidence(baseline_days, missing)
        
        # Calculate driver contributions for display
        # Get previous day's score for comparison
        prev_score_row = (
            db.query(RiskScore)
            .filter(
                RiskScore.user_id == user_id,
                RiskScore.date < target_date,
            )
            .order_by(RiskScore.date.desc())
            .first()
        )
        prev_wellbeing = prev_score_row.wellbeing_score if prev_score_row else wellbeing
        
        # Calculate contribution: how much each driver affects the score change
        score_delta = wellbeing - prev_wellbeing
        total_contrib_abs = sum(abs(c[1]) for c in contributions)
        if total_contrib_abs > 0 and abs(score_delta) > 0.1:
            for key, contrib in contributions[:3]:
                if contrib > 0.01:  # Only significant contributions
                    # Contribution as percentage of score change
                    contrib_pct = (contrib / total_contrib_abs) * abs(score_delta) if total_contrib_abs > 0 else 0
                    # Determine direction: if contrib increases risk, it decreases wellbeing
                    direction = "up" if contrib > 0 else "down"
                    driver_contributions_list.append({
                        "key": key,
                        "label": DRIVER_LABELS.get(key, key),
                        "direction": direction,
                        "contribution": round(contrib_pct, 1)
                    })
    
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
    
    # First check if we have a DailySummary for today (required for score computation)
    has_checkin_today = (
        db.query(DailySummary)
        .filter(DailySummary.user_id == user_id, DailySummary.date == today)
        .first() is not None
    )
    
    if not has_checkin_today:
        # No check-in today, return None
        return None
    
    # Get or compute today's score
    r = db.query(RiskScore).filter(RiskScore.user_id == user_id, RiskScore.date == today).first()
    if not r:
        r = compute_risk_for_date(db, user_id, today)
    
    if not r or r.date != today:
        # Safety check: ensure the date matches today
        return None
    
    # Compute momentum_label and momentum_strength from recent scores
    # Always compute if we have at least 2 scores (even if confidence is low)
    score_rows = (
        db.query(RiskScore)
        .filter(
            RiskScore.user_id == user_id,
            RiskScore.date >= today - timedelta(days=TREND_DAYS),
            RiskScore.date <= today,
        )
        .order_by(RiskScore.date)
        .all()
    )
    recent_scores = [s.wellbeing_score for s in score_rows]
    current_score = r.wellbeing_score
    
    # Special handling: if status is "High" and score is very low, default to "Rising"
    if r.status == "High" and current_score < 45:
        if len(recent_scores) >= 2:
            # Compare with previous score
            prev_score = recent_scores[-2]
            score_change = current_score - prev_score
            
            # If score dropped, show Rising
            if score_change < 0:
                momentum_label = "Rising"
                momentum_strength = "rapid" if score_change <= -10 else "slow"
            # If score improved significantly (10+ points), show Recovering
            elif score_change >= 10:
                momentum_label = "Recovering"
                momentum_strength = "rapid" if score_change >= 20 else "slow"
            # If score improved slightly but still critically low (< 30), still show Rising
            elif current_score < 30:
                momentum_label = "Rising"
                momentum_strength = "slow"
            # Otherwise use standard calculation
            else:
                momentum_label, momentum_strength = _compute_momentum_label_and_strength(recent_scores)
        else:
            # Only today's score, but it's High risk - default to Rising
            momentum_label, momentum_strength = "Rising", "slow"
    # For Watch status, be more sensitive
    elif r.status == "Watch" and current_score < 45:
        if len(recent_scores) >= 2:
            prev_score = recent_scores[-2]
            score_change = current_score - prev_score
            if score_change < -3:  # Dropped by 3+ points
                momentum_label = "Rising"
                momentum_strength = "rapid" if score_change <= -10 else "slow"
            else:
                momentum_label, momentum_strength = _compute_momentum_label_and_strength(recent_scores)
        else:
            momentum_label, momentum_strength = "Stable", None
    else:
        # Normal status or Watch with score >= 45 - use standard calculation
        if len(recent_scores) >= 2:
            momentum_label, momentum_strength = _compute_momentum_label_and_strength(recent_scores)
        else:
            momentum_label, momentum_strength = "Stable", None
    
    # Compute driver contributions - show top 3 drivers with their impact
    driver_contributions = []
    if r.drivers:
        # Get today's daily summary to compute contributions
        summary = (
            db.query(DailySummary)
            .filter(DailySummary.user_id == user_id, DailySummary.date == today)
            .first()
        )
        if summary:
            # Compute contributions using baseline
            end_baseline = today - timedelta(days=1)
            start_baseline = end_baseline - timedelta(days=DEFAULT_BASELINE_DAYS + 30)
            all_rows = _get_daily_feature_rows(db, user_id, start_baseline, end_baseline)
            baseline = _baseline_stats(all_rows, DEFAULT_BASELINE_DAYS) if all_rows else {}
            
            if baseline:
                day_row = {
                    "sleep_hours": summary.sleep_hours,
                    "sleep_quality": summary.sleep_quality,
                    "activity_minutes": summary.activity_minutes,
                    "mood_value": summary.mood_value,
                    "typing_avg_interval_ms": summary.typing_avg_interval_ms,
                    "typing_std_ms": summary.typing_std_ms,
                    "typing_backspace_ratio": summary.typing_backspace_ratio,
                    "typing_fragmentation": summary.typing_fragmentation,
                    "voice_strain_score": float(summary.voice_strain_score) if summary.voice_strain_score is not None else None,
                    "speech_sentiment_compound": float(summary.speech_sentiment_compound) if summary.speech_sentiment_compound is not None else None,
                }
                _, _, contributions = _weighted_risk(day_row, baseline)
                
                # Get previous score for comparison to show direction
                prev_score = score_rows[-2].wellbeing_score if len(score_rows) >= 2 else r.wellbeing_score
                score_delta = r.wellbeing_score - prev_score
                
                # Calculate contribution as percentage impact on score
                total_contrib_abs = sum(abs(c[1]) for c in contributions)
                if total_contrib_abs > 0:
                    for key, contrib in contributions[:3]:
                        if abs(contrib) > 0.01:  # Only significant contributions
                            # Contribution as points of score impact
                            contrib_pct = (abs(contrib) / total_contrib_abs) * abs(score_delta) if abs(score_delta) > 0.1 else abs(contrib) * 10
                            # Direction: if contrib increases risk (positive), that's bad (up arrow)
                            # If contrib decreases risk (negative), that's good (down arrow)
                            direction = "up" if contrib > 0 else "down"
                            driver_contributions.append({
                                "key": key,
                                "label": DRIVER_LABELS.get(key, key),
                                "direction": direction,
                                "contribution": round(contrib_pct, 1)
                            })
    
    # Voice strain (from daily summary if present)
    summary_today = (
        db.query(DailySummary)
        .filter(DailySummary.user_id == user_id, DailySummary.date == today)
        .first()
    )
    voice_strain_score = summary_today.voice_strain_score if summary_today else None
    voice_strain_level = summary_today.voice_strain_level if summary_today else None
    voice_confidence = summary_today.voice_confidence if summary_today else None
    speech_sentiment_compound = summary_today.speech_sentiment_compound if summary_today else None
    speech_sentiment_label = summary_today.speech_sentiment_label if summary_today else None

    return {
        "wellbeing_score": r.wellbeing_score,
        "status": r.status,
        "momentum": r.momentum,
        "momentum_label": momentum_label,
        "momentum_strength": momentum_strength,
        "confidence": r.confidence,
        "drivers": r.drivers or [],
        "driver_contributions": driver_contributions,
        "date": r.date.isoformat(),
        "voice_strain_score": voice_strain_score,
        "voice_strain_level": voice_strain_level,
        "voice_confidence": voice_confidence,
        "speech_sentiment_compound": speech_sentiment_compound,
        "speech_sentiment_label": speech_sentiment_label,
    }


def get_trends(db: Session, user_id: str, days: int = 14) -> dict:
    """Get wellbeing scores for the last `days` days (including today) plus projection."""
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
    all_scores = []
    for d in range(days):
        dte = start + timedelta(days=d)
        r = next((x for x in rows if x.date == dte), None)
        if not r:
            r = compute_risk_for_date(db, user_id, dte)
        if r:
            all_scores.append(r.wellbeing_score)
            # Compute momentum_label for this date
            date_scores = (
                db.query(RiskScore)
                .filter(
                    RiskScore.user_id == user_id,
                    RiskScore.date >= dte - timedelta(days=TREND_DAYS),
                    RiskScore.date <= dte,
                )
                .order_by(RiskScore.date)
                .all()
            )
            recent_scores = [s.wellbeing_score for s in date_scores]
            momentum_label, momentum_strength = _compute_momentum_label_and_strength(recent_scores)
            
            result.append({
                "date": r.date.isoformat(),
                "wellbeing_score": r.wellbeing_score,
                "status": r.status,
                "momentum": r.momentum,
                "momentum_label": momentum_label,
                "momentum_strength": momentum_strength,
                "confidence": r.confidence,
            })
    
    # Add projection if we have at least 2 data points
    projection = []
    if len(all_scores) >= 2 and len(result) > 0:
        # Compute slope from last 7 days
        recent_scores = all_scores[-7:] if len(all_scores) >= 7 else all_scores
        x = np.arange(len(recent_scores))
        y = np.array(recent_scores)
        slope, intercept = np.polyfit(x, y, 1)
        
        # Project forward 5 days starting from the last actual date
        last_actual_date = result[-1]["date"]
        # Parse ISO date string back to date object
        last_date_obj = date.fromisoformat(last_actual_date) if isinstance(last_actual_date, str) else last_actual_date
        
        for i in range(1, 6):
            proj_date = last_date_obj + timedelta(days=i)
            # Project score: intercept + slope * (number of days from start of recent_scores)
            proj_score = intercept + slope * (len(recent_scores) - 1 + i)
            proj_score = max(0, min(100, proj_score))
            projection.append({
                "date": proj_date.isoformat(),
                "projected_score": round(proj_score, 1)
            })
    
    return {
        "data": result,
        "projection": projection
    }
