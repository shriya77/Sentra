# Sentra

Sentra is a demo-ready MVP for **silent burnout and mental health drift detection** from behavior signals. It combines a React + Vite + TypeScript frontend with a FastAPI backend, using a calm, premium teal/cyan aesthetic and a card-based dashboard.

**Disclaimer:** Sentra is not a medical device and does not provide a diagnosis. It is for pattern awareness only.

---

## Monorepo structure

- **`/frontend`** — React + Vite + TypeScript (runs on http://localhost:5173)
- **`/backend`** — FastAPI + Python (runs on http://localhost:8000)
- **`/README.md`** — This file

---

## Quick start

### Backend

1. Create and activate a virtual environment:

   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate   # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. (Optional) Copy env example and set variables:

   ```bash
   cp .env.example .env
   # Edit .env to add ELEVENLABS_API_KEY if you want voice features.
   ```

4. Run the server:

   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   The API will be at **http://localhost:8000**. On startup, the app seeds a demo user and 21 days of data (plus 10 org users for Care Mode). Seeding is idempotent.

### Frontend

1. Install dependencies:

   ```bash
   cd frontend
   npm install
   ```

2. (Optional) Set API URL:

   ```bash
   cp .env.example .env
   # Set VITE_API_URL if your backend is not at http://localhost:8000
   ```

3. Run the dev server:

   ```bash
   npm run dev
   ```

   The app will be at **http://localhost:5173**.

---

## Environment variables

### Backend (`.env` or environment)

| Variable | Description |
|----------|-------------|
| `SENTRA_DB_PATH` | Optional. Path to SQLite database file. Default: `backend/data/sentra.db`. |
| `ELEVENLABS_API_KEY` | Optional. 11Labs API key for text-to-speech. If missing, voice is disabled and the UI shows a notice. |

### Frontend (`.env` with `VITE_` prefix)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Optional. Backend API base URL. Default: `http://localhost:8000`. |

---

## Features

- **Typing capture** — Browser-only typing metrics (inter-key interval, variability, backspace ratio, session duration, pauses >2s). No raw content is stored. Submit via **Submit session**.
- **Daily check-in** — Mood (4 emojis), sleep hours/quality, activity (slider). Feeds into the drift engine.
- **Personal baseline & drift** — Baseline from first 7 days; z-score deviations and weighted risk; wellbeing score 0–100, status (Stable / Watch / High), momentum (stable / slow_rise / rapid_rise), confidence, top drivers.
- **Insight engine** — Template-based short insight + drivers + 1–2 suggested actions.
- **Micro-interventions** — Small actions from drivers; track completion via checkboxes (POST `/api/intervention/complete`).
- **11Labs voice** — If `ELEVENLABS_API_KEY` is set, POST `/api/voice` returns base64 MP3 for the insight; otherwise returns a message to add the key.
- **Care Mode (Demo)** — Aggregate team risk distribution (counts only, no PII), with seeded fake users.

---

## API summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/score/today` | Today’s wellbeing score, status, momentum, confidence, drivers |
| GET | `/api/trends?days=14` | Wellbeing trend for the last N days |
| GET | `/api/insight/today` | Short insight, drivers, suggested actions |
| GET | `/api/interventions/today` | Today’s micro-actions and completion state |
| POST | `/api/intervention/complete` | Body: `{ "intervention_id": "...", "date": "YYYY-MM-DD" }` |
| POST | `/api/events/typing` | Body: typing metrics (avg_interval_ms, std_interval_ms, backspace_ratio, session_duration_sec, fragmentation_count, late_night) |
| POST | `/api/checkin` | Body: mood, sleep_hours, sleep_quality, activity_minutes or activity_slider |
| POST | `/api/voice` | Body: `{ "text": "..." }` → audio_base64 or message |
| GET | `/api/org/summary` | Care Mode: counts, average_risk, momentum_distribution |

---

## Routes (frontend)

- **`/`** — Dashboard (score, signals, insight, voice, micro-actions, typing capture, daily check-in)
- **`/trends`** — 14-day wellbeing line chart
- **`/care`** — Care Mode (Demo) aggregate distribution
- **`/privacy`** — Privacy, guardrails, disclaimers, crisis resource text

---

## Tech stack

- **Frontend:** React 18, Vite 5, TypeScript, React Router, Recharts
- **Backend:** FastAPI, SQLAlchemy (SQLite), Pydantic, NumPy (drift math)
- **Voice (optional):** ElevenLabs Python SDK

---

## Seeded data

- One demo user: `user_id="demo"`.
- 21 days of daily summaries: days 1–10 stable, 11–17 declining (sleep, typing friction, activity, mood), 18–21 partial recovery.
- Risk scores are computed for these days.
- 10 org users with risk scores for Care Mode.

All seeding is idempotent; restarting the backend does not duplicate data.
