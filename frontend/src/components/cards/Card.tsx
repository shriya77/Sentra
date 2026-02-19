import { type ReactNode } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface CardProps {
  title?: string | ReactNode;
  children: ReactNode;
  className?: string;
}

export default function Card({ title, children, className = '' }: CardProps) {
  const { theme } = useTheme();
  return (
    <div
      className={`
        glass-dark glass-hover-dark rounded-2xl p-5 transition-all duration-300
        ${className}
      `}
    >
      {title && (
        <h3 className={`text-sm font-semibold mb-3 tracking-tight uppercase ${theme === 'dark' ? 'text-slate-200' : 'text-[#475569]'}`}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
