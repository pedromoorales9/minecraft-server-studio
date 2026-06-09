# Base de datos

SQLite (`better-sqlite3`) con `journal_mode=WAL` y migraciones manuales y versionadas.

## Tablas

### `servers`
Una fila por servidor administrado. Columnas clave: `id`, `loader`,
`minecraft_version`, `loader_version`, `directory`, `status`, `port`,
`ram_min_mb`, `ram_max_mb`, `auth_mode`, `eula_accepted_at`.

### `installed_extensions`
Plugins y mods instalados (con un `kind` discriminador). Clave única
`(server_id, source, project_id)` para que reinstalar idempotentemente
actualice la versión.

### `backups`
Snapshot histórico con `path`, `size_bytes`, `sha256`, `trigger`
(`manual` | `scheduled` | `pre-update`).

### `backup_schedules`
Cron + retención por servidor. El scheduler los lee al arrancar y vuelve a
montar cada job.

### `events`
Log de eventos relevantes: arranques, joins, leaves, crashes, instalación
de extensiones, errores. Ordenable por `ts` con un índice
`(server_id, ts)`.

### `players`
Cache local de jugadores vistos (UUID, username, primera/última conexión,
tiempo jugado, baneo, OP).

### `java_runtimes`
Registry de JREs descargados por la app o detectados en el sistema.

### `downloads`
Histórico de descargas con hashes. Útil para cache busting / verificación.

### `settings`
KV con valores JSON. Usado por `window.api.settings`.

### `catalog_cache`
Resultados de búsqueda y versiones con TTL. Mantiene la UI rápida
y reduce presión sobre APIs externas (Modrinth, Hangar).

### `metrics_history`
Resampleo histórico (CPU/RAM/TPS/players) por servidor para futuras
visualizaciones. Clave primaria compuesta `(server_id, ts)`.

## Diagrama relacional (texto)

```
servers ─┬─< installed_extensions
         ├─< backups ─┐
         │            └─ backup_schedules (1:1)
         ├─< events
         ├─< players
         └─< metrics_history

settings, java_runtimes, downloads, catalog_cache  (independientes)
```

## Migraciones

- Las migraciones viven en `src/main/database/migrations.ts`.
- La tabla `_meta` guarda `schema_version`.
- Cada migración se aplica dentro de una transacción.
- **Nunca** modificamos una migración ya publicada; añadimos una nueva.
