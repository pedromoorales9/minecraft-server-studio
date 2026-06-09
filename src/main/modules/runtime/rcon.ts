import net from 'node:net';

/**
 * Minimal RCON client (Source RCON protocol).
 *
 * Why custom: `node-rcon` is unmaintained and pulls in a global state model
 * that's awkward to test. The protocol is ~50 lines so we own it instead.
 *
 *   packet = [size: i32][id: i32][type: i32][body: cstring][\0]
 *
 *   type 3 → SERVERDATA_AUTH
 *   type 2 → SERVERDATA_EXECCOMMAND / SERVERDATA_AUTH_RESPONSE
 *   type 0 → SERVERDATA_RESPONSE_VALUE
 */
export class RconClient {
  private socket: net.Socket | null = null;
  private buffer = Buffer.alloc(0);
  private pending = new Map<number, (body: string) => void>();
  private nextId = 1;
  private connected = false;

  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly password: string,
  ) {}

  async connect(): Promise<void> {
    if (this.connected) return;
    await new Promise<void>((resolve, reject) => {
      const sock = net.createConnection({ host: this.host, port: this.port });
      sock.once('error', reject);
      sock.once('connect', () => {
        this.socket = sock;
        sock.on('data', (chunk) => this.onData(chunk));
        sock.on('close', () => {
          this.connected = false;
          this.socket = null;
        });
        resolve();
      });
    });

    const id = await this.send(3, this.password);
    if (id === -1) {
      this.disconnect();
      throw new Error('RCON auth failed');
    }
    this.connected = true;
  }

  async exec(command: string): Promise<string> {
    if (!this.connected) await this.connect();
    return new Promise<string>((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, resolve);
      const packet = encodePacket(id, 2, command);
      if (!this.socket) return reject(new Error('Not connected'));
      this.socket.write(packet);
    });
  }

  disconnect(): void {
    this.socket?.end();
    this.socket = null;
    this.connected = false;
  }

  private send(type: number, body: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      const packet = encodePacket(id, type, body);
      if (!this.socket) return reject(new Error('Not connected'));
      this.pending.set(id, () => resolve(id));
      this.socket.write(packet);
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          resolve(-1);
        }
      }, 5_000).unref();
    });
  }

  private onData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length >= 4) {
      const size = this.buffer.readInt32LE(0);
      if (this.buffer.length < size + 4) break;
      const packet = this.buffer.subarray(4, size + 4);
      this.buffer = this.buffer.subarray(size + 4);
      const id = packet.readInt32LE(0);
      const body = packet.subarray(8, packet.length - 2).toString('utf8');
      const cb = this.pending.get(id);
      if (cb) {
        this.pending.delete(id);
        cb(body);
      }
    }
  }
}

function encodePacket(id: number, type: number, body: string): Buffer {
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
