import { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../lib/toast';
import { api, type TypingPayload } from '../../lib/api';
import Card from '../cards/Card';

interface TypingCaptureFormProps {
  onSubmitted: () => void;
  compact?: boolean;
}

// Prompts for typing test
const TYPING_PROMPTS = [
  "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet.",
  "Caring for others requires us to care for ourselves first. Your wellbeing matters.",
  "Small steps lead to big changes. Take a moment to breathe and reflect on your day.",
  "Self-care is not selfish. It's essential for those who give so much to others.",
  "Every caregiver deserves support, understanding, and moments of peace.",
  "Balance is key. Rest when you need it, and remember that asking for help is strength.",
  "Your feelings are valid. It's okay to feel overwhelmed, and it's okay to take breaks.",
  "Mindfulness can help us stay present and reduce stress in our daily lives.",
];

function getRandomPrompt(): string {
  return TYPING_PROMPTS[Math.floor(Math.random() * TYPING_PROMPTS.length)];
}

export default function TypingCaptureForm({ onSubmitted, compact }: TypingCaptureFormProps) {
  const { theme } = useTheme();
  const [prompt, setPrompt] = useState(getRandomPrompt());
  const [text, setText] = useState('');
  const [metrics, setMetrics] = useState<Partial<TypingPayload> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastKeyTime, setLastKeyTime] = useState<number | null>(null);
  const [intervals, setIntervals] = useState<number[]>([]);
  const [backspaces, setBackspaces] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [pausesOver2s, setPausesOver2s] = useState(0);
  const toast = useToast();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const now = Date.now();
    if (startTime === null) setStartTime(now);
    if (e.key === 'Backspace') {
      setBackspaces((n) => n + 1);
    } else if (e.key.length === 1 && lastKeyTime != null) {
      const interval = now - lastKeyTime;
      if (interval > 2000) setPausesOver2s((n) => n + 1);
      setIntervals((arr) => [...arr, interval]);
    }
    setLastKeyTime(now);
  };

  useEffect(() => {
    if (!text || intervals.length < 1) {
      setMetrics(null);
      return;
    }
    const totalKeys = intervals.length + 1 + backspaces;
    const sum = intervals.reduce((a, b) => a + b, 0);
    const avg = sum / intervals.length;
    const variance = intervals.reduce((acc, x) => acc + (x - avg) ** 2, 0) / intervals.length;
    const std = Math.sqrt(variance) || 0;
    const duration = startTime != null ? (Date.now() - startTime) / 1000 : 0;
    setMetrics({
      avg_interval_ms: Math.round(avg),
      std_interval_ms: Math.round(std),
      backspace_ratio: totalKeys > 0 ? backspaces / totalKeys : 0,
      session_duration_sec: Math.round(duration * 10) / 10,
      fragmentation_count: pausesOver2s,
      late_night: new Date().getHours() >= 22 || new Date().getHours() < 6,
    });
  }, [text, intervals, backspaces, startTime, lastKeyTime, pausesOver2s]);

  const handleSubmit = async () => {
    if (!metrics || metrics.avg_interval_ms == null || metrics.std_interval_ms == null) return;
    if (text.trim().length < prompt.length * 0.5) {
      toast.addToast('error', 'Please type at least half of the prompt to submit.');
      return;
    }
    setSubmitting(true);
    try {
      await api.postTyping({
        avg_interval_ms: metrics.avg_interval_ms,
        std_interval_ms: metrics.std_interval_ms,
        backspace_ratio: metrics.backspace_ratio ?? 0,
        session_duration_sec: metrics.session_duration_sec ?? 0,
        fragmentation_count: metrics.fragmentation_count ?? 0,
        late_night: metrics.late_night ?? false,
      });
      setText('');
      setPrompt(getRandomPrompt());
      setIntervals([]);
      setBackspaces(0);
      setStartTime(null);
      setLastKeyTime(null);
      setPausesOver2s(0);
      onSubmitted();
      toast.addToast('success', 'Session saved.');
    } catch {
      toast.addToast('error', 'Could not save session.');
    } finally {
      setSubmitting(false);
    }
  };

  const form = (
    <>
      <p className={`text-body-sm mb-4 ${theme === 'dark' ? 'text-slate-300' : 'text-sentra-muted'}`}>
        Type the text below. We never store what you type, only timing patterns to understand your wellbeing.
      </p>
      <div className={`mb-4 p-4 rounded-2xl glass-input-dark border-2 ${theme === 'dark' ? 'border-white/10' : 'border-white/30'}`}>
        <p className={`text-body leading-relaxed ${theme === 'dark' ? 'text-slate-200' : 'text-[#1e293b]'}`}>
          {prompt}
        </p>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type the text above here…"
        className={`w-full min-h-[100px] p-4 rounded-2xl glass-input-dark focus:outline-none focus:ring-2 focus:ring-sentra-primary/40 focus:border-sentra-primary/40 resize-y text-body ${theme === 'dark' ? 'placeholder:text-slate-500' : 'placeholder:text-sentra-muted'}`}
      />
      {text.length > 0 && (
        <div className={`mt-2 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-sentra-muted'}`}>
          {text.length} / {prompt.length} characters
        </div>
      )}
      {metrics && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className={`inline-flex items-center px-3 py-1.5 rounded-xl glass-input-dark text-body-sm ${theme === 'dark' ? 'text-slate-300' : 'text-sentra-muted'}`}>
            Avg speed: {metrics.avg_interval_ms} ms
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-xl glass-input-dark text-body-sm text-slate-300">
            Variability: {metrics.std_interval_ms} ms
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-xl glass-input-dark text-body-sm text-slate-300">
            Backspace: {(metrics.backspace_ratio ?? 0).toFixed(2)}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-xl glass-input-dark text-body-sm text-slate-300">
            Pauses &gt;2s: {metrics.fragmentation_count}
          </span>
        </div>
      )}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || !metrics}
        className="mt-4 px-5 py-3 rounded-2xl bg-sentra-primary text-white text-body font-medium hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-cosmic-glow"
      >
        {submitting ? 'Submitting…' : 'Submit session'}
      </button>
    </>
  );
  return compact ? form : <Card title="Typing capture">{form}</Card>;
}
