import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Send, Download, Search, ChevronDown, X, Square, Save } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatusPill } from '../../components/ui/status-pill';
import { MeterBar } from '../../components/ui/sparkline';
import { useLiveMetrics } from '../monitoring/useLiveMetrics';
import { cn } from '../../lib/cn';
import type { LogLine, LogLevel } from '../../../shared/types/console';

const FILTERS: Array<{ key: LogLevel; dot: string }> = [
  { key: 'INFO', dot: 'bg-[hsl(var(--info))]' },
  { key: 'WARN', dot: 'bg-[hsl(var(--warning))]' },
  { key: 'ERROR', dot: 'bg-destructive' },
  { key: 'DEBUG', dot: 'bg-muted-foreground' },
];

const ROW_COLOR: Partial<Record<LogLevel, { thread: string; msg: string }>> = {
  WARN: { thread: 'text-[hsl(var(--warning))]', msg: 'text-[#e9c46a]' },
  ERROR: { thread: 'text-destructive', msg: 'text-[#f4a2a2]' },
  FATAL: { thread: 'text-destructive', msg: 'text-[#f4a2a2] font-semibold' },
  DEBUG: { thread: 'text-muted-foreground/60', msg: 'text-muted-foreground/70' },
};

const QUICK = ['list', 'save-all', 'time set day', 'weather clear', 'difficulty normal', 'help'];

