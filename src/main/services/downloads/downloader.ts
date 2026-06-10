import { createWriteStream, promises as fsp } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import got from 'got';
import log from 'electron-log/main.js';

export type HashAlgo = 'sha1' | 'sha256' | 'sha512';

export interface DownloadOptions {
  url: string;
  destination: string;
  expectedHash?: { algo: HashAlgo; value: string };
  onProgress?: (transferred: number, total: number | null) => void;
  userAgent?: string;
}

export interface DownloadResult {
  destination: string;
  sizeBytes: number;
  sha1: string;
  sha256: string;
}

/**
 * Streams a URL to disk. Computes SHA1, SHA256 and SHA512 on the fly so verification
 * doesn't require a second pass over the file.
 *
 * Why: trust-but-verify for upstream jars (Mojang, Paper, Modrinth, etc.).
 * A corrupted jar fails fast here instead of producing a confusing crash
 * during server start.
 */
export async function downloadFile(opts: DownloadOptions): Promise<DownloadResult> {
  await fsp.mkdir(path.dirname(opts.destination), { recursive: true });
  const tmp = `${opts.destination}.part-${crypto.randomBytes(4).toString('hex')}`;
  const sha1 = crypto.createHash('sha1');
  const sha256 = crypto.createHash('sha256');
  const sha512 = crypto.createHash('sha512');
  let size = 0;

  const stream = got.stream(opts.url, {
    headers: {
      'User-Agent': opts.userAgent ?? 'MinecraftServerStudio/0.1 (+https://github.com)',
    },
    retry: { limit: 3 },
    timeout: { request: 60_000 },
  });

  let total: number | null = null;
  stream.on('response', (res) => {
    const len = res.headers['content-length'];
    if (typeof len === 'string') total = Number.parseInt(len, 10);
  });
  stream.on('downloadProgress', (p) => {
    size = p.transferred;
    opts.onProgress?.(p.transferred, total);
  });

  const out = createWriteStream(tmp);
  stream.on('data', (chunk: Buffer) => {
    sha1.update(chunk);
    sha256.update(chunk);
    sha512.update(chunk);
  });

  try {
    await pipeline(stream, out);
  } catch (err) {
    await fsp.rm(tmp, { force: true });
    throw err;
  }

  const sha1Hex = sha1.digest('hex');
  const sha256Hex = sha256.digest('hex');
  const sha512Hex = sha512.digest('hex');

  if (opts.expectedHash) {
    const got =
      opts.expectedHash.algo === 'sha1'
        ? sha1Hex
        : opts.expectedHash.algo === 'sha512'
          ? sha512Hex
          : sha256Hex;
    if (got.toLowerCase() !== opts.expectedHash.value.toLowerCase()) {
      await fsp.rm(tmp, { force: true });
      throw new Error(
        `Hash mismatch for ${opts.url}: expected ${opts.expectedHash.value}, got ${got}`,
      );
    }
  }

  await renameResilient(tmp, opts.destination);
  log.debug('Downloaded', { url: opts.url, size, sha1: sha1Hex });
  return { destination: opts.destination, sizeBytes: size, sha1: sha1Hex, sha256: sha256Hex };
}

/**
 * `rename` with retries.
 *
 * On Windows the freshly-written file can be briefly locked by antivirus
 * scanners (EPERM/EBUSY) or even moved away (ENOENT). We retry a few times
 * with backoff; if the source vanished but the destination already exists
 * (a concurrent download completed first), we accept the existing file.
 */
async function renameResilient(from: string, to: string): Promise<void> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await fsp.rename(from, to);
      return;
    } catch (err) {
      lastErr = err;
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        try {
          await fsp.access(to);
          log.warn('Temp file vanished but destination exists; using it', { to });
          return;
        } catch {
          // destination missing too — retry below in case AV releases the file
        }
      } else if (code !== 'EPERM' && code !== 'EBUSY' && code !== 'EACCES') {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }
  }
  throw lastErr;
}

export async function fileSha256(filePath: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  const fh = await fsp.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(64 * 1024);
    for (;;) {
      const { bytesRead } = await fh.read(buf, 0, buf.length, null);
      if (!bytesRead) break;
      hash.update(buf.subarray(0, bytesRead));
    }
  } finally {
    await fh.close();
  }
  return hash.digest('hex');
}
