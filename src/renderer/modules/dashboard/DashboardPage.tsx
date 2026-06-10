import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Cpu,
  MemoryStick,
  Users,
  Activity,
  Play,
  Square,
  RefreshCw,
  Terminal,
  Server,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatusPill } from '../../components/ui/status-pill';
import { Sparkline, MeterBar } from '../../components/ui/sparkline';
import { useFleetMetrics } from '../monitoring/useFleetMetrics';
import { LOADER_LABEL } from '../../../shared/types/loader';
import type { ServerRecord, ServerMetricsSnapshot } from '../../../shared/types/server';
import { useRecentEvents } from './useRecentEvents';
import { OWNER_NAME } from '../../lib/branding';
import { cn } from '../../lib/cn';

export function DashboardPage() {
  const servers = useQuery({
    queryKey: ['servers'],
    queryFn: () => window.api.servers.list(),
    refetchInterval: 3000,
  });
  const system = useQuery({ queryKey: ['system'], queryFn: () => window.api.system.info() });
  const events = useRecentEvents();
  const { byServer, history } = useFleetMetrics();

  const list = servers.data ?? [];
  const isLoading = servers.isLoading;
  const isEmpty = !isLoading && list.length === 0;

  const running = list.filter((s) => s.status === 'running');
  const anyLive = running.length > 0;
  const fleetCpu = history.cpu[history.cpu.length - 1] ?? 0;
  const ramUsedMb = running.reduce((a, s) => a + (byServer[s.id]?.memoryUsedMb ?? 0), 0);
  const ramTotalMb = system.data?.totalRamMb ?? 0;
  const totalPlayers = running.reduce((a, s) => a + (byServer[s.id]?.playersOnline ?? 0), 0);

  return (
    <>
      {/* ---- Saludo ---- */}
      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight">
            Hola,{' '}
            <span className="bg-gradient-to-r from-[hsl(263_90%_72%)] to-[hsl(258_85%_55%)] bg-clip-text text-transparent">
              {OWNER_NAME}
            </span>
          </h1>
          <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
            <span>Estado en tiempo real de tus servidores y eventos recientes.</span>
            {anyLive ? <LiveChip /> : null}
          </div>
        </div>
        <Button asChild>
          <Link to="/servers/new">
            <Plus className="h-4 w-4" /> Nuevo servidor
          </Link>
        </Button>
      </div>

      {/* ---- Stats ---- */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          [0, 1, 2, 3].map((i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              icon={<Activity className="h-4 w-4" />}
              label="Servidores"
              value={String(list.length)}
              hint={isEmpty ? 'Ninguno creado' : `${running.length} en ejecución`}
            />
            <StatCard
              icon={<Cpu className="h-4 w-4" />}
              label="CPU (servidores)"
              value={`${Math.round(fleetCpu)}%`}
              hint={`${system.data?.cpuModel?.split(' ').slice(0, 3).join(' ') ?? '—'} · ${system.data?.cores ?? 0} núcleos`}
              spark={anyLive ? history.cpu : undefined}
              bar={anyLive ? fleetCpu / 100 : 0}
              mono
            />
            <StatCard
              icon={<MemoryStick className="h-4 w-4" />}
              label="RAM en uso"
              value={`${(ramUsedMb / 1024).toFixed(1)} GB`}
              hint={`de ${(ramTotalMb / 1024).toFixed(0)} GB del host`}
              bar={ramTotalMb ? ramUsedMb / ramTotalMb : 0}
              barDanger={ramTotalMb > 0 && ramUsedMb / ramTotalMb > 0.85}
              mono
            />
            <StatCard
              icon={<Users className="h-4 w-4" />}
              label="Jugadores online"
              value={String(totalPlayers)}
              hint={anyLive ? `en ${running.length} servidor${running.length === 1 ? '' : 'es'}` : 'Sin servidores activos'}
              spark={anyLive ? history.players : undefined}
              sparkColor="hsl(var(--success))"
              mono
            />
          </>
        )}
      </section>

      {/* ---- Paneles ---- */}
      <section className="mt-6 grid items-start gap-4 lg:grid-cols-[1.62fr_1fr]">
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h3 className="font-display text-lg font-semibold">Mis servidores</h3>
              {!isLoading && !isEmpty ? (
                <span className="rounded-full border border-border bg-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  {list.length}
                </span>
              ) : null}
            </div>
            {!isEmpty ? (
              <Button asChild size="sm" variant="ghost">
                <Link to="/servers/new">
                  <Plus className="h-4 w-4" /> Añadir
                </Link>
              </Button>
            ) : null}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-secondary" />
              ))}
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center gap-4 rounded-xl border-[1.5px] border-dashed border-border p-11 text-center">
              <div className="grid h-[52px] w-[52px] place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                <Server className="h-6 w-6" />
              </div>
              <div>
                <div className="font-display text-base font-semibold">Aún no tienes servidores</div>
                <p className="mx-auto mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  Crea el primero con el asistente y aparecerá aquí con su estado en vivo.
                </p>
              </div>
              <Button asChild size="sm">
                <Link to="/servers/new">
                  <Plus className="h-4 w-4" /> Crear servidor
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((s) => (
                <ServerCard key={s.id} server={s} metrics={byServer[s.id] ?? null} />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-center gap-2.5">
            <h3 className="font-display text-lg font-semibold">Últimos eventos</h3>
            {anyLive ? <LiveChip /> : null}
          </div>
          {events.data?.length ? (
            <ul>
              {events.data.slice(0, 9).map((e) => (
                <li
                  key={e.id}
                  className="flex items-center gap-3 border-b border-border/60 py-[11px] last:border-b-0"
                >
                  <span
                    className={cn('h-2 w-2 flex-none rounded-full', eventDot(e.kind))}
                    style={{ boxShadow: '0 0 8px currentColor' }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
                    {e.message}
                  </span>
                  <span className="flex-none text-[11px] text-muted-foreground/60">
                    {new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-7 text-center text-[13px] text-muted-foreground/70">
              Sin eventos todavía.
              <br />
              La actividad aparecerá aquí en cuanto inicies un servidor.
            </div>
          )}
        </div>
      </section>
    </>
  );
}

/* ================= Sub-componentes ================= */

function LiveChip() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--success))]">
      <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-current shadow-[0_0_8px_hsl(var(--success))]" />
      En vivo
    </span>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  spark,
  sparkColor,
  bar,
  barDanger,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  spark?: number[];
  sparkColor?: string;
  bar?: number;
  barDanger?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft transition-all duration-200 hover:border-primary/25">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium">{label}</span>
        {icon}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2.5">
        <div className={cn('text-2xl font-semibold tracking-tight', mono ? 'font-mono' : 'font-display')}>
          {value}
        </div>
        {spark ? <Sparkline data={spark} color={sparkColor} /> : null}
      </div>
      <div className="mt-1 truncate text-xs text-muted-foreground">{hint}</div>
      {bar !== undefined ? <MeterBar ratio={bar} danger={barDanger} className="mt-3" /> : null}
    </div>
  );
}

