"""GET /api/score/today, GET /api/trends."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth_firebase import get_firebase_uid
from app.db import get_db
from app.engine.drift import get_today_score, get_trends

router = APIRouter(prefix="/api", tags=["score"])


@router.get("/score/today")
def score_today(uid: str = Depends(get_firebase_uid), db: Session = Depends(get_db)):
  data = get_today_score(db, uid)
  if not data:
    return {
      "wellbeing_score": None,
      "status": None,
      "momentum": None,
      "momentum_label": None,
      "momentum_strength": None,
      "confidence": None,
      "drivers": [],
      "driver_contributions": [],
      "voice_strain_score": None,
      "voice_strain_level": None,
      "voice_confidence": None,
      "speech_sentiment_compound": None,
      "speech_sentiment_label": None,
    }
  return data


@router.get("/trends")
def trends(days: int = Query(14, ge=7, le=90), uid: str = Depends(get_firebase_uid), db: Session = Depends(get_db)):
    return get_trends(db, uid, days=days)
