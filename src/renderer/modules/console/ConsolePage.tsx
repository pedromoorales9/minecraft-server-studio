import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Send, Filter, Download, Search } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { cn } from '../../lib/cn';
import type { LogLine, LogLevel } from '../../../shared/types/console';

const LEVELS: LogLevel[] = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
const LEVEL_COLOR: Record<LogLevel, string> = {
  INFO: 'text-foreground',
  WARN: 'text-[hsl(var(--warning))]',
  ERROR: 'text-destructive',
  DEBUG: 'text-muted-foreground',
  TRACE: 'text-muted-foreground/60',
  FATAL: 'text-destructive font-semibold',
  STDOUT: 'text-muted-foreground',
};

export function ConsolePage() {
  const { id } = useParams<{ id: string }>();
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [filter, setFilter] = useState<Set<LogLevel>>(new Set(LEVELS));
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendCmd = useMutation({
    mutationFn: (cmd: string) => window.api.servers.sendCommand(id!, cmd),
  });

  useEffect(() => {
    if (!id) return;
    const off = window.api.servers.onLog((line) => {
      if (line.serverId !== id) return;
      setLogs((prev) => {
        // Keep a hard cap; older lines get dropped to prevent unbounded memory.
        const next = prev.length > 5000 ? prev.slice(prev.length - 4800) : prev;
        return [...next, line];
      });
    });
    return off;
  }, [id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [logs.length]);

  const visible = useMemo(() => {
    const re = search ? new RegExp(escapeRegex(search), 'i') : null;
    return logs.filter((l) => {
      if (!filter.has(l.level === 'STDOUT' ? 'INFO' : (l.level as LogLevel))) return false;
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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    sendCmd.mutate(draft);
    setDraft('');
  }

  return (
    <>
      <PageHeader title="Consola" description="Logs en vivo con filtros y comandos." />

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar en logs…"
                className="h-8 pl-7 text-sm"
              />
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              {LEVELS.map((lvl) => {
                const active = filter.has(lvl);
                return (
                  <button
                    key={lvl}
                    onClick={() => toggle(lvl)}
                    className={cn(
                      'rounded-full border px-2 py-0.5 transition-colors',
                      active
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-border/60 text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
            <div className="flex-1" />
            <Button size="sm" variant="outline" onClick={exportLogs}>
              <Download className="h-4 w-4" /> Exportar
            </Button>
          </div>

          <div
            ref={scrollRef}
            className="h-[480px] overflow-y-auto rounded-lg border border-border/60 bg-[#0b0b0d] p-3 font-mono text-[12px] leading-relaxed text-foreground scrollbar-thin"
          >
            {visible.length === 0 ? (
              <div className="text-muted-foreground">Sin líneas. El servidor podría estar detenido.</div>
            ) : (
              visible.map((l) => (
                <div key={l.sequence} className={cn('whitespace-pre-wrap break-all', LEVEL_COLOR[l.level])}>
                  <span className="mr-2 text-muted-foreground">
                    [{new Date(l.timestamp).toLocaleTimeString()}]
                  </span>
                  {l.thread ? <span className="text-muted-foreground">[{l.thread}/{l.level}] </span> : null}
                  {l.message}
                </div>
              ))
            )}
          </div>

          <form onSubmit={submit} className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Escribe un comando: say hola, op pedro, weather clear…"
              className="font-mono"
            />
            <Button type="submit" disabled={sendCmd.isPending}>
              <Send className="h-4 w-4" /> Enviar
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
