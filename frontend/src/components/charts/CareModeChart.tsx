import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Shield } from 'lucide-react';
import type { OrgSummary } from '../../lib/api';

interface CareModeChartProps {
  summary: OrgSummary;
}

const COLORS = ['#0f766e', '#b45309', '#b91c1c'];

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-4 py-3 rounded-2xl glass">
      <p className="text-body-sm font-medium text-sentra-primary">{payload[0].name}: {payload[0].value}</p>
    </div>
  );
}

export default function CareModeChart({ summary }: CareModeChartProps) {
  const counts = summary.counts ?? {};
  const data = [
    { name: 'Stable', value: counts.Stable ?? 0, fill: COLORS[0] },
    { name: 'Watch', value: counts.Watch ?? 0, fill: COLORS[1] },
    { name: 'High', value: counts.High ?? 0, fill: COLORS[2] },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    data.push({ name: 'No data', value: 1, fill: '#e2e8f0' });
  }

  return (
    <div className="relative">
      <div className="absolute top-0 right-0 flex items-center gap-1.5 text-xs text-sentra-muted">
        <Shield className="w-4 h-4" />
        <span>Anonymized</span>
      </div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 24, right: 24, left: 24, bottom: 24 }}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} stroke="none" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              layout="horizontal"
              align="center"
              verticalAlign="bottom"
              formatter={(value) => <span className="text-sm text-sentra-muted">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
