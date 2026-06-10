import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Play, Square, RefreshCw, Terminal, FolderOpen, Trash2, Archive } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatusPill } from '../../components/ui/status-pill';
import { MeterBar } from '../../components/ui/sparkline';
import { useLiveMetrics } from '../monitoring/useLiveMetrics';
import { LOADER_LABEL } from '../../../shared/types/loader';
import { cn } from '../../lib/cn';

export function ServerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const server = useQuery({
    queryKey: ['server', id],
    queryFn: () => window.api.servers.get(id!),
    enabled: Boolean(id),
    refetchInterval: 3000,
  });

  const metrics = useLiveMetrics(id ?? null);

  const start = useMutation({ mutationFn: () => window.api.servers.start(id!) });
  const stop = useMutation({ mutationFn: () => window.api.servers.stop(id!) });
  const restart = useMutation({ mutationFn: () => window.api.servers.restart(id!) });
  const remove = useMutation({
    mutationFn: () => window.api.servers.remove(id!, { deleteFiles: true }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['servers'] });
      navigate('/dashboard');
    },
  });
  const openFolder = () => {
    if (server.data) void window.api.system.openPath(server.data.directory);
  };

  if (!server.data) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
        Cargando servidor…
      </div>
    );
  }
  const s = server.data;
  const online = s.status === 'running';
  const cpu = metrics?.cpuPercent ?? 0;
  const ramPct = s.ramMaxMb ? (metrics?.memoryUsedMb ?? 0) / s.ramMaxMb : 0;

  return (
    <>
      {/* ===== Cabecera ===== */}
      <div className="mb-6 flex items-center gap-4">
        <span
          className={cn(
            'grid h-14 w-14 flex-none place-items-center rounded-xl font-display text-2xl font-bold text-white',
            online
              ? 'bg-gradient-to-br from-[hsl(263_90%_66%)] to-[hsl(258_80%_45%)] shadow-[0_8px_28px_hsl(261_83%_58%/0.4)]'
              : 'bg-accent text-muted-foreground',
          )}
        >
          {s.name[0]?.toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="truncate font-display text-2xl font-bold tracking-tight">{s.name}</h1>
            <StatusPill status={s.status} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
            <span>
              {LOADER_LABEL[s.loader]} · Minecraft {s.minecraftVersion}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="font-mono text-muted-foreground/60">localhost:{s.port}</span>
          </div>
        </div>
        <div className="flex flex-none items-center gap-2.5">
          {online ? (
            <>
              <Button variant="outline" onClick={() => restart.mutate()} disabled={restart.isPending}>
                <RefreshCw className="h-4 w-4" /> Reiniciar
              </Button>
              <Button variant="destructive" onClick={() => stop.mutate()} disabled={stop.isPending}>
                <Square className="h-4 w-4" /> Detener
              </Button>
            </>
          ) : (
            <Button onClick={() => start.mutate()} disabled={s.status === 'starting' || start.isPending}>
              <Play className="h-4 w-4" /> Iniciar
            </Button>
          )}
        </div>
      </div>

      {/* ===== Stats ===== */}
      <section className="grid gap-3.5 sm:grid-cols-4">
        <StatCard
          label="TPS"
          value={online && metrics?.tps != null ? metrics.tps.toFixed(1) : '—'}
          good={online}
        />
        <StatCard label="CPU" value={online ? `${cpu.toFixed(1)}%` : '—'} bar={online ? cpu / 100 : undefined} />
        <StatCard
          label="RAM"
          value={online ? `${metrics?.memoryUsedMb ?? 0} MB` : `${s.ramMinMb}–${s.ramMaxMb} MB`}
          hint={online ? `de ${s.ramMaxMb} MB` : undefined}
          bar={online ? ramPct : undefined}
          barDanger={ramPct > 0.85}
        />
        <StatCard label="Jugadores" value={`${metrics?.playersOnline ?? 0}/${s.maxPlayers}`} />
      </section>

      {/* ===== Paneles ===== */}
      <section className="mt-5 grid items-start gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
          <h3 className="mb-3 font-display text-lg font-semibold">Detalles</h3>
          <InfoRow k="Directorio" v={s.directory} mono />
          <InfoRow k="Mundo" v={s.worldName} />
          <InfoRow k="Autenticación" v={s.authMode === 'premium' ? 'Premium (online)' : 'Offline'} />
          <InfoRow k="Java" v={s.javaPath ?? '—'} mono />
          <InfoRow k="Java major" v={String(s.javaMajor)} />
          <InfoRow k="RCON" v={s.rconPort ? `Puerto ${s.rconPort}` : 'Deshabilitado'} />
          <InfoRow k="MOTD" v={s.motd} />
          <InfoRow k="Dificultad" v={s.difficulty} />
          <InfoRow k="Modo de juego" v={s.gamemode} />
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
            <h3 className="mb-3 font-display text-lg font-semibold">Atajos</h3>
            <div className="flex flex-col gap-2">
              <Button asChild variant="outline">
                <Link to={`/servers/${s.id}/console`}>
                  <Terminal className="h-4 w-4" /> Abrir consola
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={`/servers/${s.id}/backups`}>
                  <Archive className="h-4 w-4" /> Backups
                </Link>
              </Button>
              <Button variant="outline" onClick={openFolder}>
                <FolderOpen className="h-4 w-4" /> Abrir carpeta
              </Button>
            </div>
          </div>

          {/* zona de peligro */}
          <div className="rounded-2xl border border-destructive/30 bg-destructive/[0.04] p-5">
            <div className="mb-1 font-display font-bold text-destructive">Zona de peligro</div>
            <p className="mb-4 text-[13px] text-muted-foreground">
              Elimina el servidor y todos sus archivos del disco. Esta acción no se puede deshacer.
            </p>
            <Button
              variant="outline"
              className="border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
            >
              <Trash2 className="h-4 w-4" /> Eliminar servidor
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function StatCard({
  label,
  value,
  hint,
  bar,
  barDanger,
  good,
}: {
  label: string;
  value: string;
  hint?: string;
  bar?: number;
  barDanger?: boolean;
  good?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft transition-all duration-200 hover:border-primary/25">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={cn('mt-1.5 font-mono text-xl font-semibold', good && 'text-[hsl(var(--success))]')}>
        {value}
      </div>
      {hint ? <div className="mt-0.5 text-[11px] text-muted-foreground/60">{hint}</div> : null}
      {bar !== undefined ? <MeterBar ratio={bar} danger={barDanger} className="mt-2.5" /> : null}
    </div>
  );
}

function InfoRow({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 py-[9px] last:border-b-0">
      <span className="flex-none text-[13px] text-muted-foreground">{k}</span>
      <span
        className={cn('min-w-0 truncate text-right text-[13px] font-semibold', mono && 'font-mono text-xs')}
      >
        {v}
      </span>
    </div>
  );
}
