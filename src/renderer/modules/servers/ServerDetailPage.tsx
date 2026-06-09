import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Play, Square, RefreshCw, Terminal, FolderOpen, Trash2, Archive } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useLiveMetrics } from '../monitoring/useLiveMetrics';
import { LOADER_LABEL } from '../../../shared/types/loader';

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

  return (
    <>
      <PageHeader
        title={s.name}
        description={`${LOADER_LABEL[s.loader]} · Minecraft ${s.minecraftVersion} · Puerto ${s.port}`}
        actions={
          <div className="flex gap-2">
            {s.status === 'running' ? (
              <>
                <Button variant="outline" onClick={() => restart.mutate()}>
                  <RefreshCw className="h-4 w-4" /> Reiniciar
                </Button>
                <Button variant="destructive" onClick={() => stop.mutate()}>
                  <Square className="h-4 w-4" /> Detener
                </Button>
              </>
            ) : (
              <Button onClick={() => start.mutate()} disabled={s.status === 'starting'}>
                <Play className="h-4 w-4" /> Iniciar
              </Button>
            )}
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-4">
        <Stat label="Estado" value={s.status} />
        <Stat label="CPU" value={metrics ? `${metrics.cpuPercent.toFixed(1)}%` : '—'} />
        <Stat
          label="RAM"
          value={metrics ? `${metrics.memoryUsedMb} / ${s.ramMaxMb} MB` : `${s.ramMinMb}–${s.ramMaxMb} MB`}
        />
        <Stat
          label="Jugadores"
          value={metrics ? `${metrics.playersOnline}/${s.maxPlayers}` : `0/${s.maxPlayers}`}
        />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Detalles</CardTitle>
            <CardDescription>Configuración persistida en SQLite y archivos.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Row k="Directorio" v={s.directory} mono />
              <Row k="World" v={s.worldName} />
              <Row k="Autenticación" v={s.authMode} />
              <Row k="Java" v={s.javaPath ?? '—'} mono />
              <Row k="Java major" v={String(s.javaMajor)} />
              <Row k="RCON" v={s.rconPort ? `Puerto ${s.rconPort}` : 'Deshabilitado'} />
              <Row k="MOTD" v={s.motd} />
              <Row k="Difficulty" v={s.difficulty} />
              <Row k="Gamemode" v={s.gamemode} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atajos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
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
            <Button variant="destructive" onClick={() => remove.mutate()}>
              <Trash2 className="h-4 w-4" /> Eliminar servidor
            </Button>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 font-display text-xl font-semibold capitalize">{value}</div>
      </CardContent>
    </Card>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className={mono ? 'truncate font-mono text-xs' : 'truncate'}>{v}</dd>
    </>
  );
}

void Badge; // suppress unused import lint when stat helper is removed
