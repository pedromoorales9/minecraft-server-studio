import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../app/ThemeProvider';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Button } from '../../components/ui/button';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const system = useQuery({ queryKey: ['system'], queryFn: () => window.api.system.info() });

  return (
    <>
      <PageHeader title="Ajustes" description="Preferencias globales de la aplicación." />

      <Card>
        <CardHeader>
          <CardTitle>Apariencia</CardTitle>
          <CardDescription>Modo claro, oscuro o el del sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <Select value={theme} onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Claro</SelectItem>
                <SelectItem value="dark">Oscuro</SelectItem>
                <SelectItem value="system">Sistema</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Plataforma</dt>
            <dd>
              {system.data?.platform}/{system.data?.arch}
            </dd>
            <dt className="text-muted-foreground">CPU</dt>
            <dd>{system.data?.cpuModel}</dd>
            <dt className="text-muted-foreground">Núcleos</dt>
            <dd>{system.data?.cores}</dd>
            <dt className="text-muted-foreground">RAM total</dt>
            <dd>{system.data ? `${(system.data.totalRamMb / 1024).toFixed(1)} GB` : '—'}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Importar servidor existente</CardTitle>
          <CardDescription>
            Selecciona una carpeta con un servidor instalado para adoptarlo en el Studio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={async () => {
              const dir = await window.api.system.pickDirectory();
              if (dir) await window.api.servers.importExisting(dir);
            }}
          >
            Elegir carpeta…
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
