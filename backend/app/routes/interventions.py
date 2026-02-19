"""GET /api/interventions/today, POST /api/intervention/complete."""
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth_firebase import get_firebase_uid
from app.db import get_db
from app.engine.drift import get_today_score
from app.engine.interventions import get_today_interventions, complete_intervention, ALL_INTERVENTIONS
from app.models import DailySummary
from app.schemas import InterventionComplete
from app.services.chatgpt import select_interventions

router = APIRouter(prefix="/api", tags=["interventions"])


@router.get("/interventions/today")
async def interventions_today(uid: str = Depends(get_firebase_uid), db: Session = Depends(get_db)):
    score = get_today_score(db, uid)
    drivers = (score.get("drivers") or []) if score else []
    status = (score.get("status") or "Stable") if score else "Stable"
    
    # Get today's user data for context
    today = date.today()
    summary = (
        db.query(DailySummary)
        .filter(DailySummary.user_id == uid, DailySummary.date == today)
        .first()
    )
    
    user_context = {}
    if summary:
        user_context = {
            "sleep_hours": summary.sleep_hours,
            "sleep_quality": summary.sleep_quality,
            "mood_value": summary.mood_value,
            "activity_minutes": summary.activity_minutes,
            "typing_avg_interval_ms": summary.typing_avg_interval_ms,
            "typing_std_ms": summary.typing_std_ms,
            "typing_backspace_ratio": summary.typing_backspace_ratio,
            "typing_fragmentation": summary.typing_fragmentation,
        }
    
    # Use AI to select interventions
    selected_interventions = await select_interventions(drivers, status, user_context, ALL_INTERVENTIONS)
    
    # Convert to intervention format and store/retrieve from DB
    return get_today_interventions(db, uid, drivers, selected_interventions)


@router.post("/intervention/complete")
def intervention_complete(payload: InterventionComplete, uid: str = Depends(get_firebase_uid), db: Session = Depends(get_db)):
    d = payload.date
    if d:
        completion_date = date.fromisoformat(d)
    else:
        completion_date = date.today()
    ok = complete_intervention(db, uid, payload.intervention_id, completion_date)
    return {"ok": ok}
