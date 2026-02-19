import { useEffect, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import type { ScoreToday } from '../../lib/api';
import Card from './Card';

const CONFIDENCE_TOOLTIP = 'Based on how much check-in and typing data we have. More days of data = higher confidence.';

function StatusPill({ status }: { status: string | null }) {
  if (!status) return null;
  return (
    <span
      className={`
        inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
        ${status === 'Stable' ? 'bg-sentra-stable/12 text-sentra-primary-deep' : ''}
        ${status === 'Watch' ? 'bg-sentra-watch/12 text-sentra-watch' : ''}
        ${status === 'High' ? 'bg-sentra-high/12 text-sentra-high animate-pulse-soft' : ''}
      `}
    >
      {status}
    </span>
  );
}

interface WellbeingScoreCardProps {
  score: ScoreToday | null;
}

export default function WellbeingScoreCard({ score }: WellbeingScoreCardProps) {
  const { theme } = useTheme();
  const value = score?.wellbeing_score != null ? Math.round(score.wellbeing_score) : null;
  const [displayValue, setDisplayValue] = useState<number | null>(value);
  const [showConfidenceTooltip, setShowConfidenceTooltip] = useState(false);

  useEffect(() => {
    if (value === null) {
      setDisplayValue(null);
      return;
    }
    let start = displayValue ?? 0;
    if (start === value) return;
    const duration = 600;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - t) * (1 - t);
      setDisplayValue(Math.round(start + (value - start) * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  const isEmpty = value === null;

  return (
    <Card>
      <div className="flex items-center gap-5">
          {/* Score number - no box, just the number */}
          <div className="flex-shrink-0">
            <span
              className="text-7xl font-bold text-sentra-primary tabular-nums leading-none"
              aria-label={isEmpty ? 'Wellbeing score not yet available' : `Wellbeing score ${displayValue} out of 100`}
            >
              {displayValue ?? '—'}
            </span>
          </div>
          
          {/* Content */}
          <div className="flex flex-col gap-2.5 flex-1 min-w-0">
            {/* Status and confidence row */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <StatusPill status={score?.status ?? null} />
              {score?.confidence && (
                <span className={`inline-flex items-center gap-1.5 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-[#475569]'}`}>
                  <span
                    className="relative cursor-help"
                    onMouseEnter={() => setShowConfidenceTooltip(true)}
                    onMouseLeave={() => setShowConfidenceTooltip(false)}
                  >
                    <HelpCircle className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-slate-400' : 'text-sentra-muted'}`} aria-hidden />
                    {showConfidenceTooltip && (
                      <span
                        role="tooltip"
                        className="absolute left-0 top-full mt-1.5 z-[100] px-3 py-2 text-xs font-normal rounded-lg shadow-xl w-[280px] leading-relaxed pointer-events-none"
                        style={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#1e293b', color: '#f8fafc' }}
                      >
                        {CONFIDENCE_TOOLTIP}
                      </span>
                    )}
                  </span>
                  <span className="text-xs">{score.confidence} confidence</span>
                </span>
              )}
            </div>
            
            {/* Title */}
            <p className={`text-lg font-semibold leading-tight ${theme === 'dark' ? 'text-slate-200' : 'text-[#1e293b]'}`}>Caregiver wellbeing</p>
            
            {/* Empty state */}
            {isEmpty && (
              <p className={`text-body-sm leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-[#475569]'}`}>
                Do a daily check-in to see how you're holding up. Caring for others starts with you.
              </p>
            )}
          </div>
      </div>
    </Card>
  );
}
