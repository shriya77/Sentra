import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import type { TrendDay } from '../../lib/api';

interface TrendsChartProps {
  data: TrendDay[];
}

const chartData = (data: TrendDay[]) =>
  data.map((d) => ({
    ...d,
    shortDate: d.date.slice(5),
  }));

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-4 py-3 rounded-2xl glass">
      <p className="text-body-sm text-sentra-muted mb-0.5">{label}</p>
      <p className="text-body font-semibold text-sentra-primary">Wellbeing: {Math.round(payload[0].value)}</p>
    </div>
  );
}

export default function TrendsChart({ data }: TrendsChartProps) {
  const plotData = chartData(data);
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={plotData} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id="stableBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d9488" stopOpacity={0.06} />
              <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="watchBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b45309" stopOpacity={0.05} />
              <stop offset="100%" stopColor="#b45309" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="highBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b91c1c" stopOpacity={0.05} />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <ReferenceArea y1={70} y2={100} fill="url(#stableBand)" />
          <ReferenceArea y1={45} y2={70} fill="url(#watchBand)" />
          <ReferenceArea y1={0} y2={45} fill="url(#highBand)" />
          <XAxis
            dataKey="shortDate"
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="wellbeing_score"
            stroke="#0f766e"
            strokeWidth={2}
            dot={{ fill: '#0f766e', strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, fill: '#0f766e', stroke: '#fff', strokeWidth: 2 }}
            name="Wellbeing"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
