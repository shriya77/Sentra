"""Firebase ID token verification. Returns uid for storage; falls back to demo user if not configured."""
import json
import os
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

_FIREBASE_APP = None

def _init_firebase() -> Optional[object]:
    global _FIREBASE_APP
    if _FIREBASE_APP is not None:
        return _FIREBASE_APP
    try:
        import firebase_admin
        from firebase_admin import credentials
    except ImportError:
        return None
    if firebase_admin._apps:
        _FIREBASE_APP = firebase_admin.get_app()
        return _FIREBASE_APP
    # Prefer JSON string (e.g. in .env); else path
    raw = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
    if raw:
        try:
            cred_dict = json.loads(raw)
            cred = credentials.Certificate(cred_dict)
        except (json.JSONDecodeError, ValueError, TypeError):
            cred = None
    else:
        path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "").strip()
        if path and os.path.isfile(path):
            cred = credentials.Certificate(path)
        else:
            cred = None
    if cred is None:
        return None
    _FIREBASE_APP = firebase_admin.initialize_app(cred)
    return _FIREBASE_APP


def get_firebase_uid(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
) -> str:
    """Verify Firebase ID token and return uid. If Firebase not configured or no valid token, returns 'demo' or 401."""
    app = _init_firebase()
    if app is None:
        # No service account: treat as demo user so app works without setup
        return "demo"
    if creds is None or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )
    try:
        from firebase_admin import auth
        decoded = auth.verify_id_token(creds.credentials)
        return decoded["uid"]
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
