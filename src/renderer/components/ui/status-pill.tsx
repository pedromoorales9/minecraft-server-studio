import { cn } from '../../lib/cn';

const META: Record<string, { label: string; cls: string; dot: string; pulse?: boolean }> = {
  running: {
    label: 'En línea',
    cls: 'text-[hsl(var(--success))] bg-[hsl(var(--success)/0.10)] border-[hsl(var(--success)/0.28)]',
    dot: 'shadow-[0_0_8px_hsl(var(--success))]',
  },
  starting: {
    label: 'Iniciando',
    cls: 'text-[hsl(var(--warning))] bg-[hsl(var(--warning)/0.10)] border-[hsl(var(--warning)/0.30)]',
    dot: '',
    pulse: true,
  },
  stopping: {
    label: 'Deteniendo',
    cls: 'text-[hsl(var(--warning))] bg-[hsl(var(--warning)/0.08)] border-[hsl(var(--warning)/0.26)]',
    dot: '',
    pulse: true,
  },
  updating: {
    label: 'Actualizando',
    cls: 'text-[hsl(var(--warning))] bg-[hsl(var(--warning)/0.10)] border-[hsl(var(--warning)/0.30)]',
    dot: '',
    pulse: true,
  },
  crashed: {
    label: 'Caído',
    cls: 'text-destructive bg-destructive/10 border-destructive/30',
    dot: 'shadow-[0_0_8px_hsl(var(--destructive))]',
  },
  stopped: {
    label: 'Detenido',
    cls: 'text-muted-foreground bg-muted border-border',
    dot: '',
  },
};

/** Estado del servidor como píldora con punto luminoso, estilo Sh4d0w DS. */
export function StatusPill({ status, className }: { status: string; className?: string }) {
  const m = META[status] ?? META['stopped']!;
  return (
    <span
      className={cn(
        'inline-flex h-6 select-none items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold',
        m.cls,
        className,
      )}
    >
      <span
        className={cn('h-1.5 w-1.5 rounded-full bg-current', m.dot, m.pulse && 'animate-pulse')}
      />
      {m.label}
    </span>
  );
}
