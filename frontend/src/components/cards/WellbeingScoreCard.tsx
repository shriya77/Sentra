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
        inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold
        ${status === 'Stable' ? 'bg-sentra-stable/12 text-sentra-primary-deep' : ''}
        ${status === 'Watch' ? 'bg-sentra-watch/12 text-sentra-watch' : ''}
        ${status === 'High' ? 'bg-red-100 text-red-700 border border-red-400/60 animate-pulse-red' : ''}
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
  const status = score?.status;
  const isWatch = status === 'Watch';
  const isHigh = status === 'High';

  return (
    <Card className={`relative transition-all duration-500 ${
      isWatch 
        ? 'ring-2 ring-sentra-primary/50 ring-offset-0 shadow-xl shadow-sentra-primary/25' 
        : isHigh 
          ? 'ring-2 ring-sentra-high/60 ring-offset-0 shadow-xl shadow-sentra-high/30' 
          : ''
    }`}>
      <div className="flex items-center gap-5 relative z-0">
          {/* Score number - no box, just the number */}
          <div className="flex-shrink-0">
            <span
              className="text-7xl font-bold text-sentra-primary tabular-nums leading-none"
              aria-label={isEmpty ? 'Wellbeing score not yet available' : `Wellbeing score ${displayValue} out of 100`}
            >
              {displayValue ?? '-'}
            </span>
          </div>
          
          {/* Content */}
          <div className="flex flex-col gap-2.5 flex-1 min-w-0">
            {/* Title - up first */}
            <p className={`text-lg font-semibold leading-tight ${theme === 'dark' ? 'text-slate-200' : 'text-[#1e293b]'}`}>Caregiver wellbeing score</p>

            {/* Status and confidence row - below title */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <StatusPill status={score?.status ?? null} />
              {score?.confidence && (
                <span className={`inline-flex items-center gap-1.5 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-[#1e293b]'}`}>
                  <span
                    className="relative cursor-help"
                    onMouseEnter={() => setShowConfidenceTooltip(true)}
                    onMouseLeave={() => setShowConfidenceTooltip(false)}
                  >
                    <HelpCircle className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-slate-400' : 'text-[#475569]'}`} aria-hidden />
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
                  <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-[#1e293b]'}`}>{score.confidence} confidence</span>
                </span>
              )}
            </div>
            
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
