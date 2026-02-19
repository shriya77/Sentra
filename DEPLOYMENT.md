# Deployment Guide

## Frontend (Netlify)

The frontend can be deployed to Netlify easily:

### Option 1: Connect via GitHub (Recommended)

1. Go to [Netlify](https://www.netlify.com/) and sign in
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub and select the `Sentra` repository
4. Configure build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
5. Add environment variables:
   - `VITE_API_URL` - Your backend API URL (e.g., `https://your-backend.railway.app` or `https://your-backend.render.com`)
   - Firebase config variables (if not already in your code):
     - `VITE_FIREBASE_API_KEY`
     - `VITE_FIREBASE_AUTH_DOMAIN`
     - `VITE_FIREBASE_PROJECT_ID`
     - `VITE_FIREBASE_STORAGE_BUCKET`
     - `VITE_FIREBASE_MESSAGING_SENDER_ID`
     - `VITE_FIREBASE_APP_ID`
6. Click "Deploy site"

### Option 2: Deploy via Netlify CLI

```bash
cd frontend
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

## Backend (Railway, Render, or Fly.io)

The FastAPI backend needs to be deployed separately. Netlify Functions aren't ideal for FastAPI.

### Railway (Recommended)

1. Go to [Railway](https://railway.app/) and sign in with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `Sentra` repository
4. Configure:
   - **Root Directory**: `backend`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables:
   - `DATABASE_URL` (Railway will auto-generate if you add a PostgreSQL service)
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_PRIVATE_KEY`
   - `FIREBASE_CLIENT_EMAIL`
   - `OPENAI_API_KEY` (optional, for AI features)
6. Railway will provide a URL like `https://your-app.railway.app`
7. Update `VITE_API_URL` in Netlify with this URL

### Render

1. Go to [Render](https://render.com/) and sign in
2. Click "New" → "Web Service"
3. Connect your GitHub repo
4. Configure:
   - **Name**: `sentra-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables (same as Railway)
6. Render will provide a URL like `https://sentra-backend.onrender.com`

### Fly.io

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. In the `backend` directory:
   ```bash
   fly launch
   ```
3. Follow the prompts and configure environment variables
4. Deploy: `fly deploy`

## Environment Variables Summary

### Frontend (Netlify)
- `VITE_API_URL` - Backend API URL

### Backend (Railway/Render/Fly.io)
- `DATABASE_URL` - SQLite or PostgreSQL connection string
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_PRIVATE_KEY` - Firebase service account private key
- `FIREBASE_CLIENT_EMAIL` - Firebase service account email
- `OPENAI_API_KEY` - (Optional) For AI-powered insights

## Post-Deployment Checklist

1. ✅ Frontend deployed to Netlify
2. ✅ Backend deployed to Railway/Render/Fly.io
3. ✅ `VITE_API_URL` in Netlify points to backend URL
4. ✅ Backend environment variables configured
5. ✅ Database initialized (run migrations if needed)
6. ✅ Test authentication flow
7. ✅ Test API endpoints

## CORS Configuration

The backend is already configured to allow requests from Netlify domains. 

**For production**, set the `ALLOWED_ORIGINS` environment variable in your backend deployment with your Netlify URL(s):

```
ALLOWED_ORIGINS=https://your-app.netlify.app,https://preview--your-app.netlify.app
```

You can also set `NETLIFY_URL` for a single domain:
```
NETLIFY_URL=https://your-app.netlify.app
```

The backend will automatically allow localhost for development.
