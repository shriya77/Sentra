"""Sentra FastAPI app: CORS, routes, startup seed."""
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

from fastapi import FastAPI

# Load .env so OPENAI_API_KEY, etc. are available
load_dotenv()
from fastapi.middleware.cors import CORSMiddleware

from app.db import init_db
from app.seed import run_seed
from app.routes import events, checkin, score, insight, voice, interventions, org, signals


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    run_seed()
    yield


app = FastAPI(title="Sentra API", lifespan=lifespan)

# CORS configuration - allow Netlify and localhost
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
]

# Add Netlify domain from environment variable if set
if netlify_url := os.getenv("NETLIFY_URL"):
    allowed_origins.append(netlify_url)
    # Also add http version if https
    if netlify_url.startswith("https://"):
        allowed_origins.append(netlify_url.replace("https://", "http://"))

# For production: Set ALLOWED_ORIGINS env var with comma-separated domains
# Example: ALLOWED_ORIGINS=https://your-app.netlify.app,https://preview--your-app.netlify.app
if allowed_env := os.getenv("ALLOWED_ORIGINS"):
    allowed_origins.extend([origin.strip() for origin in allowed_env.split(",")])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router)
app.include_router(checkin.router)
app.include_router(score.router)
app.include_router(insight.router)
app.include_router(signals.router)
app.include_router(voice.router)
app.include_router(interventions.router)
app.include_router(org.router)


@app.get("/health")
def health():
    return {"status": "ok"}
