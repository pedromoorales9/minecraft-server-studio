# Arquitectura

## Resumen

Minecraft Server Studio es una aplicación Electron con dos procesos lógicos:

- **Main (Node.js)** — orquesta servidores, descargas, base de datos, IPC.
- **Renderer (Chromium)** — interfaz React; *zero acceso* a Node.

La comunicación va siempre por un **preload** que expone `window.api`, una superficie
tipada que delega en `ipcMain.handle`/`webContents.send`.

```
┌──────────────────────────────────────────────────────┐
│                    Main process                      │
│                                                      │
│   ┌─ IPC handlers ─────────────────────────────────┐ │
│   │  servers │ versions │ catalog │ backups │ ...  │ │
│   └────────────────────────────────────────────────┘ │
│         │                                            │
│   ┌─ Modules ──────────────────────────────────────┐ │
│   │  server-creation │ catalog │ runtime │ backups │ │
│   └────────────────────────────────────────────────┘ │
│         │                                            │
│   ┌─ Services ─────────────────────────────────────┐ │
│   │  downloads │ java │ mojang │ eula │ properties │ │
│   └────────────────────────────────────────────────┘ │
│         │                                            │
│   ┌─ Database (better-sqlite3, WAL) ───────────────┐ │
│   │  servers │ extensions │ backups │ events │ ... │ │
│   └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
                       ▲
                       │  contextBridge → window.api
                       │
┌──────────────────────┴───────────────────────────────┐
│                  Renderer (React)                    │
│                                                      │
│   ThemeProvider · ReactQuery · HashRouter            │
│   ┌─ Layout ─────────┐  ┌─ Modules ───────────────┐  │
│   │  Sidebar / Topbar│  │ dashboard, wizard, …    │  │
│   └──────────────────┘  └─────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

## Capas

### 1. Shared (`src/shared`)
Tipos y constantes que viajan entre procesos. **Cualquier campo nuevo en
la API empieza aquí.** No tiene side-effects ni dependencias en Node.

- `types/` — entidades de dominio (`ServerRecord`, `CatalogEntry`, …).
- `ipc/channels.ts` — único registro de nombres de canal IPC.
- `ipc/contract.ts` — tipo `RendererApi` que define `window.api`.

### 2. Main (`src/main`)
Donde vive el estado, los procesos hijos y la red.

- `core/paths.ts` — layout de archivos en `userData/`.
- `database/` — SQLite + repositorios tipados (no usamos ORM pesado;
  `better-sqlite3` con queries explícitas es suficiente y predecible).
- `services/` — utilidades sin estado (descargas, hashing, Mojang…).
- `modules/<dominio>/` — lógica con estado (provisioning, runtime, backups).
- `ipc/handlers/` — adaptadores: deserializan, llaman al módulo, devuelven.

### 3. Preload (`src/preload`)
Conecta `ipcRenderer` con `window.api` a través de `contextBridge`. Es la
**única** superficie a la que el renderer tiene acceso. No exporta primitivas
de Node.

### 4. Renderer (`src/renderer`)
React puro. Cada pantalla vive en su propio módulo (`renderer/modules/<x>`).
TanStack Query gestiona el cacheo de queries y la sincronización con eventos.

## Decisiones clave

| Decisión | Por qué |
| --- | --- |
| `electron-vite` en vez de webpack/forge | DX moderno, HMR para main+renderer, configuración mínima. |
| `better-sqlite3` (síncrono) | Menos boilerplate que `knex`/`prisma`; latencia despreciable en el thread principal del main. |
| Sin ORM | Las queries son sencillas; mantener los SQL evita capas de magia. |
| `react-query` para estado servidor↔UI | Cache inteligente, refetch en background, invalidación con mutaciones. |
| RCON propio (~50 líneas) | `node-rcon` está abandonado y arrastra global state. |
| Aikar's flags por defecto | Estándar de la comunidad; rendimiento GC superior al G1 vanilla. |
| `nanoid` para ids | Cortos, URL-safe, criptográficamente fuertes. |
| `framer-motion` para transiciones | Animaciones declarativas, alta calidad; complementa los radicales de shadcn. |

## Seguridad de la capa Electron

- `sandbox: false` (necesario para `better-sqlite3`) **pero** `contextIsolation: true`,
  `nodeIntegration: false`, `webSecurity: true`.
- Una CSP estricta en `index.html` bloquea inline scripts y conexiones externas
  durante el render (la red la hace el main).
- Cualquier `window.open(url)` se redirige a `shell.openExternal` (link safety).

## Manejo de estados de larga duración

- `runtimeRegistry` (singleton) controla todos los procesos hijos.
- Un timer compartido muestrea CPU/RAM con `pidusage` cada 2s.
- Los eventos del proceso (`status`, `log`, `metrics`) se reemiten al
  renderer a través de `broadcast()` y se persisten en SQLite cuando
  procede.

## Estructura de carpetas en disco

```
~/Library/Application Support/Minecraft Server Studio/   (macOS)
%APPDATA%/Minecraft Server Studio/                       (Windows)
~/.config/Minecraft Server Studio/                       (Linux)
├─ studio.sqlite               # base de datos
├─ servers/<srv_id>/           # cada instancia
│   ├─ .studio-launch.json     # metadatos de arranque
│   ├─ server.properties
│   ├─ eula.txt
│   ├─ world/, plugins/, mods/, libraries/
├─ cache/jars/<loader>/        # jars descargados (compartidos)
├─ cache/java/<major>/         # JREs Temurin extraídos
├─ cache/catalog/              # metadatos Modrinth/Hangar/Spiget
├─ backups/<srv_id>/*.tar.gz
└─ logs/                       # electron-log
```
