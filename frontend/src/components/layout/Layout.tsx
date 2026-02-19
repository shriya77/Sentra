import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import BrandMark from './BrandMark';
import VideoBackground from './VideoBackground';
import ThemeToggle from './ThemeToggle';

const nav = [
  { path: '/', label: 'Dashboard' },
  { path: '/trends', label: 'Trends' },
  { path: '/care', label: 'Caregiver overview' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { logout } = useAuth();
  const { theme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative">
      {theme === 'dark' && <VideoBackground />}
      <header className={`sticky top-0 z-40 glass-dark border-b transition-transform duration-300 ${theme === 'dark' ? 'border-white/20' : 'border-white/60'} ${isScrolled ? '-translate-y-full' : 'translate-y-0'}`}>
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <BrandMark />
          <nav className="flex items-center gap-1">
            {nav.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                className={`
                  px-4 py-2.5 rounded-2xl text-[15px] font-medium no-underline transition-all duration-200
                  ${location.pathname === path
                    ? theme === 'dark'
                      ? 'bg-sentra-cosmic-accent/30 text-sentra-primary shadow-cosmic-glow border border-sentra-cosmic-accent/30'
                      : 'bg-sentra-accent-pale/60 text-sentra-primary-deep shadow-inner-glow'
                    : theme === 'dark'
                      ? 'text-slate-200 hover:text-sentra-primary hover:glass-input-dark'
                      : 'text-sentra-muted hover:text-sentra-primary-deep hover:glass-input'}
                `}
              >
                {label}
              </Link>
            ))}
            <ThemeToggle />
            <button
              type="button"
              onClick={() => logout()}
              className={`px-4 py-2.5 rounded-2xl text-[15px] font-medium transition-all duration-200 ${
                theme === 'dark'
                  ? 'text-slate-200 hover:text-sentra-primary hover:glass-input-dark'
                  : 'text-sentra-muted hover:text-sentra-primary-deep hover:glass-input'
              }`}
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-10 relative z-10">
        {children}
      </main>
      <footer className={`mt-auto border-t glass-dark relative z-10 ${theme === 'dark' ? 'border-white/20' : 'border-white/60'}`}>
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className={`text-body-sm ${theme === 'dark' ? 'text-slate-300' : 'text-sentra-muted'}`}>
            Sentra © 2026
          </p>
          <Link to="/privacy" className={`text-body-sm no-underline transition-colors ${theme === 'dark' ? 'text-slate-300 hover:text-sentra-primary' : 'text-sentra-muted hover:text-sentra-primary-deep'}`}>
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  );
}
