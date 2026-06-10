import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import readline from 'node:readline';
import { promises as fsp } from 'node:fs';
import { EventEmitter } from 'node:events';
import log from 'electron-log/main.js';
import type { ServerRecord, ServerStatus } from '../../../shared/types/server.js';
import { parseLogLine, tryParseJoin, tryParseLeave } from '../console/logParser.js';
import type { LogLine } from '../../../shared/types/console.js';

interface LaunchMeta {
  launchJar: string;
  extraJvm?: string[];
}

/**
 * Owns a single running Minecraft server child process.
 *
 * Emits:
 *   `status` (ServerStatus)  — when the lifecycle phase changes
 *   `log`    (LogLine)       — for every parsed stdout/stderr line
 *   `exit`   ({ code })      — when the child exits
 *   `join`   (string)        — player joined
 *   `leave`  (string)        — player left
 */
export class ServerProcess extends EventEmitter {
  private child: ChildProcess | null = null;
  private status: ServerStatus = 'stopped';
  private playersOnline = new Set<string>();

  constructor(public readonly record: ServerRecord) {
    super();
  }

  getStatus(): ServerStatus {
    return this.status;
  }

  getPid(): number | null {
    return this.child?.pid ?? null;
  }

  getPlayersOnline(): number {
    return this.playersOnline.size;
  }

