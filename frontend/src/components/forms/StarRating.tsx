import { useTheme } from '../../contexts/ThemeContext';

const STARS = 5;

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
}

export default function StarRating({ value, onChange, label = 'Rating' }: StarRatingProps) {
  const { theme } = useTheme();
  return (
    <div>
      <label className={`block text-body-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-200' : 'text-[#1e293b]'}`}>{label}</label>
      <div className="flex gap-1.5" role="group" aria-label={label}>
        {Array.from({ length: STARS }, (_, i) => {
          const starValue = i + 1;
          const filled = value >= starValue;
          return (
            <button
              key={starValue}
              type="button"
              onClick={() => onChange(starValue)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft' && starValue > 1) onChange(starValue - 1);
                if (e.key === 'ArrowRight' && starValue < STARS) onChange(starValue + 1);
              }}
              aria-label={`${starValue} ${starValue === 1 ? 'star' : 'stars'}`}
              aria-pressed={filled}
              className={`
                w-10 h-10 rounded-xl flex items-center justify-center text-xl
                transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-sentra-primary/40 focus-visible:ring-offset-2
                ${filled
                  ? theme === 'dark'
                    ? 'bg-sentra-cosmic-accent/40 text-sentra-primary shadow-cosmic-glow border border-sentra-cosmic-accent/30'
                    : 'bg-sentra-accent-pale/60 text-sentra-primary-deep shadow-inner-glow border border-sentra-primary/30'
                  : theme === 'dark'
                    ? 'glass-input-dark text-slate-400 hover:bg-white/10 hover:text-sentra-primary'
                    : 'glass-input-dark text-sentra-muted hover:bg-white/80 hover:text-sentra-primary-deep'}
              `}
            >
              <span className="leading-none">{filled ? '★' : '☆'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
