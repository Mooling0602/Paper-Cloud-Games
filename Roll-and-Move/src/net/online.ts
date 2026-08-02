/**
 * Online session over the relay server: a plain WebSocket to the server,
 * which forwards every message between the room's host and guest.
 * No WebRTC — works from any origin, no secure context required.
 */

export type NetRole = 'host' | 'guest';

export interface OnlineSessionOpts {
  /** ws://host:port/ws — the relay endpoint. */
  url: string;
  role: NetRole;
  /** Guest only: room code to join. */
  code?: string;
  /** Host only: room created. */
  onCreated?: (code: string) => void;
  /** Room paired — the game can start. */
  onOpen: () => void;
  /** Relayed game messages (parsed JSON) from the peer. */
  onMessage: (msg: unknown) => void;
  /** Peer or server connection lost. */
  onDisconnect: () => void;
  /** Server-level failure (bad room/address). */
  onError: (msg: string) => void;
}

export class OnlineSession {
  private ws: WebSocket | null = null;
  private down = false;

  constructor(private opts: OnlineSessionOpts) {
    this.connect();
  }

  private connect(): void {
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.opts.url);
    } catch {
      this.opts.onError('bad server address');
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      ws.send(
        JSON.stringify(
          this.opts.role === 'host' ? { t: 'create' } : { t: 'join', code: this.opts.code },
        ),
      );
    };
    ws.onmessage = (ev) => {
      let msg: { t?: string; code?: string; msg?: string };
      try {
        msg = JSON.parse(String(ev.data)) as typeof msg;
      } catch {
        return;
      }
      if (msg.t === 'created' && this.opts.onCreated) {
        this.opts.onCreated(String(msg.code));
      } else if (msg.t === 'joined' || msg.t === 'peer-ready') {
        // both sides are paired — the relay is ready immediately
        this.opts.onOpen();
      } else if (msg.t === 'error') {
        this.opts.onError(String(msg.msg ?? 'join failed'));
      } else if (msg.t === 'peer-left') {
        this.fail();
      } else {
        // everything else is relayed game data
        this.opts.onMessage(msg);
      }
    };
    ws.onclose = () => this.fail();
    ws.onerror = () => this.fail();
  }

  send(msg: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  close(): void {
    this.down = true;
    try {
      this.ws?.close();
    } catch {
      /* ignore */
    }
  }

  private fail(): void {
    if (this.down) return;
    this.down = true;
    this.opts.onDisconnect();
  }
}
