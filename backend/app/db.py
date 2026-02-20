"""Database setup and session management. Uses SQLite by default."""
import os
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.models import Base

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)
DB_PATH = os.environ.get("SENTRA_DB_PATH", str(DATA_DIR / "sentra.db"))
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _migrate_voice_columns():
    """Add voice strain and optional speech sentiment columns if missing (SQLite)."""
    migrations = [
        "ALTER TABLE daily_summaries ADD COLUMN voice_strain_score INTEGER",
        "ALTER TABLE daily_summaries ADD COLUMN voice_strain_level VARCHAR(32)",
        "ALTER TABLE daily_summaries ADD COLUMN voice_confidence VARCHAR(32)",
        "ALTER TABLE daily_summaries ADD COLUMN speech_sentiment_compound FLOAT",
        "ALTER TABLE daily_summaries ADD COLUMN speech_sentiment_label VARCHAR(32)",
        "ALTER TABLE voice_sessions ADD COLUMN speech_sentiment_compound FLOAT",
        "ALTER TABLE voice_sessions ADD COLUMN speech_sentiment_label VARCHAR(32)",
    ]
    with engine.connect() as conn:
        for stmt in migrations:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                conn.rollback()


def init_db():
    Base.metadata.create_all(bind=engine)
    _migrate_voice_columns()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
