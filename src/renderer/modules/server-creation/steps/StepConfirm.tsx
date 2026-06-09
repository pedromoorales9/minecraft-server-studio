import { LOADER_LABEL } from '../../../../shared/types/loader';
import { Progress } from '../../../components/ui/progress';
import type { ServerProvisioningProgress } from '../../../../shared/types/server';
import type { StepProps } from '../wizardState';

interface Props extends StepProps {
  creating: boolean;
  progress: ServerProvisioningProgress | null;
  error: string | null;
}

export function StepConfirm({ value, onChange, creating, progress, error }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold">Revisa y confirma</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cuando aceptes el EULA y pulses crear, descargaremos Java, el jar del loader y
          generaremos la configuración.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Summary label="Loader" value={`${LOADER_LABEL[value.loader]} · ${value.minecraftVersion}${value.loaderVersion ? ` · build ${value.loaderVersion}` : ''}`} />
        <Summary label="Autenticación" value={value.authMode === 'premium' ? 'Premium' : 'Offline'} />
        <Summary label="Nombre" value={value.name || '—'} />
        <Summary label="Puerto" value={String(value.port)} />
        <Summary label="RAM" value={`${value.ramMinMb}–${value.ramMaxMb} MB`} />
        <Summary label="Mundo" value={value.worldName} />
        <Summary label="Contenido" value={value.contentMode} />
        <Summary label="Jugadores máx." value={String(value.maxPlayers)} />
      </div>

      <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-border/60 bg-card p-4 text-sm">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={value.eulaAccepted}
          onChange={(e) => onChange({ ...value, eulaAccepted: e.target.checked })}
        />
        <span>
          He leído y acepto el{' '}
          <a
            className="text-primary underline-offset-2 hover:underline"
            href="https://aka.ms/MinecraftEULA"
            target="_blank"
            rel="noreferrer"
          >
            EULA de Mojang
          </a>{' '}
          en nombre de los administradores y jugadores de este servidor.
        </span>
      </label>

      {creating ? (
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between text-sm">
            <span>{progress?.message ?? 'Inicializando…'}</span>
            <span className="text-muted-foreground">
              {Math.round((progress?.progress ?? 0) * 100)}%
            </span>
          </div>
          <Progress value={(progress?.progress ?? 0) * 100} className="mt-2" />
          {progress?.detail ? (
            <p className="mt-2 text-xs text-muted-foreground">{progress.detail}</p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}
