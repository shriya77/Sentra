import { useQuery } from '@tanstack/react-query';
import { Shield } from 'lucide-react';
import { api } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import { CardSkeleton } from '../components/Skeleton';
import Card from '../components/cards/Card';
import CareModeChart from '../components/charts/CareModeChart';

export default function CareMode() {
  const { theme } = useTheme();
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['orgSummary'],
    queryFn: () => api.getOrgSummary(),
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className={`font-serif text-3xl font-semibold tracking-tight ${theme === 'dark' ? 'text-slate-100' : 'text-[#1e293b]'}`}>Caregiver overview</h1>
        <CardSkeleton className="h-[260px]" />
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

  const momentum = summary?.momentum_distribution ?? {};

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className={`font-serif text-3xl font-semibold tracking-tight ${theme === 'dark' ? 'text-slate-100' : 'text-[#1e293b]'}`}>Caregiver overview</h1>
      <p className={`text-body-sm mt-1 ${theme === 'dark' ? 'text-slate-300' : 'text-sentra-muted'}`}>
        See how many home caregivers are Stable, Watch, or High risk—anonymized counts only, no personal details.
      </p>
      <div className="flex items-center gap-2 text-body-sm text-sentra-muted">
        <Shield className="w-4 h-4" />
        <span>Privacy locked · Anonymized</span>
      </div>
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <p className="text-body-sm text-sentra-muted mb-1">Caregivers</p>
          <p className="text-2xl font-semibold text-sentra-primary-deep">{summary?.total_users ?? 0}</p>
        </Card>
        <Card>
          <p className="text-body-sm text-sentra-muted mb-1">Average risk</p>
          <p className="text-2xl font-semibold text-sentra-primary-deep">{summary?.average_risk ?? 0}</p>
        </Card>
      </section>
      <Card title="How many caregivers are at risk">
        <CareModeChart summary={summary!} />
      </Card>
      <Card title="Trend (Stable vs rising risk)">
        <div className="flex gap-6 flex-wrap text-body-sm">
          <span className="text-sentra-muted">Stable: <strong className="text-sentra-primary-deep">{momentum.stable ?? 0}</strong></span>
          <span className="text-sentra-muted">Slow rise: <strong className="text-sentra-primary-deep">{momentum.slow_rise ?? 0}</strong></span>
          <span className="text-sentra-muted">Rapid rise: <strong className="text-sentra-primary-deep">{momentum.rapid_rise ?? 0}</strong></span>
        </div>
      </Card>
    </div>
  );
}
