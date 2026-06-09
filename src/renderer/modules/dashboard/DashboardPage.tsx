import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Cpu, MemoryStick, Users, Activity } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useLiveMetrics } from '../monitoring/useLiveMetrics';
import { LOADER_LABEL } from '../../../shared/types/loader';
import type { ServerRecord } from '../../../shared/types/server';
import { useRecentEvents } from './useRecentEvents';

export function DashboardPage() {
  const servers = useQuery({
    queryKey: ['servers'],
    queryFn: () => window.api.servers.list(),
  });
  const system = useQuery({ queryKey: ['system'], queryFn: () => window.api.system.info() });
  const events = useRecentEvents();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Estado en tiempo real de tus servidores y eventos recientes."
        actions={
          <Button asChild>
            <Link to="/servers/new">
              <Plus className="h-4 w-4" />
              Nuevo servidor
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Servidores"
          value={String(servers.data?.length ?? 0)}
          hint={`${servers.data?.filter((s) => s.status === 'running').length ?? 0} en ejecución`}
        />
        <StatCard
          icon={<Cpu className="h-4 w-4" />}
          label="CPU del host"
          value={system.data?.cpuModel?.split(' ').slice(0, 2).join(' ') ?? '—'}
          hint={`${system.data?.cores ?? 0} núcleos`}
        />
        <StatCard
          icon={<MemoryStick className="h-4 w-4" />}
          label="RAM del host"
          value={system.data ? `${(system.data.totalRamMb / 1024).toFixed(1)} GB` : '—'}
          hint="Disponible total"
        />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Jugadores online"
          value="0"
          hint="A través de todos los servidores"
        />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Mis servidores</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link to="/servers/new">
                <Plus className="h-4 w-4" /> Añadir
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {servers.data?.length ? (
              servers.data.map((s) => <ServerRow key={s.id} server={s} />)
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
                Aún no tienes servidores. Crea el primero con el asistente.
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Últimos eventos</CardTitle>
            <CardDescription>Sucesos a lo largo de todos tus servidores.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {events.data?.length ? (
                events.data.slice(0, 12).map((e) => (
                  <li key={e.id} className="flex items-baseline gap-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {e.kind.split('.')[0]}
                    </span>
                    <span className="flex-1 truncate text-foreground">{e.message}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(e.ts).toLocaleTimeString()}
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-muted-foreground">Sin eventos.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          {icon}
        </div>
        <div className="mt-2 font-display text-2xl font-semibold tracking-tight">{value}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
}

function ServerRow({ server }: { server: ServerRecord }) {
  const metrics = useLiveMetrics(server.id);
  return (
    <Link
      to={`/servers/${server.id}`}
      className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 p-3 transition-colors hover:border-border hover:bg-accent/30"
    >
      <StatusBadge status={server.status} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{server.name}</span>
          <Badge variant="outline" className="font-mono text-[10px]">
            {LOADER_LABEL[server.loader]} {server.minecraftVersion}
          </Badge>
        </div>
        <div className="mt-0.5 flex gap-3 text-xs text-muted-foreground">
          <span>Puerto {server.port}</span>
          <span>RAM {server.ramMaxMb} MB</span>
          {metrics ? (
            <>
              <span>CPU {metrics.cpuPercent.toFixed(1)}%</span>
              <span>{metrics.memoryUsedMb} MB usados</span>
              <span>
                {metrics.playersOnline}/{metrics.playersMax} jugadores
              </span>
            </>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: 'success' | 'warning' | 'destructive' | 'default'; label: string }> = {
    running: { variant: 'success', label: 'Online' },
    starting: { variant: 'warning', label: 'Iniciando' },
    stopping: { variant: 'warning', label: 'Deteniendo' },
    updating: { variant: 'warning', label: 'Actualizando' },
    crashed: { variant: 'destructive', label: 'Caído' },
    stopped: { variant: 'default', label: 'Detenido' },
  };
  const meta = map[status] ?? map['stopped']!;
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}
