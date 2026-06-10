import { useQuery } from '@tanstack/react-query';
import { Check, AlertTriangle } from 'lucide-react';
import {
  LOADERS,
  LOADER_LABEL,
  supportsMods,
  supportsPlugins,
  type Loader,
} from '../../../../shared/types/loader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { cn } from '../../../lib/cn';
import type { StepProps } from '../wizardState';

const LOADER_DESCRIPTIONS: Record<Loader, string> = {
  vanilla: 'Servidor oficial sin mods ni plugins. Compatibilidad máxima.',
  paper: 'Bifurcación de alto rendimiento de Spigot. Compatible con plugins Bukkit.',
  purpur: 'Fork de Paper con más opciones de configuración y mecánicas.',
  spigot: 'Servidor Bukkit clásico. Construido localmente con BuildTools.',
  bukkit: 'API de plugins original. Compilado con BuildTools.',
  forge: 'Loader de mods clásico. Inmensa librería para mods grandes.',
  neoforge: 'Continuación moderna de Forge mantenida por la comunidad.',
  fabric: 'Loader minimalista de mods. Ideal para optimización y modpacks ligeros.',
  quilt: 'Fork de Fabric con sistema de hooks extendido.',
  mohist: 'Híbrido Forge + Paper: mods y plugins al mismo tiempo.',
  arclight: 'Híbrido Forge/NeoForge + Bukkit. Más reciente que Mohist.',
  magma: 'Híbrido Forge + Spigot orientado a estabilidad.',
  sponge: 'Plataforma de plugins independiente con su propia API.',
};

export function StepLoader({ value, onChange }: StepProps) {
  const versions = useQuery({
    queryKey: ['mc-versions'],
    queryFn: () => window.api.versions.listMinecraft(),
  });
  const loaderVersions = useQuery({
    queryKey: ['loader-versions', value.loader, value.minecraftVersion],
    queryFn: () => window.api.versions.listLoader(value.loader, value.minecraftVersion),
    enabled: Boolean(value.loader && value.minecraftVersion),
  });

  const releaseOnly = versions.data?.filter((v) => v.type === 'release') ?? [];

  // La combinación loader+versión no existe (p. ej. NeoForge para 1.20.1):
  // el upstream no publica builds, así que avisamos antes de dejar continuar.
  const comboUnavailable =
    value.loader !== 'vanilla' &&
    Boolean(value.minecraftVersion) &&
    !loaderVersions.isLoading &&
    (loaderVersions.isError || (loaderVersions.data?.length ?? 0) === 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold">Elige el loader</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada loader tiene su propio ecosistema. Mostramos compatibilidad con plugins y mods.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {LOADERS.map((l) => {
          const selected = value.loader === l;
          return (
            <button
              key={l}
              onClick={() => onChange({ ...value, loader: l, loaderVersion: null })}
              className={cn(
                'group relative flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all hover:border-primary/40',
                selected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border/60 bg-card',
              )}
            >
              <div className="flex w-full items-center justify-between">
                <span className="font-medium">{LOADER_LABEL[l]}</span>
                {selected ? <Check className="h-4 w-4 text-primary" /> : null}
              </div>
              <span className="text-xs leading-snug text-muted-foreground">
                {LOADER_DESCRIPTIONS[l]}
              </span>
              <div className="mt-1 flex gap-1 text-[10px] text-muted-foreground">
                {supportsPlugins(l) ? <span className="rounded bg-muted px-1.5 py-0.5">plugins</span> : null}
                {supportsMods(l) ? <span className="rounded bg-muted px-1.5 py-0.5">mods</span> : null}
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Versión de Minecraft
          </label>
          <Select
            value={value.minecraftVersion}
            onValueChange={(v) => onChange({ ...value, minecraftVersion: v, loaderVersion: null })}
          >
            <SelectTrigger>
              <SelectValue placeholder={versions.isLoading ? 'Cargando…' : 'Seleccionar'} />
            </SelectTrigger>
            <SelectContent>
              {releaseOnly.slice(0, 60).map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {value.loader !== 'vanilla' ? (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Versión del loader (opcional)
            </label>
            <Select
              value={value.loaderVersion ?? ''}
              onValueChange={(v) => onChange({ ...value, loaderVersion: v || null })}
              disabled={!value.minecraftVersion || loaderVersions.isLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loaderVersions.isLoading
                      ? 'Cargando…'
                      : !value.minecraftVersion
                        ? 'Elige antes la versión de MC'
                        : 'Última estable'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {loaderVersions.data?.slice(0, 30).map((v) => (
                  <SelectItem key={v.version} value={v.version}>
                    {v.version} {v.stable ? '' : '(beta)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {comboUnavailable ? (
        <div className="flex items-start gap-3 rounded-xl border border-[hsl(var(--warning))]/35 bg-[hsl(var(--warning))]/10 p-3.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-[hsl(var(--warning))]" />
          <div className="text-[13px] leading-relaxed">
            <span className="font-semibold text-[hsl(var(--warning))]">
              {LOADER_LABEL[value.loader]} no está disponible para Minecraft {value.minecraftVersion}.
            </span>{' '}
            <span className="text-muted-foreground">
              Elige otra versión de Minecraft u otro loader compatible
              {value.loader === 'neoforge' ? ' (NeoForge existe desde 1.20.2; para 1.20.1 usa Forge)' : ''}.
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
