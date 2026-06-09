# Minecraft Server Studio

> Aplicación de escritorio profesional para crear, configurar, administrar y monitorizar
> servidores de Minecraft. Multiplataforma (macOS, Windows, Linux). Construida sobre
> **Electron + TypeScript + React + Tailwind + shadcn/ui**.

## Arranque rápido

```bash
npm install
npm run dev          # entorno de desarrollo (vite + electron-vite)
npm run build        # build de producción
npm run package      # crea el instalador para tu OS
npm test             # tests unitarios (vitest)
npm run test:e2e     # smoke E2E (playwright + electron)
```

Requisitos:

- Node.js ≥ 20
- macOS 12+ / Windows 10+ / Ubuntu 22.04+
- Permisos de red salientes (descarga de Java y jars del loader)
- Espacio en disco: ~2 GB por servidor (Java + jar + mundos)

## Documentación

| Documento | Descripción |
| --- | --- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Visión general, capas, decisiones de diseño |
| [`docs/IPC.md`](docs/IPC.md) | Contratos IPC entre main, preload y renderer |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Esquema SQLite y migraciones |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Modelo de amenazas y mitigaciones |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Plan de desarrollo por fases |
| [`docs/wireframes/`](docs/wireframes/) | Wireframes ASCII de cada pantalla |

## Layout del repositorio

```
src/
  shared/        # tipos y contrato IPC (compartidos main↔renderer)
  main/          # proceso principal Electron
    core/        # paths, utilidades de plataforma
    database/    # SQLite, migraciones, repositorios
    services/    # downloads, Java, Mojang, EULA, properties
    modules/     # dominios: server-creation, catalog, runtime, backups
    ipc/         # handlers por dominio
  preload/       # contextBridge expone window.api
  renderer/      # React + Tailwind + shadcn/ui
    app/         # ThemeProvider, router
    components/  # primitivas (button, card, …) y layout
    modules/     # una carpeta por pantalla
    styles/      # globals.css con tokens HSL
tests/
  unit/          # vitest
  e2e/           # playwright (Electron)
docs/            # arquitectura, IPC, DB, seguridad, roadmap, wireframes
```