export function ConsolePage() {
  const { id } = useParams<{ id: string }>();
  const server = useQuery({
    queryKey: ['server', id],
    queryFn: () => window.api.servers.get(id!),
    enabled: Boolean(id),
    refetchInterval: 3000,
  });
  const metrics = useLiveMetrics(id ?? null);

  const [logs, setLogs] = useState<LogLine[]>([]);
  const [filter, setFilter] = useState<Set<LogLevel>>(new Set(FILTERS.map((f) => f.key)));
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [autoscroll, setAutoscroll] = useState(true);
  const [atBottom, setAtBottom] = useState(true);
  const [history, setHistory] = useState<string[]>([]);
  const [, setHistIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendCmd = useMutation({
    mutationFn: (cmd: string) => window.api.servers.sendCommand(id!, cmd),
  });
  const stop = useMutation({ mutationFn: () => window.api.servers.stop(id!) });

  useEffect(() => {
    if (!id) return;
    const off = window.api.servers.onLog((line) => {
      if (line.serverId !== id) return;
      setLogs((prev) => {
        const next = prev.length > 5000 ? prev.slice(prev.length - 4800) : prev;
        return [...next, line];
      });
    });
    return off;
  }, [id]);

  useEffect(() => {
    if (autoscroll) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [logs.length, autoscroll]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAtBottom(bottom);
    if (bottom && !autoscroll) setAutoscroll(true);
    if (!bottom && autoscroll) setAutoscroll(false);
  }
  function jumpBottom() {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    setAutoscroll(true);
  }

  const visible = useMemo(() => {
    const re = search ? new RegExp(escapeRegex(search), 'i') : null;
    return logs.filter((l) => {
      const lvl = l.level === 'STDOUT' || l.level === 'TRACE' ? 'INFO' : l.level;
      if (lvl !== 'FATAL' && !filter.has(lvl as LogLevel)) return false;
      if (re && !re.test(l.message) && !re.test(l.thread ?? '')) return false;
      return true;
    });
  }, [logs, filter, search]);

  function toggle(level: LogLevel) {
    setFilter((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }

  function exportLogs() {
    const text = logs.map((l) => l.raw).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${id}-console-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function run(raw: string) {
    const cmd = raw.trim();
    if (!cmd) return;
    sendCmd.mutate(cmd);
    setHistory((h) => [cmd, ...h].slice(0, 40));
    setHistIdx(-1);
    setDraft('');
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      run(draft);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHistIdx((i) => {
        const n = Math.min(history.length - 1, i + 1);
        if (history[n] != null) setDraft(history[n]!);
        return n;
      });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHistIdx((i) => {
        const n = Math.max(-1, i - 1);
        setDraft(n === -1 ? '' : (history[n] ?? ''));
        return n;
      });
    }
  }

  const s = server.data;
  const online = s?.status === 'running';
  const ramPct = s?.ramMaxMb ? (metrics?.memoryUsedMb ?? 0) / s.ramMaxMb : 0;
  const uptime =
    s?.lastStartedAt && online ? fmtUptime(Date.now() - new Date(s.lastStartedAt).getTime()) : '—';

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_300px]">
      {/* ===== Consola ===== */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft">
        {/* cabecera */}
        <div className="flex items-center gap-3.5 border-b border-border/60 px-4 py-3.5">
          <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-lg bg-gradient-to-br from-[hsl(263_90%_66%)] to-[hsl(258_80%_45%)] font-display text-[15px] font-bold text-white">
            {s?.name[0]?.toUpperCase() ?? 'S'}
          </span>
          <div className="min-w-0">
            <div className="truncate font-display text-[15px] font-bold">{s?.name ?? '…'}</div>
            <div className="font-mono text-[11px] text-muted-foreground/60">
              localhost:{s?.port ?? '—'}
            </div>
          </div>
          {s ? <StatusPill status={s.status} /> : null}
          <div className="flex-1" />
          <Button size="sm" variant="outline" disabled={!online} onClick={() => run('save-all')}>
            <Save className="h-3.5 w-3.5" /> Guardar
          </Button>
          <Button size="sm" variant="destructive" disabled={!online} onClick={() => stop.mutate()}>
            <Square className="h-3.5 w-3.5" /> Detener
          </Button>
        </div>

        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border/60 bg-secondary/50 px-4 py-2.5">
          <div className="flex gap-1.5">
            {FILTERS.map((f) => {
              const on = filter.has(f.key);
              return (
                <button
                  key={f.key}
                  onClick={() => toggle(f.key)}
                  className={cn(
                    'inline-flex h-[26px] items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold transition-all',
                    on
                      ? 'border-border text-foreground'
                      : 'border-border/60 text-muted-foreground/50 opacity-50',
                  )}
                >
                  <span className={cn('h-[7px] w-[7px] rounded-full', f.dot)} />
                  {f.key}
                </button>
              );
            })}
          </div>
          <div className="flex-1" />
          <div className="flex h-[30px] w-[200px] items-center gap-1.5 rounded-lg border border-border bg-card px-3">
            <Search className="h-3.5 w-3.5 flex-none text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar…"
              className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/60"
            />
          </div>
          <IconBtn
            title="Auto-scroll"
            on={autoscroll}
            onClick={() => (autoscroll ? setAutoscroll(false) : jumpBottom())}
          >
            <ChevronDown className="h-4 w-4" />
          </IconBtn>
          <IconBtn title="Descargar log" onClick={exportLogs}>
            <Download className="h-3.5 w-3.5" />
          </IconBtn>
          <IconBtn title="Limpiar" onClick={() => setLogs([])}>
            <X className="h-3.5 w-3.5" />
          </IconBtn>
        </div>

        {/* log */}
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="h-[440px] overflow-y-auto bg-[#0b0b11] px-4 py-3.5 font-mono text-[12.5px] leading-[1.65] scrollbar-thin"
          >
            {visible.length === 0 ? (
              <div className="text-muted-foreground/60">
                Sin líneas. {online ? 'Esperando actividad…' : 'El servidor está detenido.'}
              </div>
            ) : (
              visible.map((l) => {
                const c = ROW_COLOR[l.level];
                return (
                  <div key={l.sequence} className="flex gap-2 whitespace-pre-wrap break-words py-px">
                    <span className="flex-none text-[#4f4f5e]">
                      {new Date(l.timestamp).toLocaleTimeString([], { hour12: false })}
                    </span>
                    {l.thread ? (
                      <span className={cn('flex-none', c?.thread ?? 'text-[#6a6a7a]')}>
                        [{l.thread}/{l.level}]:
                      </span>
                    ) : null}
                    <span className={c?.msg ?? 'text-[#b9b9c6]'}>{l.message}</span>
                  </div>
                );
              })
            )}
          </div>
          {!atBottom ? (
            <button
              onClick={jumpBottom}
              className="absolute bottom-3.5 left-1/2 inline-flex h-[30px] -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-3.5 text-xs font-semibold text-white shadow-lg"
            >
              <ChevronDown className="h-3.5 w-3.5" /> Saltar al final
            </button>
          ) : null}
        </div>

        {/* barra de comandos */}
        <div className="border-t border-border/60 bg-secondary/50 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[15px] font-bold text-primary">&gt;</span>
            <input
              value={draft}
              disabled={!online}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={
                online
                  ? 'Escribe un comando…  (prueba list, say hola, help)'
                  : 'El servidor está detenido'
              }
              className="h-10 flex-1 rounded-lg border border-border bg-card px-3.5 font-mono text-[13px] text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)] disabled:opacity-50"
            />
            <Button disabled={!online || !draft.trim() || sendCmd.isPending} onClick={() => run(draft)}>
              <Send className="h-4 w-4" /> Enviar
            </Button>
          </div>
        </div>
      </div>

      {/* ===== Rail ===== */}
      <div className="flex flex-col gap-3.5">
        <RailCard title="Estado">
          <RailStat k="TPS" v={online && metrics?.tps != null ? metrics.tps.toFixed(1) : '—'} accent={online} />
          <div>
            <RailStat k="CPU" v={online ? `${(metrics?.cpuPercent ?? 0).toFixed(0)}%` : '—'} />
            <MeterBar ratio={online ? (metrics?.cpuPercent ?? 0) / 100 : 0} className="mt-1" />
          </div>
          <div className="mt-2">
            <RailStat k="RAM" v={online ? `${metrics?.memoryUsedMb ?? 0}/${s?.ramMaxMb} MB` : '—'} />
            <MeterBar ratio={online ? ramPct : 0} danger={ramPct > 0.85} className="mt-1" />
          </div>
          <RailStat k="Uptime" v={uptime} className="mt-2" />
        </RailCard>

        <RailCard title={`Jugadores · ${metrics?.playersOnline ?? 0}/${s?.maxPlayers ?? '—'}`}>
          {online && (metrics?.playersOnline ?? 0) > 0 ? (
            <div className="py-1 text-xs text-muted-foreground">
              {metrics!.playersOnline} jugador{metrics!.playersOnline === 1 ? '' : 'es'} conectado
              {metrics!.playersOnline === 1 ? '' : 's'}. Usa{' '}
              <code className="font-mono text-primary">list</code> para ver nombres.
            </div>
          ) : (
            <div className="py-3 text-center text-xs text-muted-foreground/60">
              Sin jugadores conectados
            </div>
          )}
        </RailCard>

        <RailCard title="Comandos rápidos">
          <div className="flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <button
                key={q}
                disabled={!online}
                onClick={() => run(q)}
                className="h-7 rounded-lg border border-border bg-secondary px-2.5 font-mono text-[11.5px] text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:opacity-40"
              >
                /{q}
              </button>
            ))}
          </div>
        </RailCard>
      </div>
    </div>
  );
}

function RailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
      <div className="mb-3 font-display text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
        {title}
      </div>
      {children}
    </div>
  );
}

function RailStat({
  k,
  v,
  accent,
  className,
}: {
  k: string;
  v: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between py-[7px]', className)}>
      <span className="text-xs text-muted-foreground">{k}</span>
      <span className={cn('font-mono text-sm font-semibold', accent && 'text-[hsl(var(--success))]')}>
        {v}
      </span>
    </div>
  );
}

function IconBtn({
  children,
  title,
  on,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  on?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        'grid h-[30px] w-[30px] place-items-center rounded-lg border transition-all',
        on
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border bg-card text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function fmtUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
