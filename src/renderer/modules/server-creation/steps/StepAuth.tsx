import { Check, ShieldCheck, ShieldAlert } from 'lucide-react';
import { cn } from '../../../lib/cn';
import type { StepProps } from '../wizardState';

export function StepAuth({ value, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">Autenticación</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Determina si Mojang valida la cuenta de los jugadores antes de unirse.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <AuthCard
          selected={value.authMode === 'premium'}
          onClick={() => onChange({ ...value, authMode: 'premium' })}
          title="Premium"
          subtitle="online-mode=true"
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="ok"
          body={[
            'Solo cuentas oficiales de Mojang/Microsoft.',
            'Skins y nombres verificados por Mojang.',
            'Modo recomendado salvo que sepas lo que haces.',
          ]}
        />
        <AuthCard
          selected={value.authMode === 'offline'}
          onClick={() => onChange({ ...value, authMode: 'offline' })}
          title="No premium"
          subtitle="online-mode=false"
          icon={<ShieldAlert className="h-5 w-5" />}
          tone="warn"
          body={[
            'Acepta cualquier nombre de usuario; útil para LAN o test.',
            'Riesgo de suplantación de identidad. No expongas a internet.',
            'Geyser/Floodgate normalmente requieren este modo.',
          ]}
        />
      </div>
    </div>
  );
}

function AuthCard({
  selected,
  onClick,
  title,
  subtitle,
  icon,
  body,
  tone,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  body: string[];
  tone: 'ok' | 'warn';
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all hover:border-primary/40',
        selected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border/60 bg-card',
      )}
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'grid h-8 w-8 place-items-center rounded-lg',
              tone === 'ok' ? 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]' : 'bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]',
            )}
          >
            {icon}
          </span>
          <div>
            <div className="font-medium">{title}</div>
            <div className="font-mono text-xs text-muted-foreground">{subtitle}</div>
          </div>
        </div>
        {selected ? <Check className="h-4 w-4 text-primary" /> : null}
      </div>
      <ul className="ml-1 list-inside list-disc space-y-1 text-xs text-muted-foreground">
        {body.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </button>
  );
}
