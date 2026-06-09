import { describe, it, expect } from 'vitest';
import net from 'node:net';
import { RconClient } from '../../src/main/modules/runtime/rcon';

/**
 * Spins up a fake RCON-protocol echo server and exercises the client.
 * Verifies the auth handshake, encoding/decoding of a packet, and the
 * disconnect path.
 */
describe('RconClient', () => {
  it('authenticates and round-trips a command', async () => {
    const password = 'secret';
    const server = net.createServer((sock) => {
      let buf = Buffer.alloc(0);
      sock.on('data', (chunk) => {
        buf = Buffer.concat([buf, chunk]);
        while (buf.length >= 4) {
          const size = buf.readInt32LE(0);
          if (buf.length < size + 4) break;
          const pkt = buf.subarray(4, size + 4);
          buf = buf.subarray(size + 4);
          const id = pkt.readInt32LE(0);
          const type = pkt.readInt32LE(4);
          const body = pkt.subarray(8, pkt.length - 2).toString('utf8');
          if (type === 3) {
            const responseId = body === password ? id : -1;
            sock.write(encode(responseId, 2, ''));
          } else if (type === 2) {
            sock.write(encode(id, 0, `echo: ${body}`));
          }
        }
      });
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as net.AddressInfo).port;
    const client = new RconClient('127.0.0.1', port, password);

    try {
      const result = await client.exec('list');
      expect(result).toBe('echo: list');
    } finally {
      client.disconnect();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});

function encode(id: number, type: number, body: string): Buffer {
  const bodyBuf = Buffer.from(body, 'utf8');
  const size = 4 + 4 + bodyBuf.length + 2;
  const buf = Buffer.alloc(4 + size);
  buf.writeInt32LE(size, 0);
  buf.writeInt32LE(id, 4);
  buf.writeInt32LE(type, 8);
  bodyBuf.copy(buf, 12);
  buf.writeInt8(0, 12 + bodyBuf.length);
  buf.writeInt8(0, 13 + bodyBuf.length);
  return buf;
}
