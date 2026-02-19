import { useState } from 'react';
import { Check } from 'lucide-react';
import { useToast } from '../../lib/toast';
import { api, type InterventionItem } from '../../lib/api';
import Card from './Card';

interface MicroActionsCardProps {
  interventions: InterventionItem[];
  onComplete: () => void;
  compact?: boolean;
}

const ESTIMATED_TIMES: Record<string, string> = {
  sleep_hours: '~30 min',
  sleep_quality: '20 min',
  activity_minutes: '5 min',
  mood_value: '3 min',
  typing_avg_interval_ms: '60 sec',
  typing_std_ms: '60 sec',
  typing_backspace_ratio: '60 sec',
  typing_fragmentation: '60 sec',
  general: '2 min',
};

export default function MicroActionsCard({ interventions, onComplete, compact }: MicroActionsCardProps) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    () => new Set(interventions.filter((i) => i.completed).map((i) => i.intervention_id))
  );
  const [justCompleted, setJustCompleted] = useState<string | null>(null);
  const toast = useToast();

  const handleToggle = async (item: InterventionItem) => {
    if (item.completed || completedIds.has(item.intervention_id)) return;
    try {
      await api.postInterventionComplete(item.intervention_id);
      setCompletedIds((prev) => new Set([...prev, item.intervention_id]));
      setJustCompleted(item.intervention_id);
      setTimeout(() => setJustCompleted(null), 2000);
      onComplete();
      toast.addToast('success', 'Nice. Small wins count.');
    } catch {
      toast.addToast('error', 'Could not mark as done.');
    }
  };

  const content = interventions.length === 0 ? (
    <p className="text-body-sm text-sentra-muted">No actions suggested for today.</p>
  ) : (
    <ul className="space-y-2">
          {interventions.map((item) => {
            const done = item.completed || completedIds.has(item.intervention_id);
            const showNice = justCompleted === item.intervention_id;
            const estimated = ESTIMATED_TIMES[item.intervention_id] ?? '—';
            return (
              <li
                key={item.intervention_id}
                className={`
                  flex items-center gap-3 p-4 rounded-2xl border transition-all duration-300 group
                  ${done 
                    ? 'bg-sentra-accent-pale/50 border-white/50 opacity-75' 
                    : 'glass-input hover:bg-white/80 hover:shadow-glass-hover hover:scale-[1.02] cursor-pointer'}
                `}
              >
                <button
                  type="button"
                  onClick={() => handleToggle(item)}
                  className={`
                    flex-shrink-0 w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all duration-300
                    ${done
                      ? 'bg-sentra-stable border-sentra-stable text-white scale-110'
                      : 'glass-input hover:border-sentra-primary/60 hover:bg-sentra-primary/10 hover:scale-110 group-hover:rotate-12'}
                  `}
                  aria-label={done ? 'Done' : 'Mark done'}
                >
                  {done && <Check className="w-4 h-4 animate-[scaleIn_0.3s_ease-out]" strokeWidth={3} />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-body font-medium text-[#1e293b]">{item.title}</p>
                  <p className="text-body-sm text-sentra-muted">{estimated}</p>
                </div>
                {showNice && (
                  <span className="text-body-sm text-sentra-stable font-medium">Nice. Small wins count.</span>
                )}
              </li>
            );
          })}
        </ul>
  );
  return compact ? content : <Card title="Micro-actions">{content}</Card>;
}
