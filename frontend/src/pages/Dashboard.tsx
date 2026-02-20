import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TrendingDown, Minus, AlertCircle, ArrowUp, ArrowDown, ArrowRight, Mic, HelpCircle } from 'lucide-react';
import { api } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import { DashboardSkeleton } from '../components/Skeleton';
import WellbeingScoreCard from '../components/cards/WellbeingScoreCard';
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

function RiskMomentumCard({ momentumLabel, momentumStrength, confidence }: { momentumLabel?: string | null; momentumStrength?: string | null; confidence?: string | null }) {
  const { theme } = useTheme();
  
  if (!momentumLabel) return null;
  
  const config =
    momentumLabel === 'Rising'
      ? { 
          label: momentumStrength === 'rapid' ? 'Rising (rapid)' : 'Rising (slow)', 
          Icon: ArrowUp, 
          color: theme === 'dark' ? 'text-sentra-high' : 'text-sentra-high', 
          bg: theme === 'dark' ? 'bg-sentra-high/20' : 'bg-sentra-high/10',
          desc: 'Risk trajectory is increasing'
        }
      : momentumLabel === 'Recovering'
        ? { 
            label: momentumStrength === 'rapid' ? 'Recovering (rapid)' : 'Recovering (slow)', 
            Icon: ArrowDown, 
            color: theme === 'dark' ? 'text-sentra-stable' : 'text-sentra-stable', 
            bg: theme === 'dark' ? 'bg-sentra-stable/20' : 'bg-sentra-stable/10',
            desc: 'Wellbeing is improving'
          }
        : { 
            label: 'Stable', 
            Icon: ArrowRight, 
            color: theme === 'dark' ? 'text-slate-300' : 'text-sentra-muted', 
            bg: theme === 'dark' ? 'bg-slate-700/30' : 'bg-slate-200/50',
            desc: 'Trajectory is steady'
          };
  
  const Icon = config.Icon;
  
  return (
    <div className={`rounded-2xl glass-dark p-4 border ${theme === 'dark' ? 'border-white/20' : 'border-white/60'}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${config.bg}`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>
        <div className="flex-1">
          <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-[#64748b]'}`}>Risk momentum</p>
          <p className={`text-lg font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-[#1e293b]'}`}>{config.label}</p>
          <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-sentra-muted'}`}>{config.desc}</p>
          {momentumLabel === 'Rising' && (
            <p className={`text-xs mt-1 italic ${theme === 'dark' ? 'text-slate-400' : 'text-sentra-muted'}`}>
              Sentra predicts decline before it becomes visible.
            </p>
          )}
        </div>
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

const VOICE_STRAIN_TOOLTIP = 'Based on how many recordings we have. More recordings = higher confidence.';
const VOICE_HOW_IT_WORKS = 'Baseline: the average of your last 7 recordings. We compare today\'s clip to that average using sound only (energy, pitch, steadiness). No words are stored or analyzed. Strain = how much today differs from your baseline.';

/** Decode audio blob (e.g. webm) and encode as WAV for backend compatibility. */
async function blobToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const decoded = await audioContext.decodeAudioData(arrayBuffer);
  const numChannels = decoded.numberOfChannels;
  const sampleRate = decoded.sampleRate;
  const duration = decoded.length;
  const buffer = decoded.getChannelData(0);
  const wavBuffer = new ArrayBuffer(44 + duration * 2);
  const view = new DataView(wavBuffer);
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + duration * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, duration * 2, true);
  for (let i = 0; i < duration; i++) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([wavBuffer], { type: 'audio/wav' });
}

async function submitVoiceBlob(blob: Blob, analyzeSpeech: boolean) {
  try {
    const wav = await blobToWav(blob);
    const file = new File([wav], 'recording.wav', { type: 'audio/wav' });
    return api.postVoiceStrain(file, analyzeSpeech);
  } catch (e) {
    throw new Error('Could not process recording. Try recording again or upload a WAV file.');
  }
}

export default function Dashboard() {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const { loading, error, score, insight, interventions, refetch } = useDashboardData();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceSuccess, setVoiceSuccess] = useState<string | null>(null);
  const [showVoiceTooltip, setShowVoiceTooltip] = useState(false);
  const [analyzeSpeech, setAnalyzeSpeech] = useState(false);

  const sendRecordingAndRefetch = async (blob: Blob, useAnalyzeSpeech: boolean) => {
    setVoiceError(null);
    setVoiceSuccess(null);
    setVoiceUploading(true);
    try {
      const result = await submitVoiceBlob(blob, useAnalyzeSpeech);
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['score'] }),
        queryClient.refetchQueries({ queryKey: ['insight'] }),
      ]);
      setVoiceSuccess(result.message || `Strain: ${result.voice_strain_level}. Saved.`);
      setTimeout(() => setVoiceSuccess(null), 5000);
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : 'Recording failed');
    } finally {
      setVoiceUploading(false);
    }
  };

  const handleStartRecording = async () => {
    setVoiceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          await sendRecordingAndRefetch(blob, analyzeSpeech);
        }
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setVoiceRecording(true);
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : 'Microphone access denied');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && voiceRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setVoiceRecording(false);
    }
  };

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
    <div className="max-w-[1100px] mx-auto">
      {/* Hero section with score */}
      <div className="mb-6 animate-[fadeIn_0.6s_ease-out]">
        <h1 className={`font-serif text-3xl font-semibold tracking-tight ${theme === 'dark' ? 'text-slate-100' : 'text-[#1e293b]'}`}>How you're doing today</h1>
        <p className={`text-body-sm mt-1 ${theme === 'dark' ? 'text-slate-300' : 'text-sentra-muted'}`}>Your caregiver wellbeing at a glance</p>
      </div>
      
      {/* Score + Risk Momentum in one row when momentum exists */}
      <div className={`grid gap-6 mb-6 animate-[slideUp_0.8s_ease-out_0.1s_both] ${score?.momentum_label ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        <WellbeingScoreCard score={score} />
        {score?.momentum_label && (
          <RiskMomentumCard
            momentumLabel={score.momentum_label}
            momentumStrength={score.momentum_strength}
            confidence={score.confidence}
          />
        )}
      </div>

      {/* Row 1: Your signals – main feature, centered, only box in row, stands out */}
      <div className="mb-6 animate-[slideUp_0.8s_ease-out_0.2s_both]">
        <div className={`mx-auto max-w-2xl rounded-3xl p-6 sm:p-8 border-2 shadow-xl transition-all duration-300 ${
          theme === 'dark'
            ? 'glass-dark border-sentra-primary/50 shadow-sentra-primary/20 bg-sentra-primary/5'
            : 'glass-dark border-sentra-primary/40 shadow-sentra-primary/15 bg-white'
        }`}>
          <h3 className={`text-sm font-semibold uppercase tracking-wide mb-4 ${theme === 'dark' ? 'text-sentra-primary' : 'text-sentra-primary-deep'}`}>Your signals</h3>
            {/* Voice check – lead with the action, results below */}
            <div className="flex justify-center my-4">
                {!voiceRecording ? (
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    disabled={voiceUploading}
                    className={`flex flex-col items-center justify-center gap-3 disabled:opacity-50 transition-transform active:scale-95 ${
                      theme === 'dark'
                        ? 'text-sentra-primary hover:opacity-90'
                        : 'text-sentra-primary-deep hover:opacity-90'
                    }`}
                  >
                    <span
                      className={`flex items-center justify-center rounded-full w-28 h-28 transition-colors ${
                        theme === 'dark'
                          ? 'bg-sentra-primary/30 hover:bg-sentra-primary/40'
                          : 'bg-sentra-primary/20 hover:bg-sentra-primary/30'
                      } ${voiceUploading ? 'opacity-70' : ''}`}
                    >
                      <Mic className="w-14 h-14" strokeWidth={1.5} />
                    </span>
                    <span className="text-sm font-medium text-center max-w-[140px]">
                      {voiceUploading ? 'Sending…' : 'Tell us about your day'}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopRecording}
                    className="flex flex-col items-center justify-center gap-3 text-red-600 transition-transform active:scale-95"
                  >
                    <span className="flex items-center justify-center rounded-full w-28 h-28 bg-red-500/20 hover:bg-red-500/30 border-2 border-red-500/50">
                      <span className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
                    </span>
                    <span className="text-sm font-medium">Stop recording</span>
                  </button>
                )}
              </div>
              <label className={`flex items-center gap-2 cursor-pointer justify-center ${voiceUploading || voiceRecording ? 'opacity-50 pointer-events-none' : ''}`}>
                <input
                  type="checkbox"
                  checked={analyzeSpeech}
                  onChange={(e) => setAnalyzeSpeech(e.target.checked)}
                  className="rounded border-slate-300 text-sentra-primary focus:ring-sentra-primary"
                />
                <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Also analyze what I say (mood from words). We only keep the mood score, not your words.
                </span>
              </label>
              {voiceSuccess && (
                <p className="mt-2 text-sm text-sentra-stable font-medium text-center">{voiceSuccess}</p>
              )}
              {voiceError && (
                <p className="mt-2 text-sm text-sentra-high font-medium text-center" role="alert">{voiceError}</p>
              )}
              {/* Voice strain + results moved below the mic so they're not the first thing you see */}
              <div className={`mt-4 pt-4 border-t ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <h4 className={`text-base font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-[#1e293b]'}`}>Voice strain</h4>
                  {score?.voice_strain_level && (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        score.voice_strain_level === 'high'
                          ? 'bg-red-100 text-red-700'
                          : score.voice_strain_level === 'medium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-sentra-stable/20 text-sentra-primary-deep'
                      }`}
                    >
                      {score.voice_strain_level}
                    </span>
                  )}
                  {score?.voice_confidence && (
                    <span className="relative inline-flex items-center gap-1 text-xs text-slate-500 cursor-help" onMouseEnter={() => setShowVoiceTooltip(true)} onMouseLeave={() => setShowVoiceTooltip(false)}>
                      <HelpCircle className="w-3.5 h-3.5" />
                      {score.voice_confidence} confidence
                      {showVoiceTooltip && (
                        <span role="tooltip" className="absolute left-0 top-full mt-1.5 z-[100] px-3 py-2 text-xs rounded-lg shadow-xl w-52 bg-slate-800 text-slate-100 pointer-events-none">
                          {VOICE_STRAIN_TOOLTIP}
                        </span>
                      )}
                    </span>
                  )}
                  {score?.speech_sentiment_label && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      score.speech_sentiment_label === 'positive'
                        ? 'bg-emerald-100 text-emerald-700'
                        : score.speech_sentiment_label === 'negative'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-slate-100 text-slate-600'
                    }`}>
                      Mood from words: {score.speech_sentiment_label}
                    </span>
                  )}
                </div>
                <p className={`text-body-sm leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-[#334155]'}`}>
                  {score?.voice_strain_level === 'low'
                    ? "Your voice patterns today match your baseline. No sign of added strain."
                    : score?.voice_strain_level === 'medium'
                      ? "Your voice today differs a bit from your baseline. That can reflect a busier or more tired day. We only use sound patterns, not what you say."
                      : score?.voice_strain_level === 'high'
                        ? "Your voice today shows more strain than your baseline. That often goes with fatigue or a heavier load. We only use sound patterns, not what you say."
                        : "Record a short clip to see how your voice compares to your baseline. We use sound patterns only, not your words."}
                </p>
              </div>
              <p className={`mt-3 pt-3 border-t text-xs leading-relaxed ${theme === 'dark' ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                {analyzeSpeech
                  ? 'Baseline: last 7 recordings (sound). We also transcribe this clip to get a mood-from-words score. Your words are not stored—only the score.'
                  : VOICE_HOW_IT_WORKS}
              </p>
        </div>
      </div>

      {/* Row 2: What we're noticing + Small steps, side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 animate-[slideUp_0.8s_ease-out_0.25s_both]">
        {hasInsight && (
          <div className={`rounded-2xl glass-dark p-5 border ${
            score?.status === 'Watch'
              ? 'border-sentra-primary/40 shadow-lg shadow-sentra-primary/10'
              : score?.status === 'High'
                ? 'border-sentra-high/40 shadow-lg shadow-sentra-high/15'
                : 'border-white/20'
          }`}>
            <h3 className={`text-sm font-semibold uppercase tracking-wide mb-4 ${theme === 'dark' ? 'text-slate-300' : 'text-[#475569]'}`}>What we're noticing</h3>
            <div className="mb-4">
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-2 rounded-xl flex-shrink-0 ${theme === 'dark' ? 'bg-sentra-cosmic-accent/20' : 'bg-sentra-accent-pale/40'}`}>
                  <AlertCircle className={`w-4 h-4 ${theme === 'dark' ? 'text-sentra-primary' : 'text-sentra-primary-deep'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  {insight.drivers?.length ? (
                    <div className="mb-2">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {insight.drivers.map((d) => (
                          <span key={d} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${theme === 'dark' ? 'bg-sentra-cosmic-accent/30 text-sentra-primary border border-sentra-cosmic-accent/20' : 'bg-sentra-accent-pale/60 text-sentra-primary-deep border border-sentra-primary/20'}`}>
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {score?.driver_contributions && score.driver_contributions.length > 0 && (
                    <div className={`mb-3 pt-3 border-t ${theme === 'dark' ? 'border-white/10' : 'border-white/30'}`}>
                      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-[#475569]'}`}>Primary drivers</p>
                      <div className="flex flex-wrap gap-2">
                        {score.driver_contributions.slice(0, 3).map((contrib, idx) => (
                          <span
                            key={idx}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
                              theme === 'dark' ? 'bg-slate-800/60 text-slate-200 border border-slate-700/60' : 'bg-slate-100 text-[#334155] border border-slate-300'
                            }`}
                          >
                            <span>{contrib.label}</span>
                            {contrib.direction === 'up' ? <ArrowUp className="w-3.5 h-3.5 text-sentra-high" /> : <ArrowDown className="w-3.5 h-3.5 text-sentra-stable" />}
                            <span className={`font-semibold ${contrib.direction === 'up' ? 'text-sentra-high' : 'text-sentra-stable'}`}>{contrib.contribution}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className={`text-body-sm leading-relaxed ${theme === 'dark' ? 'text-slate-200' : 'text-[#334155]'}`}>
                    {insight.short_insight}
                  </p>
                  {(score?.voice_strain_level === 'medium' || score?.voice_strain_level === 'high') && (
                    <p className={`text-body-sm leading-relaxed mt-2 ${theme === 'dark' ? 'text-slate-300' : 'text-[#475569]'}`}>
                      We're also seeing a shift in your voice patterns compared to your baseline.
                    </p>
                  )}
                </div>
              </div>
            </div>
            {score?.momentum && score?.confidence && score.confidence !== 'low' && (
              <div className="mt-4">
                <MomentumRow momentum={score.momentum} />
              </div>
            )}
          </div>
        )}
        <div className="rounded-2xl glass-dark p-5 hover:shadow-glass-hover-dark transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-sm font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-slate-300' : 'text-[#475569]'}`}>Small steps</h3>
            {pendingActions > 0 && (
              <span className="text-xs font-bold text-white bg-sentra-primary rounded-full px-2.5 py-1">{pendingActions}</span>
            )}
          </div>
          <MicroActionsCard interventions={interventions} onComplete={refetch} compact={true} />
        </div>
      </div>

      {/* Log activity - full width below */}
      <div className="animate-[slideUp_0.8s_ease-out_0.5s_both]">
        <h3 className={`text-sm font-semibold uppercase tracking-wide mb-4 ${theme === 'dark' ? 'text-slate-300' : 'text-[#475569]'}`}>Log activity</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
