# Roadmap por fases

## Fase 0 — Bootstrap (incluido en esta base)
- Scaffolding Electron + Vite + React + TS + Tailwind + shadcn/ui.
- Arquitectura modular y contrato IPC tipado.
- SQLite con migraciones.
- Servicios core (Java, descargas, manifest Mojang).
- Wizard de creación (5 pasos).
- Pantallas: Dashboard, Server detail, Console, Plugins, Mods, Monitoring, Backups, Settings.
- Tests unitarios (log parser, RCON, downloader, Java helper, loader registry).
- Smoke E2E con Playwright + Electron.
- Documentación técnica.

## Fase 1 — Estabilización (4 semanas)
- ✨ Sistema de notificaciones in-app (toasts).
- ✨ Panel de eventos persistente con filtros.
- 🐛 Robustecer parsing de logs (Forge tiene su propio formato).
- 🛠 RCON: parser de tablas (`list`, `whitelist list`, etc.).
- 📊 TPS/MSPT por log scraping (Paper expone `/tps`; vanilla requiere mod o estimación).
- 🧪 Cobertura ≥ 70% en servicios.
- 🌐 i18n (es, en) con `i18next`.

## Fase 2 — Avanzado (6 semanas)
- 🔌 Hangar: implementar listing de versiones reales (owner/slug + platform).
- 📦 Soporte CurseForge (requiere API key; opcional en ajustes).
- 🧩 Plantillas y perfiles (e.g., "SMP con LuckPerms + EssentialsX").
- 🌍 Gestión de mundos: importar pack `.world` desde el cliente, cambio de seed,
  multi-world (Multiverse-Core para Paper).
- 🛡 Whitelist/Ops/Bans UI con sincronización RCON.
- 🔁 Auto-update de servidores y extensiones con changelogs visibles.
- 💾 Backups incrementales (rsnapshot-style) y export a S3 / SFTP.

## Fase 3 — Administración remota (8 semanas)
- 🌐 API local autenticada (WebSocket + tokens) para integraciones (Discord bot, panel web).
- 📡 Daemon mode: la app puede correr en un VPS sin UI; el cliente se conecta remotamente.
- 🧰 Sondas externas: latencia, conectividad, jugadores reales vs. anunciados (mcsrvstat).
- 📈 Métricas históricas con agregación (1m / 5m / 1h).
- 🔐 SSO con Discord/Google para equipos.

## Fase 4 — Comunidad (continuo)
- 📚 Marketplace de plantillas creadas por la comunidad.
- 🧠 Sugerencias asistidas por IA (qué plugins instalar para un tipo de servidor).
- 🛒 Integración con tiendas (Tebex) para monetización del operador.

## Métricas de calidad
- Tiempo de arranque < 3 s en M2/Win11 modernos.
- Consumo en idle < 200 MB RAM (renderer + main).
- 0 fugas de procesos: cierre limpio detiene todos los servers activos.
- Test suite verde en cada PR (GitHub Actions: macOS + Windows + Ubuntu).
