import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Moon, Activity, Keyboard, TrendingDown, Minus } from 'lucide-react';
import { api } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import { DashboardSkeleton } from '../components/Skeleton';
import WellbeingScoreCard from '../components/cards/WellbeingScoreCard';
import SignalCard from '../components/cards/SignalCard';
import VoiceCard from '../components/cards/VoiceCard';
import MicroActionsCard from '../components/cards/MicroActionsCard';
import TypingCaptureForm from '../components/forms/TypingCaptureForm';
import DailyCheckinForm from '../components/forms/DailyCheckinForm';

function MomentumRow({ momentum }: { momentum: string }) {
  const { theme } = useTheme();
  const config =
    momentum === 'rapid_rise'
      ? { label: 'Rapid rise', Icon: TrendingDown, color: 'text-sentra-high', bg: 'bg-sentra-high/20' }
      : momentum === 'slow_rise'
        ? { label: 'Slow rise', Icon: TrendingDown, color: 'text-sentra-watch', bg: 'bg-sentra-watch/20' }
        : { label: 'Stable', Icon: Minus, color: 'text-sentra-stable', bg: 'bg-sentra-stable/20' };
  const Icon = config.Icon;
  return (
    <div className={`flex items-center gap-3 pt-2 border-t ${theme === 'dark' ? 'border-white/20' : 'border-white/60'}`}>
      <div className={`p-2 rounded-xl ${config.bg} ${config.color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className={`font-medium text-sm ${theme === 'dark' ? 'text-slate-200' : 'text-[#1e293b]'}`}>{config.label}</p>
        <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-sentra-muted'}`}>Pattern over recent days</p>
      </div>
    </div>
  );
}

function useDashboardData() {
  const queryClient = useQueryClient();
  const scoreQ = useQuery({ queryKey: ['score'], queryFn: () => api.getScoreToday() });
  const insightQ = useQuery({ queryKey: ['insight'], queryFn: () => api.getInsightToday() });
  const interventionsQ = useQuery({
    queryKey: ['interventions'],
    queryFn: () => api.getInterventionsToday(),
  });
  const signalsQ = useQuery({ 
    queryKey: ['signals'], 
    queryFn: () => api.getSignalDescriptions(),
    staleTime: 0, // Always refetch to get fresh AI descriptions
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['score'] });
    queryClient.invalidateQueries({ queryKey: ['insight'] });
    queryClient.invalidateQueries({ queryKey: ['interventions'] });
    // Force immediate refetch of signals to get updated AI descriptions
    queryClient.refetchQueries({ queryKey: ['signals'] });
  };

  const loading = scoreQ.isLoading || insightQ.isLoading || interventionsQ.isLoading || signalsQ.isLoading;
  const error = scoreQ.error || insightQ.error || interventionsQ.error || signalsQ.error;
  const score = scoreQ.data ?? null;
  const insight = insightQ.data ?? null;
  const interventions = interventionsQ.data ?? [];
  const signals = signalsQ.data ?? null;

  return { loading, error, score, insight, interventions, signals, refetch };
}

