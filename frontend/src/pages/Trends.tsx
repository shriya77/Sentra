import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import { CardSkeleton } from '../components/Skeleton';
import TrendsChart from '../components/charts/TrendsChart';

export default function Trends() {
  const { theme } = useTheme();
  const { data, isLoading, error } = useQuery({
    queryKey: ['trends', 14],
    queryFn: () => api.getTrends(14),
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className={`font-serif text-3xl font-semibold tracking-tight ${theme === 'dark' ? 'text-slate-100' : 'text-[#1e293b]'}`}>Wellbeing trend</h1>
        <CardSkeleton className="h-[320px]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-white border border-sentra-high/30 p-8 text-center">
        <p className="text-sentra-high">Error: {error instanceof Error ? error.message : 'Failed to load'}</p>
      </div>
    );
  }

  const chartData = data ?? [];
  const hasData = chartData.length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className={`font-serif text-3xl font-semibold tracking-tight ${theme === 'dark' ? 'text-slate-100' : 'text-[#1e293b]'}`}>Your wellbeing trend</h1>
      <p className={`text-body-sm mt-1 ${theme === 'dark' ? 'text-slate-300' : 'text-sentra-muted'}`}>
        {hasData
          ? 'Your 14-day caregiver wellbeing. Shaded bands: Stable (70–100), Watch (45–70), High risk (0–45).'
          : 'Your trend appears here once you have enough check-ins (about a week). Caring for others starts with you.'}
      </p>
      {hasData ? (
        <>
          <div className="rounded-3xl glass p-6">
            <TrendsChart data={chartData} />
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-sentra-muted">
            {chartData.map((d) => (
              <span key={d.date} className="text-body-sm">
                {d.date.slice(5)}: {d.momentum === 'rapid_rise' ? 'Rapid rise' : d.momentum === 'slow_rise' ? 'Slow rise' : 'Stable'}
              </span>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-3xl glass p-10 text-center">
          <p className="text-sentra-muted">No trend data yet.</p>
          <p className="text-body-sm text-sentra-muted mt-2">Do daily check-ins; your chart will show here after we have enough days.</p>
        </div>
      )}
    </div>
  );
}
