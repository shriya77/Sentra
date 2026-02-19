import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../lib/toast';
import { api } from '../../lib/api';
import Card from '../cards/Card';
import MoodSelector from './MoodSelector';
import StarRating from './StarRating';

interface DailyCheckinFormProps {
  onSubmitted: () => void;
  compact?: boolean;
}

export default function DailyCheckinForm({ onSubmitted, compact }: DailyCheckinFormProps) {
  const { theme } = useTheme();
  const [mood, setMood] = useState(5);
  const [sleepHours, setSleepHours] = useState(7);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [activityLevel, setActivityLevel] = useState<number>(2); // 0–3 → maps to activity_slider
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.postCheckin({
        mood,
        sleep_hours: sleepHours,
        sleep_quality: sleepQuality,
        activity_slider: activityLevel === 0 ? 0 : activityLevel === 1 ? 25 : activityLevel === 2 ? 55 : 100,
      });
      onSubmitted();
      toast.addToast('success', 'Check-in saved.');
    } catch {
      toast.addToast('error', 'Could not save check-in.');
    } finally {
      setSubmitting(false);
    }
  };

  const form = (
    <div className="space-y-6">
        <MoodSelector value={mood} onChange={setMood} />
        <div>
          <label className={`block text-body-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-200' : 'text-[#1e293b]'}`}>Sleep (hours)</label>
          <input
            type="number"
            min={0}
            max={14}
            step={0.5}
            value={sleepHours}
            onChange={(e) => setSleepHours(Number(e.target.value))}
            className="w-20 px-3 py-2.5 rounded-2xl glass-input-dark focus:outline-none focus:ring-2 focus:ring-sentra-primary/40"
          />
        </div>
        <StarRating
          label="Sleep quality"
          value={sleepQuality}
          onChange={setSleepQuality}
        />
        <div>
          <label className={`block text-body-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-200' : 'text-[#1e293b]'}`}>Activity</label>
          <div className="flex flex-wrap gap-2">
            {[
              { level: 0, label: 'Barely moved' },
              { level: 1, label: 'A bit of movement' },
              { level: 2, label: 'Good workout' },
              { level: 3, label: 'Very active' },
            ].map(({ level, label }) => (
              <button
                key={level}
                type="button"
                onClick={() => setActivityLevel(level)}
                className={`
                  px-4 py-2.5 rounded-2xl text-body-sm font-medium transition-all duration-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-sentra-primary/40 focus-visible:ring-offset-2
                  ${activityLevel === level
                    ? theme === 'dark'
                      ? 'bg-sentra-cosmic-accent/40 text-sentra-primary shadow-cosmic-glow border border-sentra-cosmic-accent/30'
                      : 'bg-sentra-accent-pale/60 text-sentra-primary-deep shadow-inner-glow border border-sentra-primary/30'
                    : theme === 'dark'
                      ? 'glass-input-dark text-slate-300 hover:bg-white/10 hover:text-sentra-primary'
                      : 'glass-input-dark text-sentra-muted hover:bg-white/80 hover:text-sentra-primary-deep'}
                `}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="px-5 py-3 rounded-2xl bg-sentra-primary text-white text-body font-medium hover:opacity-95 disabled:opacity-50 transition-all shadow-cosmic-glow"
        >
          {submitting ? 'Submitting…' : 'Submit check-in'}
        </button>
      {mood === 1 && (
        <p className={`mt-4 text-body-sm border-t pt-4 ${theme === 'dark' ? 'text-slate-300 border-white/20' : 'text-sentra-muted border-white/60'}`}>
          As a caregiver, if you&apos;re in crisis, please reach out to a mental health or crisis resource. This app is not a medical device and does not provide diagnosis.
        </p>
      )}
    </div>
  );
  return compact ? form : <Card title="Daily check-in">{form}</Card>;
}