export default function Dashboard() {
  const [voicePlaying, setVoicePlaying] = useState(false);
  const { theme } = useTheme();
  const { loading, error, score, insight, interventions, signals, refetch } = useDashboardData();

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-3xl glass p-10 text-center">
        <p className="text-sentra-high font-medium">Error: {error instanceof Error ? error.message : 'Failed to load'}</p>
      </div>
    );
  }

  const hasInsight = !!(insight?.short_insight && insight.short_insight.length > 0);
  const pendingActions = interventions.filter((i) => !i.completed).length;

  return (
    <div className="max-w-[800px] mx-auto">
      {/* Hero section with score */}
      <div className="mb-6 animate-[fadeIn_0.6s_ease-out]">
        <h1 className={`font-serif text-3xl font-semibold tracking-tight ${theme === 'dark' ? 'text-slate-100' : 'text-[#1e293b]'}`}>How you're doing today</h1>
        <p className={`text-body-sm mt-1 ${theme === 'dark' ? 'text-slate-300' : 'text-sentra-muted'}`}>Your caregiver wellbeing at a glance</p>
      </div>
      
      <div className="mb-10 animate-[slideUp_0.8s_ease-out_0.1s_both]">
        <WellbeingScoreCard score={score} />
      </div>

      {/* Insight card - prominent, always visible if exists */}
      {hasInsight && (
        <div className="mb-6 animate-[slideUp_0.8s_ease-out_0.2s_both]">
          <div className="rounded-2xl glass-dark p-5 border border-white/20">
            <h3 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${theme === 'dark' ? 'text-slate-300' : 'text-[#475569]'}`}>What we're noticing</h3>
            <p className={`text-body leading-relaxed mb-3 ${theme === 'dark' ? 'text-slate-200' : 'text-[#334155]'}`}>
              {insight.short_insight}
            </p>
            {insight.drivers?.length ? (
              <div className="flex flex-wrap gap-2 mb-3">
                {insight.drivers.map((d) => (
                  <span key={d} className="px-2.5 py-1 rounded-md bg-sentra-cosmic-accent/30 text-xs font-medium text-sentra-primary border border-sentra-cosmic-accent/20">
                    {d}
                  </span>
                ))}
              </div>
            ) : null}
            {score?.momentum && (
              <MomentumRow momentum={score.momentum} />
            )}
          </div>
        </div>
      )}

      {/* Quick actions grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="animate-[slideUp_0.8s_ease-out_0.3s_both]">
          <div className="rounded-2xl glass-dark p-5 hover:shadow-glass-hover-dark transition-all duration-300">
            <h3 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${theme === 'dark' ? 'text-slate-300' : 'text-[#475569]'}`}>Voice reflection</h3>
            <VoiceCard
              insightText={insight?.short_insight ?? null}
              isPlaying={voicePlaying}
              onPlayingChange={setVoicePlaying}
              compact={true}
            />
          </div>
        </div>

        <div className="animate-[slideUp_0.8s_ease-out_0.4s_both]">
          <div className="rounded-2xl glass-dark p-5 hover:shadow-glass-hover-dark transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-300' : 'text-[#475569]'}`}>Small steps</h3>
              {pendingActions > 0 && (
                <span className="text-xs font-bold text-white bg-sentra-primary rounded-full px-2.5 py-1">
                  {pendingActions}
                </span>
              )}
            </div>
            <MicroActionsCard interventions={interventions} onComplete={refetch} compact={true} />
          </div>
        </div>
      </div>

      {/* Signals - horizontal cards */}
      <div className="mb-6 animate-[slideUp_0.8s_ease-out_0.5s_both]">
        <h3 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${theme === 'dark' ? 'text-slate-300' : 'text-[#475569]'}`}>Your signals</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SignalCard title="Sleep" icon={<Moon className="w-5 h-5" />} compact={true}>
            {signals?.sleep || "From your check-in. Rest matters when you're caring for someone at home."}
          </SignalCard>
          <SignalCard title="Activity" icon={<Activity className="w-5 h-5" />} compact={true}>
            {signals?.activity || "Movement from check-in. Even short breaks help when you're on care duty."}
          </SignalCard>
          <SignalCard title="Typing" icon={<Keyboard className="w-5 h-5" />} compact={true}>
            {signals?.typing || "Rhythm from typing—no content stored. Helps us sense stress and load."}
          </SignalCard>
        </div>
      </div>

      {/* Log activity - side by side */}
      <div className="animate-[slideUp_0.8s_ease-out_0.6s_both]">
        <h3 className={`text-sm font-semibold uppercase tracking-wide mb-4 ${theme === 'dark' ? 'text-slate-300' : 'text-[#475569]'}`}>Log activity</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl glass-dark p-5">
            <h4 className={`text-sm font-semibold mb-4 ${theme === 'dark' ? 'text-slate-200' : 'text-[#1e293b]'}`}>Typing session</h4>
            <TypingCaptureForm onSubmitted={refetch} compact={true} />
          </div>
          <div className="rounded-2xl glass-dark p-5">
            <h4 className={`text-sm font-semibold mb-4 ${theme === 'dark' ? 'text-slate-200' : 'text-[#1e293b]'}`}>Daily check-in</h4>
            <DailyCheckinForm onSubmitted={refetch} compact={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
