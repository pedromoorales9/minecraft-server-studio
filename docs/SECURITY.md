# Seguridad

## Modelo de amenazas

| Amenaza | Mitigación |
| --- | --- |
| Jar/instalador alterado en tránsito | Validación SHA-1/SHA-256 frente al manifest publicado (Mojang/Paper/Modrinth). Las descargas fallan antes de tocar el filesystem real (se escribe en `*.part-<rand>` y se renombra atómicamente). |
| Plugin malicioso ejecutándose dentro de la JVM del server | El usuario tiene el control; nuestra superficie de ataque es el descargador. Aviso visual cuando un plugin es premium/no firmado. |
| Renderer ejecuta Node | `contextIsolation: true`, `nodeIntegration: false`, CSP estricta. El renderer solo puede invocar canales IPC registrados explícitamente. |
| XSS por contenido de Modrinth/Hangar | Render seguro (React escapa por defecto). Nunca usamos `dangerouslySetInnerHTML`. |
| Inyección de comandos al spawnear procesos | Todos los `spawn` reciben argumentos como `string[]`; nunca componemos shells excepto el caso Windows de PowerShell para `Expand-Archive`, con rutas pre-validadas. |
| RCON expuesto sin contraseña | Generamos `rcon.password` con `nanoid(24)` al provisionar. No se persiste en logs. |
| EULA aceptada sin consentimiento | El wizard requiere checkbox explícito; el campo `eula_accepted_at` solo se escribe si `req.eulaAccepted === true`. Sin él, `eula.txt` no se genera y el servidor no arrancará. |
| URL externa abierta inesperadamente | `setWindowOpenHandler` redirige todo a `shell.openExternal`. Los enlaces hablan claramente en el wizard (EULA → `aka.ms/MinecraftEULA`). |
| Backup corrupto al restaurar | Verificación SHA-256 antes de extraer. Si falla, abortamos. |

## Permisos del SO

La app pide permisos solo cuando es necesario:

- **Red**: HTTP outbound a APIs públicas (Mojang, Paper, Purpur, Modrinth, Hangar,
  Adoptium, Forge, NeoForge, etc.).
- **Filesystem**: confinada a `app.getPath('userData')` salvo cuando el
  usuario elige una carpeta para importar/exportar.
- **Procesos**: spawnea JVMs con `cwd` controlado dentro de `servers/<id>/`.

## Updater

`electron-updater` está incluido como dependencia pero deshabilitado por
defecto. Antes de habilitarlo en producción se debe:

1. Firmar los binarios (Apple Developer ID; Authenticode en Windows).
2. Publicar releases en un canal autenticado.
3. Comprobar checksums antes de aplicar actualizaciones.
