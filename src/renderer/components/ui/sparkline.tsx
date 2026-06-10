/** Mini-gráfica de línea (SVG puro) para stat cards. */
export function Sparkline({
  data,
  width = 72,
  height = 26,
  color = 'hsl(var(--primary))',
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const step = width / Math.max(data.length - 1, 1);
  const pts = data
    .map((v, i) => `${(i * step).toFixed(1)},${(height - 2 - ((v - min) / span) * (height - 4)).toFixed(1)}`)
    .join(' ');
  return (
    <svg width={width} height={height} className="block opacity-90" aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Barra de progreso fina (5px) con gradiente de marca. */
export function MeterBar({
  ratio,
  danger = false,
  className,
}: {
  ratio: number;
  danger?: boolean;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <div className={`h-[5px] overflow-hidden rounded-full bg-accent ${className ?? ''}`}>
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{
          width: `${pct}%`,
          background: danger
            ? 'hsl(var(--destructive))'
            : 'linear-gradient(90deg, hsl(263 90% 70%), hsl(258 80% 52%))',
        }}
      />
    </div>
  );
}
