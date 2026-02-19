"""POST /api/checkin - daily mood, sleep, activity."""
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth_firebase import get_firebase_uid
from app.db import get_db
from app.models import DailySummary, User
from app.schemas import CheckinCreate
from app.engine.drift import compute_risk_for_date

router = APIRouter(prefix="/api", tags=["checkin"])


def _get_or_create_user(db: Session, user_id: str) -> User:
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        u = User(id=user_id, is_org_user=False)
        db.add(u)
        db.commit()
        db.refresh(u)
    return u


@router.post("/checkin")
def submit_checkin(payload: CheckinCreate, uid: str = Depends(get_firebase_uid), db: Session = Depends(get_db)):
    _get_or_create_user(db, uid)
    today = date.today()
    activity = payload.activity_minutes
    if activity is None and payload.activity_slider is not None:
        activity = (payload.activity_slider / 100.0) * 180.0  # 0-100 -> 0-180 min
    daily = db.query(DailySummary).filter(
        DailySummary.user_id == uid,
        DailySummary.date == today,
    ).first()
    if not daily:
        daily = DailySummary(
            user_id=uid,
            date=today,
            sleep_hours=payload.sleep_hours,
            sleep_quality=float(payload.sleep_quality),
            activity_minutes=activity,
            mood_value=float(payload.mood),
        )
        db.add(daily)
    else:
        daily.sleep_hours = payload.sleep_hours
        daily.sleep_quality = float(payload.sleep_quality)
        daily.activity_minutes = activity
        daily.mood_value = float(payload.mood)
    db.commit()
    compute_risk_for_date(db, uid, today)
    return {"ok": True}
