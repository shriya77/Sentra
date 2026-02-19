import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface DashboardSectionProps {
  title: string;
  badge?: string | number;
  children: ReactNode;
  defaultOpen?: boolean;
  variant?: 'default' | 'highlight' | 'minimal';
}

export default function DashboardSection({
  title,
  badge,
  children,
  defaultOpen = false,
  variant = 'default',
}: DashboardSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  const variants = {
    default: 'rounded-2xl glass',
    highlight: 'rounded-3xl glass border-2 border-sentra-primary/20 bg-gradient-to-br from-white/80 to-sentra-accent-pale/30',
    minimal: 'rounded-xl border border-white/40 bg-white/40',
  };

  return (
    <div className={`${variants[variant]} overflow-hidden transition-all duration-300 ${open ? 'shadow-glass-hover' : ''}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-white/40 transition-all duration-200 group"
        aria-expanded={open}
      >
        <span className="font-medium text-[#1e293b] group-hover:text-sentra-primary-deep transition-colors">{title}</span>
        <span className="flex items-center gap-2">
          {badge != null && (
            <span className="text-body-sm text-white bg-sentra-primary rounded-full px-2.5 py-1 font-medium animate-pulse-soft">
              {badge}
            </span>
          )}
          <span className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>
            <ChevronDown className="w-5 h-5 text-sentra-muted flex-shrink-0 group-hover:text-sentra-primary transition-colors" />
          </span>
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-500 ease-out ${
          open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-5 pb-5 pt-4 border-t border-white/40">
          <div className={`transform transition-all duration-500 ${open ? 'translate-y-0' : '-translate-y-4'}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
