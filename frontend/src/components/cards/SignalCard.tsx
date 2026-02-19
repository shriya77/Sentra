import { type ReactNode } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import Card from './Card';

interface SignalCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  compact?: boolean;
}

export default function SignalCard({ title, icon, children, compact }: SignalCardProps) {
  const { theme } = useTheme();
  const inner = (
    <div className="flex items-start gap-3 group">
      {icon && (
        <div className="text-sentra-primary mt-0.5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
          {icon}
        </div>
      )}
      <div className="flex-1">
        <h4 className={`text-base font-semibold mb-1.5 group-hover:text-sentra-primary transition-colors ${theme === 'dark' ? 'text-slate-200' : 'text-[#1e293b]'}`}>
          {title}
        </h4>
        <p className={`text-body-sm leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-[#334155]'}`}>{children}</p>
      </div>
    </div>
  );
  
  if (compact) {
    return (
      <div className="rounded-xl glass-dark p-4 hover:shadow-glass-hover-dark transition-all duration-300">
        {inner}
      </div>
    );
  }
  
  return <Card>{inner}</Card>;
}
