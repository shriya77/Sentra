import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

// Get initial theme from localStorage or default to 'dark'
function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
  } catch (e) {
    // localStorage not available
  }
  return 'dark';
}

// Create context with a default value that's always safe
const defaultTheme: Theme = 'dark';
const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    // Set data-theme attribute on document root
    document.documentElement.setAttribute('data-theme', theme);
    
    // Save to localStorage
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {
      // localStorage not available, ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
