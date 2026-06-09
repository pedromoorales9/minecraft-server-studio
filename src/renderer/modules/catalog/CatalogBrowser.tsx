import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Download, Trash2, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { LOADER_LABEL } from '../../../shared/types/loader';
import type { CatalogEntry, InstalledExtension } from '../../../shared/types/plugin';

interface Props {
  serverId: string;
  kind: 'plugin' | 'mod';
}

const POPULAR_PLUGINS = [
  'EssentialsX',
  'LuckPerms',
  'WorldEdit',
  'WorldGuard',
  'Vault',
  'CoreProtect',
  'Citizens',
  'Dynmap',
  'ViaVersion',
  'ProtocolLib',
  'LiteBans',
  'PlaceholderAPI',
  'DecentHolograms',
  'Geyser',
  'Floodgate',
];
const POPULAR_MODS = [
  'Sodium',
  'Lithium',
  'Iris',
  'JEI',
  'Create',
  'JourneyMap',
  "Xaero's Minimap",
  'Applied Energistics 2',
  'Mekanism',
  'Botania',
  'Biomes O Plenty',
  'Industrial Foregoing',
];

export function CatalogBrowser({ serverId, kind }: Props) {
  const [query, setQuery] = useState('');
  const qc = useQueryClient();

  const server = useQuery({ queryKey: ['server', serverId], queryFn: () => window.api.servers.get(serverId) });
  const installed = useQuery({
    queryKey: ['installed', serverId],
    queryFn: () => window.api.catalog.listInstalled(serverId),
    refetchInterval: 5000,
  });
  const search = useQuery({
    queryKey: ['catalog', kind, query, server.data?.loader, server.data?.minecraftVersion],
    queryFn: () =>
      window.api.catalog.search({
        kind,
        query,
        loader: server.data?.loader,
        gameVersion: server.data?.minecraftVersion,
        limit: 30,
      }),
    enabled: Boolean(server.data),
  });

  const install = useMutation({
    mutationFn: async (entry: CatalogEntry) => {
      const versions = await window.api.catalog.versions({
        source: entry.source,
        projectId: entry.projectId,
        loader: server.data?.loader,
        gameVersion: server.data?.minecraftVersion,
      });
      const v = versions[0];
      if (!v) throw new Error('No compatible version found');
      return window.api.catalog.install({
        serverId,
        source: entry.source,
        projectId: entry.projectId,
        versionId: v.versionId,
        kind,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['installed', serverId] }),
  });

  const uninstall = useMutation({
    mutationFn: (ext: InstalledExtension) =>
      window.api.catalog.uninstall({ serverId, installedId: ext.id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['installed', serverId] }),
  });

  const update = useMutation({
    mutationFn: (ext: InstalledExtension) =>
      window.api.catalog.update({ serverId, installedId: ext.id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['installed', serverId] }),
  });

  const popular = kind === 'plugin' ? POPULAR_PLUGINS : POPULAR_MODS;
  const isInstalled = useMemo(() => {
    const map = new Map<string, InstalledExtension>();
    installed.data?.forEach((e) => map.set(`${e.source}:${e.projectId}`, e));
    return map;
  }, [installed.data]);

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Buscar ${kind}s…`}
            className="pl-10"
          />
        </div>
      </div>

      {!query ? (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">Populares:</span>
          {popular.map((p) => (
            <button
              key={p}
              onClick={() => setQuery(p)}
              className="rounded-full border border-border/60 px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {p}
            </button>
          ))}
        </div>
      ) : null}

      {installed.data && installed.data.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-medium">Instalados</h3>
          <div className="grid gap-2">
            {installed.data.map((ext) => (
              <Card key={ext.id}>
                <CardContent className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{ext.name}</span>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        v{ext.version}
                      </Badge>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{ext.filename}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => update.mutate(ext)} disabled={update.isPending}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => uninstall.mutate(ext)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <h3 className="mb-2 text-sm font-medium">Catálogo</h3>
        {search.isLoading ? (
          <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
            Buscando…
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(search.data?.items ?? []).map((e) => {
              const installedExt = isInstalled.get(`${e.source}:${e.projectId}`);
              return (
                <Card key={`${e.source}:${e.projectId}`}>
                  <CardContent className="flex gap-3 p-4">
                    {e.iconUrl ? (
                      <img
                        src={e.iconUrl}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-lg border border-border/60 object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 shrink-0 rounded-lg bg-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{e.name}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {e.source}
                        </Badge>
                      </div>
                      <div className="line-clamp-2 text-xs text-muted-foreground">
                        {e.description}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                        <span>{(e.downloads / 1000).toFixed(1)}k descargas</span>
                        {e.loaders.slice(0, 3).map((l) => (
                          <span key={l} className="rounded bg-muted px-1.5">
                            {LOADER_LABEL[l]}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2">
                        {installedExt ? (
                          <Badge variant="success">Instalado</Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => install.mutate(e)}
                            disabled={install.isPending}
                          >
                            <Download className="h-4 w-4" /> Instalar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
