import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

interface BrandMarkProps {
  size?: 'sm' | 'md';
  showWordmark?: boolean;
}

export default function BrandMark({ size = 'md', showWordmark = true }: BrandMarkProps) {
  const { theme } = useTheme();
  const imgSize = size === 'sm' ? 72 : 128;
  return (
    <Link
      to="/"
      className={`flex items-center gap-0 no-underline hover:opacity-90 transition-opacity ${theme === 'dark' ? 'text-slate-100' : 'text-[#1e293b]'}`}
      aria-label="Sentra home"
    >
      <div className="flex-shrink-0 flex items-center" style={{ transform: 'translateY(4px)' }}>
        <img src="/sentra.png" alt="" width={imgSize} height={imgSize} className="rounded-xl block" />
      </div>
      {showWordmark && (
        <span className={`font-bold uppercase leading-none tracking-tight -ml-6 ${size === 'sm' ? 'text-3xl' : 'text-4xl'} ${theme === 'dark' ? 'text-slate-100' : 'text-[#1e293b]'}`} style={{ lineHeight: '1' }}>
          Sentra
        </span>
      )}
    </Link>
  );
}
