import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { promises as fsp } from 'node:fs';
import { downloadFile, fileSha256 } from '../../src/main/services/downloads/downloader';

describe('downloader', () => {
  let server: http.Server;
  let url: string;
  const payload = Buffer.from('hello-minecraft-server-studio');

  beforeAll(async () => {
    server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': payload.length });
      res.end(payload);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as { port: number }).port;
    url = `http://127.0.0.1:${port}/file.bin`;
  });

  afterAll(() => {
    server.close();
  });

  it('downloads, computes hashes, and writes to disk', async () => {
    const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'mss-dl-'));
    const dest = path.join(tmp, 'out.bin');
    const result = await downloadFile({ url, destination: dest });
    expect(result.sizeBytes).toBe(payload.length);
    expect(await fileSha256(dest)).toBe(result.sha256);
  });

  it('rejects on hash mismatch', async () => {
    const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'mss-dl-'));
    const dest = path.join(tmp, 'mismatch.bin');
    await expect(
      downloadFile({
        url,
        destination: dest,
        expectedHash: { algo: 'sha256', value: '0'.repeat(64) },
      }),
    ).rejects.toThrow(/Hash mismatch/);
  });
});
