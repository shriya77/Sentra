"""SQLAlchemy models for Sentra."""
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Column, Float, Integer, String, Text, Boolean, ForeignKey, Date, DateTime, JSON
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(String(64), primary_key=True)
    is_org_user = Column(Boolean, default=False)  # for Care Mode aggregate users


class DailySummary(Base):
    __tablename__ = "daily_summaries"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    # Check-in fields
    sleep_hours = Column(Float, nullable=True)
    sleep_quality = Column(Float, nullable=True)  # 1-5
    activity_minutes = Column(Float, nullable=True)
    mood_value = Column(Float, nullable=True)  # mapped from emoji
    # Typing aggregates (per day)
    typing_avg_interval_ms = Column(Float, nullable=True)
    typing_std_ms = Column(Float, nullable=True)
    typing_backspace_ratio = Column(Float, nullable=True)
    typing_fragmentation = Column(Float, nullable=True)  # pauses > 2s count
    typing_late_night = Column(Boolean, nullable=True)
    __table_args__ = ({"sqlite_autoincrement": True},)


class TypingSession(Base):
    """Raw typing session submissions; used to compute daily aggregates."""
    __tablename__ = "typing_sessions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    avg_interval_ms = Column(Float, nullable=False)
    std_interval_ms = Column(Float, nullable=False)
    backspace_ratio = Column(Float, nullable=False)
    session_duration_sec = Column(Float, nullable=False)
    fragmentation_count = Column(Integer, nullable=False)  # pauses > 2s
    late_night = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class RiskScore(Base):
    __tablename__ = "risk_scores"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    wellbeing_score = Column(Float, nullable=False)  # 0-100 (inverted: higher = better)
    status = Column(String(32), nullable=False)  # Stable, Watch, High
    momentum = Column(String(32), nullable=False)  # stable, slow_rise, rapid_rise
    confidence = Column(String(32), nullable=False)  # low, med, high
    drivers = Column(JSON, nullable=True)  # list of driver keys
    __table_args__ = ({"sqlite_autoincrement": True},)


class Intervention(Base):
    __tablename__ = "interventions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    intervention_id = Column(String(64), nullable=False)  # e.g. sleep_debt, typing_friction
    title = Column(String(256), nullable=False)
    completed = Column(Boolean, default=False)
    __table_args__ = ({"sqlite_autoincrement": True},)
