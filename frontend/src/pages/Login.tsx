import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../lib/toast';
import { getAuthErrorMessage } from '../lib/authErrors';
import { GoogleIcon } from '../components/icons/GoogleIcon';
import VideoBackground from '../components/layout/VideoBackground';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const { theme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      toast.addToast('success', 'Welcome back.');
      navigate('/', { replace: true });
    } catch (err: unknown) {
      toast.addToast('error', getAuthErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      toast.addToast('success', 'Welcome back.');
      navigate('/', { replace: true });
    } catch (err: unknown) {
      toast.addToast('error', getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative">
      {theme === 'dark' && <VideoBackground />}
      <div className="w-full max-w-[420px] rounded-3xl glass-dark glass-hover-dark p-8 sm:p-10 shadow-glass-dark relative z-10">
        <div className="flex justify-center mb-6">
          <img src="/sentra.png" alt="" width={80} height={80} className="rounded-xl block" />
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-center gradient-text mb-1">
          Welcome back
        </h1>
        <p className="text-body-sm text-slate-300 text-center mb-6">
          Sign in for home caregivers
        </p>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || submitting}
          className="w-full py-3 rounded-2xl font-medium text-slate-100 bg-white/10 border border-white/20 shadow-glass-dark flex items-center justify-center gap-3 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-sentra-primary/40 transition-colors disabled:opacity-60 disabled:pointer-events-none"
        >
          <GoogleIcon className="w-5 h-5" />
          {googleLoading ? 'Signing in…' : 'Continue with Google'}
        </button>

        <div className="flex items-center gap-3 my-6">
          <span className="flex-1 h-px bg-white/20" />
          <span className="text-body-sm text-slate-400">or</span>
          <span className="flex-1 h-px bg-white/20" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="login-email" className="block text-body-sm font-medium text-slate-200 mb-2">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-2xl glass-input-dark placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sentra-primary/40 focus:border-sentra-primary/40 text-body"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-body-sm font-medium text-slate-200 mb-2">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-2xl glass-input-dark placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sentra-primary/40 focus:border-sentra-primary/40 text-body"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-2xl font-medium text-white bg-sentra-primary hover:bg-sentra-primary-deep focus:outline-none focus:ring-2 focus:ring-sentra-primary/40 focus:ring-offset-2 focus:ring-offset-black/50 transition-colors disabled:opacity-60 disabled:pointer-events-none shadow-cosmic-glow"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-body-sm text-slate-300">
          Don’t have an account?{' '}
          <Link to="/signup" className="text-sentra-primary font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
