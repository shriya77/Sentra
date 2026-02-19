"""Pydantic request/response schemas."""
from typing import Optional

from pydantic import BaseModel


class TypingEventCreate(BaseModel):
    avg_interval_ms: float
    std_interval_ms: float
    backspace_ratio: float
    session_duration_sec: float
    fragmentation_count: int
    late_night: bool = False


class CheckinCreate(BaseModel):
    mood: float  # 1-10 (emoji wheel scale)
    sleep_hours: float  # 0-14
    sleep_quality: int  # 1-5
    activity_minutes: Optional[float] = None
    activity_slider: Optional[float] = None  # 0-100, converted to minutes


class VoiceRequest(BaseModel):
    text: str


class InterventionComplete(BaseModel):
    intervention_id: str
    date: Optional[str] = None  # ISO date; default today
