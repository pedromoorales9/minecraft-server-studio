import { useParams } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useLiveMetrics, useMetricsHistory } from './useLiveMetrics';

export function MonitoringPage() {
  const { id } = useParams<{ id: string }>();
  const latest = useLiveMetrics(id ?? null);
  const history = useMetricsHistory(id ?? null, 90);

  return (
    <>
      <PageHeader title="Monitorización" description="Métricas del servidor en tiempo real." />
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="CPU" value={latest ? `${latest.cpuPercent.toFixed(1)}%` : '—'} />
        <Stat
          label="RAM"
          value={latest ? `${latest.memoryUsedMb} / ${latest.memoryAllocatedMb} MB` : '—'}
        />
        <Stat label="TPS" value={latest?.tps?.toFixed(1) ?? '—'} />
        <Stat
          label="Jugadores"
          value={latest ? `${latest.playersOnline}/${latest.playersMax}` : '—'}
        />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartCard title="CPU" dataKey="cpuPercent" history={history} suffix="%" />
        <ChartCard title="RAM" dataKey="memoryUsedMb" history={history} suffix=" MB" />
        <ChartCard title="Jugadores online" dataKey="playersOnline" history={history} />
        <ChartCard title="TPS" dataKey="tps" history={history} />
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 font-display text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  dataKey,
  history,
  suffix,
}: {
  title: string;
  dataKey: 'cpuPercent' | 'memoryUsedMb' | 'playersOnline' | 'tps';
  history: ReturnType<typeof useMetricsHistory>;
  suffix?: string;
}) {
  const data = history.map((h) => ({
    t: new Date(h.timestamp).toLocaleTimeString(),
    [dataKey]: h[dataKey] ?? 0,
  }));
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, left: 0, right: 8, bottom: 0 }}>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(v: number) => [`${v}${suffix ?? ''}`, title]}
              labelFormatter={(l) => l}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
