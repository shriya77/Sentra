"""POST /api/voice - 11Labs TTS; fallback when no API key."""
import base64
import os
import tempfile
from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse

from app.schemas import VoiceRequest

router = APIRouter(prefix="/api", tags=["voice"])


def _generate_audio_elevenlabs(text: str) -> bytes | None:
    api_key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if not api_key:
        return None
    try:
        from elevenlabs.client import ElevenLabs
        client = ElevenLabs(api_key=api_key)
        audio = client.text_to_speech.convert(
            voice_id="21m00Tcm4TlvDq8ikWAM",  # Rachel
            text=text,
        )
        if hasattr(audio, "__iter__") and not isinstance(audio, (bytes, bytearray)):
            return b"".join(audio)
        return bytes(audio) if audio else None
    except Exception:
        return None


@router.post("/voice")
def voice(payload: VoiceRequest):
    audio_bytes = _generate_audio_elevenlabs(payload.text)
    if audio_bytes is None:
        return {
            "audio_url": None,
            "audio_base64": None,
            "message": "Add ELEVENLABS_API_KEY to enable voice.",
        }
    b64 = base64.standard_b64encode(audio_bytes).decode("ascii")
    return {"audio_url": None, "audio_base64": b64, "message": None}
