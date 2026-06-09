import { Check, Boxes, Puzzle, Layers, Ban } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { supportsMods, supportsPlugins } from '../../../../shared/types/loader';
import type { StepProps } from '../wizardState';
import type { ServerContentMode } from '../../../../shared/types/server';

const OPTIONS: Array<{
  key: ServerContentMode;
  label: string;
  description: string;
  icon: typeof Ban;
}> = [
  { key: 'none', label: 'Sin mods ni plugins', description: 'Vanilla puro. Más rápido y compatible.', icon: Ban },
  { key: 'plugins', label: 'Solo plugins', description: 'Carga plugins desde Modrinth, Hangar o Spigot.', icon: Puzzle },
  { key: 'mods', label: 'Solo mods', description: 'Modifica la jugabilidad con mods (Forge/Fabric).', icon: Boxes },
  { key: 'plugins+mods', label: 'Mods + plugins', description: 'Para Mohist/Arclight/Magma (híbridos).', icon: Layers },
];

export function StepContent({ value, onChange }: StepProps) {
  const filtered = OPTIONS.filter((o) => {
    if (o.key === 'plugins' && !supportsPlugins(value.loader)) return false;
    if (o.key === 'mods' && !supportsMods(value.loader)) return false;
    if (o.key === 'plugins+mods' && !(supportsPlugins(value.loader) && supportsMods(value.loader)))
      return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">¿Qué quieres ejecutar?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          El instalador prepara las carpetas {`plugins/ y mods/`} según tu elección y el loader.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((o) => {
          const Icon = o.icon;
          const selected = value.contentMode === o.key;
          return (
            <button
              key={o.key}
              onClick={() => onChange({ ...value, contentMode: o.key })}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-4 text-left transition-all hover:border-primary/40',
                selected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border/60 bg-card',
              )}
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-muted">
                <Icon className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{o.label}</span>
                  {selected ? <Check className="h-4 w-4 text-primary" /> : null}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{o.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
