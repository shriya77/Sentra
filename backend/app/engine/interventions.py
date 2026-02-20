"""Micro-interventions: map drivers to actions and track completion."""
from datetime import date
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models import Intervention

# Expanded list of small steps/interventions for caregivers
ALL_INTERVENTIONS = [
    # Sleep-related
    "Pick one night for a hard cutoff, 30 minutes earlier.",
    "Wind down 20 minutes before bed. No screens.",
    "Try a 5-minute bedtime routine: dim lights, gentle music, or reading.",
    "Set a consistent wake time, even on weekends.",
    "Keep your phone out of the bedroom tonight.",
    "Take a warm shower or bath 1 hour before bed.",
    
    # Activity/Movement
    "5-minute walk around the block.",
    "Do 3 gentle stretches right now.",
    "Stand up and move for 2 minutes every hour.",
    "Take the stairs instead of the elevator today.",
    "Dance to one favorite song.",
    "Step outside for fresh air and 10 deep breaths.",
    
    # Mood/Mental health
    "3-minute brain dump: write down what's on your mind.",
    "60-second breathing reset: inhale 4, hold 4, exhale 4.",
    "Name 3 things you're grateful for today.",
    "Call or text someone you care about.",
    "Listen to a favorite song or podcast for 5 minutes.",
    "Do one small thing that brings you joy.",
    "Practice a 2-minute mindfulness exercise.",
    "Write down one positive moment from today.",
    
    # Stress/Overwhelm
    "Take a 5-minute break. Step away from caregiving tasks.",
    "Drink a glass of water and pause.",
    "Close your eyes and count to 10 slowly.",
    "Do one thing at a time. Prioritize what matters most.",
    "Ask for help with one task today.",
    "Set a timer for 15 minutes and do something just for you.",
    
    # General wellbeing
    "Take a short break when you can.",
    "Eat one nutritious meal or snack today.",
    "Connect with another caregiver or support person.",
    "Do something creative for 10 minutes: draw, write, or craft.",
    "Practice saying 'no' to one non-essential request.",
    "Celebrate one small win from today.",
]

# Legacy mapping for fallback (when AI not available)
ACTIONS_BY_DRIVER = {
    "sleep_hours": "Pick one night for a hard cutoff, 30 minutes earlier.",
    "sleep_quality": "Wind down 20 minutes before bed. No screens.",
    "activity_minutes": "5-minute walk.",
    "mood_value": "3-minute brain dump prompt.",
    "typing_avg_interval_ms": "60-second breathing reset.",
    "typing_std_ms": "60-second breathing reset.",
    "typing_backspace_ratio": "60-second breathing reset.",
    "typing_fragmentation": "60-second breathing reset.",
    "voice_strain_score": "Take a brief vocal rest or drink water.",
}


def get_actions_for_drivers(drivers: list[str]) -> list[str]:
    """Return 1-2 unique action strings for the given drivers."""
    seen = set()
    out = []
    for d in drivers[:3]:
        action = ACTIONS_BY_DRIVER.get(d)
        if action and action not in seen:
            seen.add(action)
            out.append(action)
    if not out:
        out.append("Take a short break when you can.")
    return out[:2]


def get_today_interventions(
    db: Session, 
    user_id: str, 
    drivers: list[str], 
    selected_interventions: Optional[list[str]] = None
) -> list[dict]:
    """
    Get or create today's interventions for user. Returns list of {id, title, completed}.
    
    Args:
        db: Database session
        user_id: User ID
        drivers: List of driver keys (for fallback if selected_interventions not provided)
        selected_interventions: AI-selected interventions (if None, uses driver-based fallback)
    """
    today = date.today()
    
    # Use AI-selected interventions if provided, otherwise fall back to driver-based
    if selected_interventions:
        actions = selected_interventions
    else:
        actions = get_actions_for_drivers(drivers)
    
    # Create intervention IDs from actions (use hash or index for uniqueness)
    intervention_ids = []
    for i, action in enumerate(actions[:3]):  # Max 3 interventions
        # Create a stable ID from the action text (first 50 chars + hash)
        import hashlib
        action_hash = hashlib.md5(action.encode()).hexdigest()[:8]
        iid = f"ai_{action_hash}_{i}"
        intervention_ids.append((iid, action))
    
    if not intervention_ids:
        intervention_ids = [("general", "Take a short break when you can.")]
    
    existing = (
        db.query(Intervention)
        .filter(Intervention.user_id == user_id, Intervention.date == today)
        .all()
    )
    by_key = {e.intervention_id: e for e in existing}
    result = []
    
    for iid, title in intervention_ids:
        if iid in by_key:
            # Update title in case AI selected different interventions
            by_key[iid].title = title
            db.commit()
            result.append({
                "intervention_id": iid,
                "title": by_key[iid].title,
                "completed": by_key[iid].completed,
            })
        else:
            ent = Intervention(
                user_id=user_id,
                date=today,
                intervention_id=iid,
                title=title,
                completed=False,
            )
            db.add(ent)
            db.commit()
            db.refresh(ent)
            result.append({
                "intervention_id": ent.intervention_id,
                "title": ent.title,
                "completed": ent.completed,
            })
    return result


def complete_intervention(db: Session, user_id: str, intervention_id: str, completion_date: date) -> bool:
    """Mark intervention as completed. Returns True if found and updated."""
    ent = (
        db.query(Intervention)
        .filter(
            Intervention.user_id == user_id,
            Intervention.intervention_id == intervention_id,
            Intervention.date == completion_date,
        )
        .first()
    )
    if not ent:
        return False
    ent.completed = True
    db.commit()
    return True
