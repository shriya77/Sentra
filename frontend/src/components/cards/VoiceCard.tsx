import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Sparkles } from 'lucide-react';
import { useToast } from '../../lib/toast';
import { api, type VoiceResponse } from '../../lib/api';
import Card from './Card';

interface VoiceCardProps {
  insightText: string | null;
  isPlaying: boolean;
  onPlayingChange: (v: boolean) => void;
  compact?: boolean;
}

export default function VoiceCard({ insightText, isPlaying, onPlayingChange, compact }: VoiceCardProps) {
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const toast = useToast();

  const handlePlay = async () => {
    if (!insightText) return;
    setVoiceMessage(null);
    onPlayingChange(true);
    try {
      const res: VoiceResponse = await api.postVoice(insightText);
      if (res.audio_base64) {
        const audio = new Audio('data:audio/mp3;base64,' + res.audio_base64);
        audioRef.current = audio;
        audio.onloadedmetadata = () => setDuration(audio.duration);
        audio.ontimeupdate = () => {
          setElapsed(audio.currentTime);
          setProgress(duration ? (audio.currentTime / duration) * 100 : 0);
        };
        audio.onended = () => {
          onPlayingChange(false);
          setProgress(0);
          setElapsed(0);
        };
        await audio.play();
      } else {
        setVoiceMessage(res.message || 'Voice not available.');
        onPlayingChange(false);
      }
    } catch {
      setVoiceMessage('Could not play voice.');
      onPlayingChange(false);
      toast.addToast('error', 'Voice playback failed.');
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      onPlayingChange(false);
    }
  };

  useEffect(() => {
    if (duration > 0) setProgress((elapsed / duration) * 100);
  }, [elapsed, duration]);

  const showDisabledCallout = voiceMessage?.includes('ELEVENLABS') ?? false;
  const canPlay = !!insightText;

  const content = (
    <>
      {showDisabledCallout ? (
        <div className="rounded-2xl glass-input p-4">
          <p className="text-body-sm text-sentra-muted">
            Add <code className="bg-white/90 px-1.5 py-0.5 rounded text-body-sm text-sentra-primary-deep">ELEVENLABS_API_KEY</code> to enable voice reflection.
          </p>
        </div>
      ) : (
        <>
          <p className="text-body-sm text-sentra-muted mb-4">
            Hear your insight read aloud. A moment for you.
          </p>
          {canPlay && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={isPlaying ? handlePause : handlePlay}
                  className={`
                    flex items-center justify-center w-12 h-12 rounded-2xl font-medium shadow-glass
                    transition-all hover:scale-105
                    ${isPlaying
                      ? 'bg-sentra-watch/15 text-sentra-watch'
                      : 'bg-sentra-primary text-white'}
                  `}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </button>
                {isPlaying && (
                  <span className="inline-flex items-center gap-1 text-sentra-muted text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-sentra-accent animate-pulse" />
                    Playing
                  </span>
                )}
              </div>
              {voiceMessage && !showDisabledCallout && (
                <p className="text-body-sm text-sentra-watch">{voiceMessage}</p>
              )}
              {duration > 0 && (
                <div className="space-y-1">
                  <div className="h-1.5 bg-sentra-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sentra-primary rounded-full transition-all duration-150"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-body-sm text-sentra-muted">
                    {Math.floor(elapsed)}s / {Math.floor(duration)}s
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
  return compact ? content : <Card title="Voice check-in">{content}</Card>;
}
