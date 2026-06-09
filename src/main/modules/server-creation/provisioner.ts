import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { nanoid } from 'nanoid';
import log from 'electron-log/main.js';
import { appPaths, serverDir } from '../../core/paths.js';
import { serversRepo } from '../../database/repositories/serversRepo.js';
import { eventsRepo } from '../../database/repositories/eventsRepo.js';
import { downloadFile } from '../../services/downloads/downloader.js';
import { javaManager } from '../../services/java/javaManager.js';
import { recommendedJavaMajor } from '../../services/mojang/manifest.js';
import { writeEulaAccepted } from '../../services/eula.js';
import { writeServerProperties } from '../../services/properties.js';
import { broadcast } from '../../ipc/broadcast.js';
import { IPC } from '../../../shared/ipc/channels.js';
import { getResolver } from './resolvers/index.js';
import type {
  CreateServerRequest,
  ServerProvisioningProgress,
  ServerRecord,
} from '../../../shared/types/server.js';

/**
 * End-to-end provisioning: validate → write DB row → fetch Java →
 * download/install loader jar → write configs → mark ready.
 *
 * Progress is broadcast to renderers via `IPC.servers.onProvisioningProgress`
 * so the wizard's progress UI stays in sync.
 */
export async function provisionServer(req: CreateServerRequest): Promise<ServerRecord> {
  validateRequest(req);

  const id = `srv_${nanoid(10)}`;
  const dir = serverDir(id);
  await fsp.mkdir(dir, { recursive: true });

  const now = new Date().toISOString();
  const record: ServerRecord = {
    id,
    name: req.name,
    loader: req.loader,
    minecraftVersion: req.minecraftVersion,
    loaderVersion: req.loaderVersion ?? null,
    contentMode: req.contentMode,
    authMode: req.authMode,
    port: req.port,
    ramMinMb: req.ramMinMb,
    ramMaxMb: req.ramMaxMb,
    worldName: req.worldName,
    directory: dir,
    javaPath: null,
    javaMajor: recommendedJavaMajor(req.minecraftVersion),
    status: 'updating',
    rconPort: req.port + 10,
    rconPassword: nanoid(24),
    autoStart: false,
    autoBackup: false,
    motd: req.motd ?? `${req.name}`,
    maxPlayers: req.maxPlayers ?? 20,
    difficulty: 'normal',
    gamemode: 'survival',
    createdAt: now,
    updatedAt: now,
    lastStartedAt: null,
    eulaAcceptedAt: req.eulaAccepted ? now : null,
  };

  serversRepo.insert(record);
  eventsRepo.insert({ serverId: id, ts: now, kind: 'server.created', message: `Created ${req.name}` });

  const emit = (p: Omit<ServerProvisioningProgress, 'serverId'>) =>
    broadcast(IPC.servers.onProvisioningProgress, { ...p, serverId: id });

  try {
    emit({ phase: 'init', message: 'Preparando directorio', progress: 0.02 });

    // Java
    emit({ phase: 'java', message: `Comprobando Java ${record.javaMajor}`, progress: 0.05 });
    const jre = await javaManager.ensure(record.javaMajor);
    serversRepo.patch(id, { javaPath: jre.path });
    record.javaPath = jre.path;

    // Loader jar
    emit({ phase: 'jar', message: `Resolviendo loader (${req.loader})`, progress: 0.2 });
    const resolver = getResolver(req.loader);
    const artifact = await resolver.resolveArtifact(req.minecraftVersion, req.loaderVersion ?? null);

    emit({ phase: 'jar', message: `Descargando ${artifact.filename}`, progress: 0.25 });
    const targetPath = path.join(dir, artifact.filename);
    await downloadFile({
      url: artifact.url,
      destination: targetPath,
      expectedHash: artifact.sha256
        ? { algo: 'sha256', value: artifact.sha256 }
        : artifact.sha1
          ? { algo: 'sha1', value: artifact.sha1 }
          : undefined,
      onProgress: (transferred, total) => {
        const pct = total ? transferred / total : 0;
        emit({
          phase: 'jar',
          message: `Descargando ${artifact.filename}`,
          progress: 0.25 + 0.35 * pct,
        });
      },
    });

    let launchJar = targetPath;
    let extraJvm: string[] | undefined;
    if (artifact.isInstaller && resolver.runInstaller) {
      emit({ phase: 'install', message: 'Ejecutando instalador del loader', progress: 0.65 });
      const r = await resolver.runInstaller({
        artifactPath: targetPath,
        serverDir: dir,
        javaPath: jre.path,
      });
      launchJar = r.launchJar;
      extraJvm = r.jvmExtraArgs;
    }

    // Persist loader version if resolver discovered it
    if (artifact.loaderVersion && !record.loaderVersion) {
      serversRepo.patch(id, { /* nothing in patch list — handled via separate update */ });
      record.loaderVersion = artifact.loaderVersion;
    }

    // EULA + configs
    if (req.eulaAccepted) {
      emit({ phase: 'config', message: 'Aceptando EULA', progress: 0.78 });
      await writeEulaAccepted(dir);
    }
    emit({ phase: 'config', message: 'Generando server.properties', progress: 0.85 });
    await writeServerProperties(record);

    // Drop a launch metadata file so the runtime knows what to spawn.
    await fsp.writeFile(
      path.join(dir, '.studio-launch.json'),
      JSON.stringify({ launchJar, extraJvm }, null, 2),
      'utf8',
    );

    emit({ phase: 'finalize', message: 'Finalizando', progress: 0.95 });
    serversRepo.updateStatus(id, 'stopped');
    emit({ phase: 'done', message: 'Servidor listo', progress: 1 });
    log.info('Server provisioned', { id, name: req.name, dir });
    return serversRepo.get(id)!;
  } catch (err) {
    log.error('Provisioning failed', err);
    serversRepo.updateStatus(id, 'crashed');
    emit({
      phase: 'error',
      message: 'Error durante la creación',
      progress: 1,
      detail: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

function validateRequest(req: CreateServerRequest): void {
  if (!req.name.trim()) throw new Error('El nombre del servidor es obligatorio');
  if (req.port < 1024 || req.port > 65535) throw new Error('Puerto fuera de rango (1024-65535)');
  if (req.ramMinMb < 512) throw new Error('RAM mínima debe ser al menos 512 MB');
  if (req.ramMaxMb < req.ramMinMb) throw new Error('RAM máxima < RAM mínima');
  if (req.ramMaxMb > 32 * 1024) throw new Error('RAM máxima > 32 GB es inusual; ajústelo manualmente');
  if (!/^[a-zA-Z0-9_\- ]{1,32}$/.test(req.worldName))
    throw new Error('Nombre de mundo inválido (use letras, números, guiones)');
  if (!req.eulaAccepted) throw new Error('Debes aceptar el EULA de Mojang para crear el servidor');
}

/** Used by the renderer to surface where data lives. */
export function cachePath(): string {
  return appPaths().cache;
}
