import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Trends from './pages/Trends';
import CareMode from './pages/CareMode';
import Privacy from './pages/Privacy';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import VideoBackground from './components/layout/VideoBackground';

function AuthGate() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();
  const path = location.pathname;
  const isAuthPage = path === '/login' || path === '/signup';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        {theme === 'dark' && <VideoBackground />}
        <div className={`rounded-2xl glass-dark px-8 py-6 flex items-center gap-3 relative z-10 ${theme === 'dark' ? '' : 'shadow-glass'}`}>
          <div className="w-6 h-6 border-2 border-sentra-primary/30 border-t-sentra-primary rounded-full animate-spin" />
          <span className={`text-body ${theme === 'dark' ? 'text-slate-200' : 'text-sentra-muted'}`}>Loading…</span>
        </div>
      </div>
    );
  }

  if (!user && !isAuthPage) return <Navigate to="/login" replace />;
  if (user && isAuthPage) return <Navigate to="/" replace />;

  if (isAuthPage) {
    return path === '/login' ? <Login /> : <Signup />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/trends" element={<Trends />} />
        <Route path="/care" element={<CareMode />} />
        <Route path="/privacy" element={<Privacy />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<AuthGate />} />
        <Route path="/signup" element={<AuthGate />} />
        <Route path="/*" element={<AuthGate />} />
      </Routes>
    </ErrorBoundary>
  );
}
