import { TrendingDown, Minus } from 'lucide-react';
import Card from './Card';

interface MomentumCardProps {
  momentum: string | null;
}

export default function MomentumCard({ momentum }: MomentumCardProps) {
  const config =
    momentum === 'rapid_rise'
      ? { label: 'Rapid rise', Icon: TrendingDown, color: 'text-sentra-high', bg: 'bg-sentra-high/10' }
      : momentum === 'slow_rise'
        ? { label: 'Slow rise', Icon: TrendingDown, color: 'text-sentra-watch', bg: 'bg-sentra-watch/10' }
        : { label: 'Stable', Icon: Minus, color: 'text-sentra-stable', bg: 'bg-sentra-stable/10' };

  const Icon = config.Icon;
  return (
    <Card title="Risk momentum">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${config.bg} ${config.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="font-medium text-[#1e293b] text-base">{config.label}</p>
          <p className="text-body-sm text-sentra-muted">Pattern over recent days</p>
        </div>
      </div>
    </Card>
  );
}
