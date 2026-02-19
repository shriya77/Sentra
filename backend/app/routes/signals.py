"""GET /api/signals/descriptions - AI-powered signal descriptions."""
from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth_firebase import get_firebase_uid
from app.db import get_db
from app.models import DailySummary
from app.services.chatgpt import generate_signal_description

router = APIRouter(prefix="/api", tags=["signals"])


@router.get("/signals/descriptions")
async def get_signal_descriptions(uid: str = Depends(get_firebase_uid), db: Session = Depends(get_db)):
    """Get AI-powered descriptions for Sleep, Activity, and Typing signals."""
    today = date.today()
    summary = (
        db.query(DailySummary)
        .filter(DailySummary.user_id == uid, DailySummary.date == today)
        .first()
    )
    
    user_data = {}
    if summary:
        user_data = {
            "sleep_hours": summary.sleep_hours,
            "sleep_quality": summary.sleep_quality,
            "mood_value": summary.mood_value,
            "activity_minutes": summary.activity_minutes,
            "typing_avg_interval_ms": summary.typing_avg_interval_ms,
            "typing_std_ms": summary.typing_std_ms,
            "typing_backspace_ratio": summary.typing_backspace_ratio,
            "typing_fragmentation": summary.typing_fragmentation,
        }
    
    # Generate AI descriptions for each signal
    sleep_desc = await generate_signal_description("sleep", user_data)
    activity_desc = await generate_signal_description("activity", user_data)
    typing_desc = await generate_signal_description("typing", user_data)
    
    return {
        "sleep": sleep_desc,
        "activity": activity_desc,
        "typing": typing_desc,
    }
