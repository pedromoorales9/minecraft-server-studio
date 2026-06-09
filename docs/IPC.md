# Contrato IPC

Todos los canales están registrados en [`src/shared/ipc/channels.ts`](../src/shared/ipc/channels.ts).
El tipado se hace una sola vez en [`src/shared/ipc/contract.ts`](../src/shared/ipc/contract.ts)
y se importa tanto desde el preload como desde el renderer.

## Reglas

1. Cada canal sigue el patrón `domain:action`.
2. Renderer → Main usa `invoke` (request/response, devuelve `Promise`).
3. Main → Renderer usa `webContents.send` (push, broadcast con `broadcast()`).
4. Las suscripciones devuelven una función `disposer` (compatible con el
   cleanup de `useEffect`).

## Tabla de canales

### Servers (`IPC.servers`)
| Canal | Dirección | Payload | Devuelve |
| --- | --- | --- | --- |
| `servers:list` | R→M | — | `ServerRecord[]` |
| `servers:get` | R→M | `id: string` | `ServerRecord \| null` |
| `servers:create` | R→M | `CreateServerRequest` | `ServerRecord` |
| `servers:update` | R→M | `id, patch` | `ServerRecord` |
| `servers:remove` | R→M | `id, { deleteFiles? }` | `void` |
| `servers:start` | R→M | `id` | `void` |
| `servers:stop` | R→M | `id, { force? }` | `void` |
| `servers:restart` | R→M | `id` | `void` |
| `servers:sendCommand` | R→M | `id, command` | `void` |
| `servers:importExisting` | R→M | `directory` | `ServerRecord` |
| `servers:onProvisioningProgress` | M→R | `ServerProvisioningProgress` | — |
| `servers:onStatusChanged` | M→R | `{ serverId, status }` | — |
| `servers:onLog` | M→R | `LogLine` | — |
| `servers:onMetrics` | M→R | `ServerMetricsSnapshot` | — |

### Versions (`IPC.versions`)
| Canal | Devuelve |
| --- | --- |
| `versions:listMinecraft` | `{ id, type, releaseTime }[]` |
| `versions:listLoader` | `{ version, stable }[]` |

### Java (`IPC.java`)
| Canal | Devuelve |
| --- | --- |
| `java:list` | `{ major, path, vendor }[]` |
| `java:ensure` | `{ major, path }` |

### Catalog (`IPC.catalog`)
| Canal | Devuelve |
| --- | --- |
| `catalog:search` | `CatalogSearchResult` |
| `catalog:versions` | `CatalogVersion[]` |
| `catalog:install` | `InstalledExtension` |
| `catalog:uninstall` | `void` |
| `catalog:listInstalled` | `InstalledExtension[]` |
| `catalog:update` | `InstalledExtension` |
| `catalog:checkUpdates` | `InstalledExtension[]` |
| `catalog:onInstallProgress` | M→R progress stream |

### Backups (`IPC.backups`)
Listar / crear / restaurar / eliminar / programar; eventos de progreso vía
`backups:onProgress`.

### System, Settings, Worlds
Operaciones de soporte (información de plataforma, ajustes JSON-blob,
gestión de mundos).

## Convenciones

- **Errores**: el wrapper `wrap()` en `registerHandlers.ts` reescribe los
  errores no-`Error` en `Error` para que el preload los reciba bien tipados.
- **Streams**: los canales `on*` reciben payloads ya serialisables. Nunca
  enviamos sockets, streams o referencias a `EventEmitter`.
- **Throttling**: el broadcaster de métricas envía a 0.5 Hz por servidor;
  la consola no se throttlea (cada línea importa).
