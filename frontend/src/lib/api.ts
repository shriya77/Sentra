/**
 * Centralized API client. All backend calls go through here.
 * Sends Firebase ID token so the backend can store data per user.
 */

import { auth } from './firebase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getNetworkErrorMessage(): string {
  return `Can't reach the API at ${API_BASE}. Make sure the backend is running: in the backend folder run "uvicorn app.main:app --reload --port 8000".`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (err) {
    const message = err instanceof TypeError && err.message === 'Failed to fetch'
      ? getNetworkErrorMessage()
      : err instanceof Error ? err.message : 'Network error';
    throw new Error(message);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getScoreToday: () => request<ScoreToday>('/api/score/today'),
  getTrends: (days = 14) => request<TrendDay[]>(`/api/trends?days=${days}`),
  getInsightToday: () => request<InsightToday>('/api/insight/today'),
  getInterventionsToday: () => request<InterventionItem[]>('/api/interventions/today'),
  postInterventionComplete: (intervention_id: string, date?: string) =>
    request<{ ok: boolean }>('/api/intervention/complete', {
      method: 'POST',
      body: JSON.stringify({ intervention_id, date }),
    }),
  postVoice: (text: string) =>
    request<VoiceResponse>('/api/voice', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  postTyping: (payload: TypingPayload) =>
    request<{ ok: boolean }>('/api/events/typing', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  postCheckin: (payload: CheckinPayload) =>
    request<{ ok: boolean }>('/api/checkin', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getOrgSummary: () => request<OrgSummary>('/api/org/summary'),
  getSignalDescriptions: () => request<SignalDescriptions>('/api/signals/descriptions'),
};

// --- API response types (match backend) ---

export interface ScoreToday {
  wellbeing_score: number | null;
  status: string | null;
  momentum: string | null;
  confidence: string | null;
  drivers: string[];
  date?: string;
}

export interface TrendDay {
  date: string;
  wellbeing_score: number;
  status: string;
  momentum: string;
  confidence: string;
}

export interface InsightToday {
  short_insight: string;
  drivers: string[];
  suggested_actions: string[];
}

export interface InterventionItem {
  intervention_id: string;
  title: string;
  completed: boolean;
}

export interface VoiceResponse {
  audio_url: string | null;
  audio_base64: string | null;
  message: string | null;
}

export interface TypingPayload {
  avg_interval_ms: number;
  std_interval_ms: number;
  backspace_ratio: number;
  session_duration_sec: number;
  fragmentation_count: number;
  late_night?: boolean;
}

export interface CheckinPayload {
  mood: number;
  sleep_hours: number;
  sleep_quality: number;
  activity_minutes?: number;
  activity_slider?: number;
}

export interface OrgSummary {
  counts: { Stable?: number; Watch?: number; High?: number };
  average_risk: number;
  momentum_distribution: { stable?: number; slow_rise?: number; rapid_rise?: number };
  total_users: number;
}

export interface SignalDescriptions {
  sleep: string;
  activity: string;
  typing: string;
}
