import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const MOOD_WHEEL: { value: number; emoji: string; label: string }[] = [
  { value: 1, emoji: '😭', label: 'Devastated' },
  { value: 2, emoji: '😢', label: 'Very low' },
  { value: 2.5, emoji: '😔', label: 'Low' },
  { value: 3, emoji: '😞', label: 'Down' },
  { value: 4, emoji: '😐', label: 'Neutral' },
  { value: 5, emoji: '🙂', label: 'Okay' },
  { value: 6, emoji: '😊', label: 'Good' },
  { value: 7, emoji: '😄', label: 'Happy' },
  { value: 8, emoji: '😁', label: 'Great' },
  { value: 9, emoji: '🤗', label: 'Loved' },
  { value: 10, emoji: '🤩', label: 'Amazing' },
];

const RADIUS = 100;
const SIZE = 40;

interface MoodSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

export default function MoodSelector({ value, onChange }: MoodSelectorProps) {
  const { theme } = useTheme();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const count = MOOD_WHEEL.length;

  return (
    <div>
      <label className={`block text-body-sm font-medium mb-3 ${theme === 'dark' ? 'text-slate-200' : 'text-[#1e293b]'}`}>Mood</label>
      <div
        className="relative mx-auto flex items-center justify-center"
        style={{ width: RADIUS * 2 + SIZE + 24, height: RADIUS * 2 + SIZE + 24 }}
      >
        {MOOD_WHEEL.map((opt, i) => {
          const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
          const x = RADIUS + RADIUS * Math.cos(angle);
          const y = RADIUS + RADIUS * Math.sin(angle);
          const isSelected = value === opt.value;
          const isHover = hoveredIndex === i;

          return (
            <button
              key={`${opt.emoji}-${i}`}
              type="button"
              onClick={() => onChange(opt.value)}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              title={opt.label}
              className={`
                absolute rounded-2xl text-2xl flex items-center justify-center
                transition-all duration-200 border-2
                ${isSelected
                  ? 'ring-2 ring-sentra-primary ring-offset-2 bg-sentra-cosmic-accent/40 shadow-cosmic-glow border-sentra-primary/40 scale-110'
                  : isHover
                    ? 'scale-110 border-white/30 bg-white/10'
                    : 'border-transparent glass-input-dark hover:bg-white/10 hover:scale-105'}
              `}
              style={{
                width: SIZE,
                height: SIZE,
                left: x - SIZE / 2,
                top: y - SIZE / 2,
              }}
            >
              {opt.emoji}
            </button>
          );
        })}
      </div>
      <p className={`text-center text-body-sm mt-2 min-h-[1.5rem] ${theme === 'dark' ? 'text-slate-300' : 'text-sentra-muted'}`}>
        {hoveredIndex !== null
          ? MOOD_WHEEL[hoveredIndex].label
          : MOOD_WHEEL.find((o) => o.value === value)?.label ?? 'How are you?'}
      </p>
    </div>
  );
}