function ServerCard({
  server: s,
  metrics,
}: {
  server: ServerRecord;
  metrics: ServerMetricsSnapshot | null;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: ['servers'] });
  const start = useMutation({ mutationFn: () => window.api.servers.start(s.id), onSettled: invalidate });
  const stop = useMutation({ mutationFn: () => window.api.servers.stop(s.id), onSettled: invalidate });
  const restart = useMutation({ mutationFn: () => window.api.servers.restart(s.id), onSettled: invalidate });

  const online = s.status === 'running';
  const busy = s.status === 'starting' || s.status === 'stopping' || s.status === 'updating';
  const cpu = metrics?.cpuPercent ?? 0;
  const ramPct = s.ramMaxMb ? (metrics?.memoryUsedMb ?? 0) / s.ramMaxMb : 0;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border/60 bg-secondary/50 p-4 transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-border hover:shadow-lg',
        !online && !busy && 'opacity-80 hover:opacity-100',
      )}
    >
      {/* regleta de estado */}
      <span
        className={cn(
          'absolute inset-y-0 left-0 w-[3px] opacity-0 transition-opacity',
          online && 'bg-[hsl(var(--success))] opacity-90',
          busy && 'bg-[hsl(var(--warning))] opacity-90',
        )}
      />

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/servers/${s.id}`)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span
            className={cn(
              'grid h-[42px] w-[42px] flex-none place-items-center rounded-lg font-display text-lg font-bold text-white',
              online && 'bg-gradient-to-br from-[hsl(263_90%_66%)] to-[hsl(258_80%_45%)] shadow-[0_8px_22px_hsl(261_83%_58%/0.35)]',
              busy && 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_8px_22px_rgba(217,119,6,0.34)]',
              !online && !busy && 'bg-accent text-muted-foreground',
            )}
          >
            {s.name[0]?.toUpperCase() ?? 'S'}
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="truncate font-display text-[15px] font-bold transition-colors group-hover:text-primary">
                {s.name}
              </span>
              <span className="text-[11px] text-muted-foreground/70">
                {LOADER_LABEL[s.loader]} {s.minecraftVersion}
              </span>
            </span>
            <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground/60">
              localhost:{s.port}
            </span>
          </span>
        </button>
        <div className="flex flex-none items-center gap-3">
          {online && metrics?.tps != null ? (
            <span className="text-[11px] text-muted-foreground">TPS {metrics.tps.toFixed(1)}</span>
          ) : null}
          <StatusPill status={s.status} />
        </div>
      </div>

      {/* métricas */}
      {online ? (
        <div className="mt-3.5 grid grid-cols-4 gap-4">
          <Metric label="CPU" value={`${cpu.toFixed(0)}%`}>
            <MeterBar ratio={cpu / 100} />
          </Metric>
          <Metric label="RAM" value={`${metrics?.memoryUsedMb ?? 0} MB`}>
            <MeterBar ratio={ramPct} danger={ramPct > 0.85} />
          </Metric>
          <Metric label="Jugadores" value={`${metrics?.playersOnline ?? 0}/${s.maxPlayers}`} plain />
          <Metric label="Puerto" value={String(s.port)} plain />
        </div>
      ) : null}

      {/* acciones al hover */}
      <div className="mt-0 flex max-h-0 items-center gap-2 overflow-hidden border-t border-transparent pt-0 opacity-0 transition-all duration-200 group-hover:mt-3 group-hover:max-h-16 group-hover:border-border/60 group-hover:pt-3 group-hover:opacity-100">
        {online ? (
          <>
            <Button size="sm" variant="outline" onClick={() => restart.mutate()} disabled={restart.isPending}>
              <RefreshCw className="h-3.5 w-3.5" /> Reiniciar
            </Button>
            <Button size="sm" variant="destructive" onClick={() => stop.mutate()} disabled={stop.isPending}>
              <Square className="h-3.5 w-3.5" /> Detener
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={() => start.mutate()} disabled={busy || start.isPending}>
            <Play className="h-3.5 w-3.5" /> Iniciar
          </Button>
        )}
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={() => navigate(`/servers/${s.id}/console`)}>
          <Terminal className="h-3.5 w-3.5" /> Consola
        </Button>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  children,
  plain,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
  plain?: boolean;
}) {
  return (
    <div className="flex flex-col gap-[7px]">
      <div className="flex items-baseline justify-between gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {label}
        </span>
        <span className="font-mono text-xs font-semibold">{value}</span>
      </div>
      {!plain ? children : null}
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-card p-5">
      <div className="h-3 w-20 animate-pulse rounded bg-secondary" />
      <div className="h-7 w-16 animate-pulse rounded bg-secondary" />
      <div className="h-3 w-28 animate-pulse rounded bg-secondary" />
    </div>
  );
}

function eventDot(kind: string): string {
  if (kind.startsWith('player')) return 'text-[hsl(var(--success))]';
  if (kind.includes('crash') || kind.includes('error')) return 'text-destructive';
  if (kind.includes('backup')) return 'text-[hsl(var(--info))]';
  return 'text-primary';
}
