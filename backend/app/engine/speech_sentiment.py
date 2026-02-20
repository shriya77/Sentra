"""Optional: transcribe audio (Whisper) and run sentiment on text. No transcript stored; only scores."""
from __future__ import annotations

import os
from typing import Any, Optional

_VADER_AVAILABLE = False
try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    _VADER_AVAILABLE = True
except ImportError:
    pass


def transcribe_audio(audio_path: str) -> Optional[str]:
    """Transcribe audio file to text using OpenAI Whisper API. Returns None if disabled or failed."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key or not api_key.strip():
        return None
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        with open(audio_path, "rb") as f:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
            )
        if transcript and getattr(transcript, "text", None):
            return transcript.text.strip()
        return None
    except Exception:
        return None


def sentiment_from_text(text: str) -> Optional[dict[str, Any]]:
    """Run VADER sentiment on text. Returns dict with compound, pos, neg, neu, label. No transcript stored."""
    if not text or not text.strip():
        return None
    if not _VADER_AVAILABLE:
        return None
    try:
        analyzer = SentimentIntensityAnalyzer()
        scores = analyzer.polarity_scores(text.strip())
        compound = float(scores.get("compound", 0))
        if compound >= 0.05:
            label = "positive"
        elif compound <= -0.05:
            label = "negative"
        else:
            label = "neutral"
        return {
            "compound": round(compound, 4),
            "positive": round(float(scores.get("pos", 0)), 4),
            "negative": round(float(scores.get("neg", 0)), 4),
            "neutral": round(float(scores.get("neu", 0)), 4),
            "label": label,
        }
    except Exception:
        return None


def get_speech_sentiment_only(audio_path: str) -> Optional[dict[str, Any]]:
    """Transcribe audio and return only sentiment scores. Transcript is never returned or stored."""
    transcript = transcribe_audio(audio_path)
    if not transcript:
        return None
    return sentiment_from_text(transcript)
