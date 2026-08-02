/**
 * Online session: signaling-server pairing + WebRTC DataChannel (pure IPv6 P2P).
 * Signaling only exchanges SDP/ICE; all game messages go over the DataChannel.
 */

export type NetRole = 'host' | 'guest';

export interface OnlineSessionOpts {
  /** ws://host:port/ws — the full signaling endpoint. */
  url: string;
  role: NetRole;
  /** Guest only: room code to join. */
  code?: string;
  /** Host only: room created. */
  onCreated?: (code: string) => void;
  /** DataChannel open — the game can start. */
  onOpen: () => void;
  /** Game messages (parsed JSON) from the peer. */
  onMessage: (msg: unknown) => void;
  /** Peer or server connection lost. */
  onDisconnect: () => void;
  /** Signaling-level failure (bad URL/room). */
  onError: (msg: string) => void;
}

export class OnlineSession {
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
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
      ws.send(JSON.stringify(
        this.opts.role === 'host' ? { t: 'create' } : { t: 'join', code: this.opts.code },
      ));
    };
    ws.onmessage = (ev) => {
      let msg: { t?: string; code?: string; data?: unknown };
      try {
        msg = JSON.parse(String(ev.data)) as typeof msg;
      } catch {
        return;
      }
      if (msg.t === 'created' && this.opts.onCreated) this.opts.onCreated(String(msg.code));
      else if (msg.t === 'joined' || msg.t === 'peer-ready') this.setupPeer();
      else if (msg.t === 'signal') this.onSignal(msg.data as { desc?: RTCSessionDescriptionInit; ice?: RTCIceCandidateInit });
      else if (msg.t === 'error') this.opts.onError(String(msg.code ?? 'join failed'));
      else if (msg.t === 'peer-left') this.fail();
    };
    ws.onclose = () => this.fail();
    ws.onerror = () => this.fail();
  }

  private setupPeer(): void {
    if (this.pc) return;
    const pc = new RTCPeerConnection({ iceServers: [] }); // pure IPv6 direct, no STUN
    this.pc = pc;
    pc.onicecandidate = (e) => {
      if (e.candidate) this.server({ t: 'signal', data: { ice: e.candidate.toJSON() } });
    };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === 'failed' || s === 'closed') this.fail();
    };
    if (this.opts.role === 'host') {
      const dc = pc.createDataChannel('game');
      this.dc = dc;
      dc.onopen = () => this.opts.onOpen();
      dc.onmessage = (e) => this.opts.onMessage(JSON.parse(String(e.data)));
      void pc
        .createOffer()
        .then((o) => pc.setLocalDescription(o))
        .then(() => this.server({ t: 'signal', data: { desc: pc.localDescription } }));
    } else {
      pc.ondatachannel = (e) => {
        this.dc = e.channel;
        e.channel.onopen = () => this.opts.onOpen();
        e.channel.onmessage = (m) => this.opts.onMessage(JSON.parse(String(m.data)));
      };
    }
  }

  private onSignal(data: { desc?: RTCSessionDescriptionInit; ice?: RTCIceCandidateInit }): void {
    const pc = this.pc;
    if (!pc) return;
    if (data.desc) {
      void pc
        .setRemoteDescription(data.desc)
        .then(() => {
          if (data.desc?.type === 'offer') {
            return pc
              .createAnswer()
              .then((a) => pc.setLocalDescription(a))
              .then(() => this.server({ t: 'signal', data: { desc: pc.localDescription } }));
          }
        })
        .catch(() => this.fail());
    } else if (data.ice) {
      void pc.addIceCandidate(data.ice).catch(() => undefined);
    }
  }

  send(msg: unknown): void {
    if (this.dc && this.dc.readyState === 'open') this.dc.send(JSON.stringify(msg));
  }

  close(): void {
    this.down = true;
    try {
      this.dc?.close();
    } catch {
      /* ignore */
    }
    try {
      this.pc?.close();
    } catch {
      /* ignore */
    }
    try {
      this.ws?.close();
    } catch {
      /* ignore */
    }
  }

  private server(msg: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  private fail(): void {
    if (this.down) return;
    this.down = true;
    this.opts.onDisconnect();
  }
}
