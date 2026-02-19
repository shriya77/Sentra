"""GET /api/insight/today."""
from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth_firebase import get_firebase_uid
from app.db import get_db
from app.engine.drift import get_today_score
from app.models import DailySummary
from app.services.chatgpt import generate_insight as generate_ai_insight

router = APIRouter(prefix="/api", tags=["insight"])


@router.get("/insight/today")
async def insight_today(uid: str = Depends(get_firebase_uid), db: Session = Depends(get_db)):
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
    
    # Use AI-powered insight generation
    result = await generate_ai_insight(drivers, status, user_context)
    
    # Ensure suggested_actions is included (from the fallback function)
    if "suggested_actions" not in result:
        from app.engine.insight import suggest_actions
        result["suggested_actions"] = suggest_actions(drivers)[:2]
    
    return result
