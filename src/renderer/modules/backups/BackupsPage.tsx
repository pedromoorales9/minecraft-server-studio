import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RotateCcw, Trash2, Clock } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { useState } from 'react';

export function BackupsPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const backups = useQuery({
    queryKey: ['backups', id],
    queryFn: () => window.api.backups.list(id!),
  });
  const schedule = useQuery({
    queryKey: ['backup-schedule', id],
    queryFn: () => window.api.backups.getSchedule(id!),
  });

  const create = useMutation({
    mutationFn: () => window.api.backups.create({ serverId: id! }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backups', id] }),
  });
  const restore = useMutation({
    mutationFn: (backupId: string) => window.api.backups.restore({ backupId }),
  });
  const remove = useMutation({
    mutationFn: (backupId: string) => window.api.backups.remove({ backupId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backups', id] }),
  });

  const [cron, setCron] = useState(schedule.data?.cron ?? '0 4 * * *');
  const [retention, setRetention] = useState(schedule.data?.retention ?? 7);
  const [enabled, setEnabled] = useState(schedule.data?.enabled ?? false);

  const saveSchedule = useMutation({
    mutationFn: () =>
      window.api.backups.schedule({ serverId: id!, enabled, cron, retention }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backup-schedule', id] }),
  });

  return (
    <>
      <PageHeader
        title="Backups"
        description="Snapshots comprimidos (tar.gz) verificados con SHA-256."
        actions={
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            <Plus className="h-4 w-4" /> Nuevo backup
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Programación</CardTitle>
          <CardDescription>
            Expresiones cron (formato estándar). Ejemplos: <code className="font-mono">0 4 * * *</code> (cada día a las 4am),
            <code className="font-mono"> */30 * * * *</code> (cada 30 minutos).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Activar
          </label>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted-foreground">Cron</label>
            <Input
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              className="font-mono"
              disabled={!enabled}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Retención</label>
            <Input
              type="number"
              min={1}
              max={365}
              value={retention}
              onChange={(e) => setRetention(Number(e.target.value) || 7)}
              disabled={!enabled}
            />
          </div>
          <div className="sm:col-span-4">
            <Button onClick={() => saveSchedule.mutate()} disabled={saveSchedule.isPending}>
              <Clock className="h-4 w-4" /> Guardar programación
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border/60">
          {backups.data?.length ? (
            backups.data.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{new Date(b.createdAt).toLocaleString()}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {b.trigger}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {(b.sizeBytes / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                  <div className="truncate text-xs font-mono text-muted-foreground">{b.sha256.slice(0, 24)}…</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => restore.mutate(b.id)}>
                    <RotateCcw className="h-4 w-4" /> Restaurar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove.mutate(b.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">Aún no hay backups.</div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
