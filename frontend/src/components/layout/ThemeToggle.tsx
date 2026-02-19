import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`px-4 py-2.5 rounded-2xl text-[15px] font-medium transition-all duration-200 flex items-center gap-2 ${
        isDark
          ? 'text-slate-200 hover:text-sentra-primary hover:glass-input-dark'
          : 'text-sentra-muted hover:text-sentra-primary-deep hover:glass-input'
      }`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <>
          <Sun className="w-4 h-4" />
          <span className="hidden sm:inline">Light mode</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4" />
          <span className="hidden sm:inline">Dark mode</span>
        </>
      )}
    </button>
  );
}
