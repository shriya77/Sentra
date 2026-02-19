import type { InsightToday } from '../../lib/api';
import Card from './Card';

interface InsightCardProps {
  insight: InsightToday | null;
}

export default function InsightCard({ insight }: InsightCardProps) {
  return (
    <Card title="Today's insight">
      <p className="text-body text-[#334155] leading-relaxed mb-3">
        {insight?.short_insight ?? 'No insight yet. Complete a daily check-in (and optional typing) to see patterns.'}
      </p>
      {insight?.drivers?.length ? (
        <p className="text-body-sm text-sentra-muted">
          Drivers: {insight.drivers.join(', ')}
        </p>
      ) : null}
    </Card>
  );
}