  async start(): Promise<void> {
    if (this.child) throw new Error('Process already started');
    const meta = await readLaunchMeta(this.record.directory);
    if (!this.record.javaPath) throw new Error('No Java path resolved for this server');

    const jvmArgs = buildJvmArgs(this.record, meta.extraJvm);
    const isScript = /\.sh$|\.bat$|\/run$/i.test(meta.launchJar);

    this.setStatus('starting');
    log.info('Starting server', { id: this.record.id, jvmArgs, launch: meta.launchJar });

    if (isScript) {
      // Los run.bat/run.sh de Forge/NeoForge invocan `java` del PATH, que en
      // la mayoría de equipos no existe (usamos nuestro JRE descargado). Se lo
      // inyectamos vía PATH/JAVA_HOME, y volcamos los flags de JVM (RAM,
      // Aikar) en user_jvm_args.txt, que es donde el script los lee.
      const javaBinDir = path.dirname(this.record.javaPath);
      const env = {
        ...process.env,
        JAVA_HOME: path.dirname(javaBinDir),
        PATH: `${javaBinDir}${path.delimiter}${process.env.PATH ?? ''}`,
      };
      await fsp.writeFile(
        path.join(this.record.directory, 'user_jvm_args.txt'),
        `# Generado por Minecraft Server Studio — se sobrescribe en cada arranque\n${jvmArgs.join('\n')}\n`,
        'utf8',
      );
      this.child = spawn(meta.launchJar, ['nogui'], {
        cwd: this.record.directory,
        shell: process.platform === 'win32',
        env,
      });
    } else {
      this.child = spawn(this.record.javaPath, [...jvmArgs, '-jar', meta.launchJar, 'nogui'], {
        cwd: this.record.directory,
      });
    }

    this.attachStreams(this.child);

    // spawn() reports ENOENT both for missing files and for binaries that
    // can't be loaded by the OS (e.g. x86_64 binary on Apple Silicon without
    // Rosetta). Rewrite the error so the user sees what to do next.
    this.child.once('error', (err) => {
      log.error('Child process failed to start', err);
      if (
        process.platform === 'darwin' &&
        process.arch === 'arm64' &&
        (err as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        this.emit('log', {
          serverId: this.record.id,
          sequence: Date.now(),
          timestamp: Date.now(),
          level: 'FATAL',
          thread: null,
          source: null,
          message:
            'No se pudo lanzar Java. En Apple Silicon, los binarios x86_64 requieren Rosetta 2. Instálalo con: softwareupdate --install-rosetta --agree-to-license',
          raw: String(err),
        });
      }
      this.setStatus('crashed');
    });

    this.child.once('exit', (code) => {
      this.emit('exit', { code });
      this.setStatus(code === 0 || this.status === 'stopping' ? 'stopped' : 'crashed');
      this.child = null;
      this.playersOnline.clear();
    });
  }

  async stop(opts?: { force?: boolean }): Promise<void> {
    if (!this.child) return;
    this.setStatus('stopping');
    if (opts?.force) {
      this.child.kill('SIGKILL');
      return;
    }
    this.sendCommand('stop');
    // Give the server 30s to exit cleanly before SIGKILL.
    setTimeout(() => {
      if (this.child) {
        log.warn('Server did not exit cleanly, sending SIGKILL', { id: this.record.id });
        this.child.kill('SIGKILL');
      }
    }, 30_000).unref();
  }

  sendCommand(command: string): void {
    if (!this.child?.stdin || this.child.stdin.destroyed) {
      throw new Error('Server stdin is not writable');
    }
    this.child.stdin.write(command.endsWith('\n') ? command : `${command}\n`);
  }

  private setStatus(s: ServerStatus): void {
    if (s === this.status) return;
    this.status = s;
    this.emit('status', s);
  }

  private attachStreams(child: ChildProcess): void {
    const handle = (raw: string, channel: 'stdout' | 'stderr') => {
      const line: LogLine = parseLogLine(this.record.id, raw);
      if (channel === 'stderr' && line.level === 'STDOUT') line.level = 'ERROR';
      this.emit('log', line);
      if (/Done\s+\([^)]+\)!\s+For help/.test(line.message) || /Done \(/.test(line.message)) {
        this.setStatus('running');
      }
      const joined = tryParseJoin(line);
      if (joined) {
        this.playersOnline.add(joined);
        this.emit('join', joined);
      }
      const left = tryParseLeave(line);
      if (left) {
        this.playersOnline.delete(left);
        this.emit('leave', left);
      }
    };
    if (child.stdout) {
      const rl = readline.createInterface({ input: child.stdout });
      rl.on('line', (l) => handle(l, 'stdout'));
    }
    if (child.stderr) {
      const rl = readline.createInterface({ input: child.stderr });
      rl.on('line', (l) => handle(l, 'stderr'));
    }
  }
}

function buildJvmArgs(rec: ServerRecord, extra: string[] | undefined): string[] {
  return [
    `-Xms${rec.ramMinMb}M`,
    `-Xmx${rec.ramMaxMb}M`,
    // Aikar's tuned G1GC flags — proven baseline for Minecraft 1.15+.
    '-XX:+UseG1GC',
    '-XX:+ParallelRefProcEnabled',
    '-XX:MaxGCPauseMillis=200',
    '-XX:+UnlockExperimentalVMOptions',
    '-XX:+DisableExplicitGC',
    '-XX:+AlwaysPreTouch',
    '-XX:G1NewSizePercent=30',
    '-XX:G1MaxNewSizePercent=40',
    '-XX:G1HeapRegionSize=8M',
    '-XX:G1ReservePercent=20',
    '-XX:G1HeapWastePercent=5',
    '-XX:G1MixedGCCountTarget=4',
    '-XX:InitiatingHeapOccupancyPercent=15',
    '-XX:G1MixedGCLiveThresholdPercent=90',
    '-XX:G1RSetUpdatingPauseTimePercent=5',
    '-XX:SurvivorRatio=32',
    '-XX:+PerfDisableSharedMem',
    '-XX:MaxTenuringThreshold=1',
    '-Dusing.aikars.flags=https://mcflags.emc.gs',
    '-Daikars.new.flags=true',
    ...(extra ?? []),
  ];
}

async function readLaunchMeta(dir: string): Promise<LaunchMeta> {
  const file = path.join(dir, '.studio-launch.json');
  try {
    const text = await fsp.readFile(file, 'utf8');
    return JSON.parse(text) as LaunchMeta;
  } catch {
    // Fallback: assume a server.jar in the directory.
    return { launchJar: 'server.jar' };
  }
}
