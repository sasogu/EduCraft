import http, { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import {
  PROTOCOL_VERSION,
  PlayerState,
  ServerMessage,
  isClientMessage,
  sanitizeName,
} from './protocol.js';

const PORT = Number(process.env.PORT || 8080);
const TICK_RATE = 20;
const TICK_MS = Math.round(1000 / TICK_RATE);
const SNAPSHOT_INTERVAL_MS = Number(process.env.SNAPSHOT_INTERVAL_MS || 10000);
const WS_MAX_PAYLOAD_BYTES = Number(process.env.WS_MAX_PAYLOAD_BYTES || 4096);
const CLIENT_TIMEOUT_MS = Number(process.env.CLIENT_TIMEOUT_MS || 30000);
const HEARTBEAT_INTERVAL_MS = Number(process.env.HEARTBEAT_INTERVAL_MS || 10000);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 1000);
const RATE_LIMIT_MAX_MESSAGES = Number(process.env.RATE_LIMIT_MAX_MESSAGES || 80);
const MAX_INVALID_MESSAGES = Number(process.env.MAX_INVALID_MESSAGES || 5);
const MAX_COORD_ABS = Number(process.env.MAX_COORD_ABS || 10000);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

type Client = {
  id: string;
  name: string;
  socket: WebSocket;
  state: PlayerState;
  lastSeen: number;
  isAlive: boolean;
  invalidMessages: number;
  windowStartedAt: number;
  windowCount: number;
};

const clients = new Map<WebSocket, Client>();
const dirtyPlayers = new Set<string>();

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, clients: clients.size }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

const wss = new WebSocketServer({ server, maxPayload: WS_MAX_PAYLOAD_BYTES });

function isAllowedOrigin(req: IncomingMessage): boolean {
  if (ALLOWED_ORIGINS.length === 0) return true;
  const origin = req.headers.origin;
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

function registerMessage(client: Client): boolean {
  const now = Date.now();
  if (now - client.windowStartedAt >= RATE_LIMIT_WINDOW_MS) {
    client.windowStartedAt = now;
    client.windowCount = 0;
  }
  client.windowCount += 1;
  return client.windowCount <= RATE_LIMIT_MAX_MESSAGES;
}

function registerInvalidMessage(client: Client, message: string) {
  client.invalidMessages += 1;
  send(client.socket, { type: 'error', v: PROTOCOL_VERSION, message });
  if (client.invalidMessages >= MAX_INVALID_MESSAGES) {
    client.socket.close(1008, 'Too many invalid messages');
  }
}

function cleanupClient(client: Client) {
  if (!clients.has(client.socket)) return;
  clients.delete(client.socket);
  dirtyPlayers.delete(client.id);
  broadcast({ type: 'playerLeft', v: PROTOCOL_VERSION, id: client.id });
}

function send(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcast(msg: ServerMessage, exclude?: WebSocket) {
  for (const client of clients.values()) {
    if (exclude && client.socket === exclude) continue;
    send(client.socket, msg);
  }
}

function snapshotPayload(): PlayerState[] {
  return Array.from(clients.values()).map((client) => client.state);
}

function deltaPayload(): PlayerState[] {
  const updates: PlayerState[] = [];
  for (const client of clients.values()) {
    if (!dirtyPlayers.has(client.id)) continue;
    updates.push(client.state);
  }
  return updates;
}

wss.on('connection', (ws, req) => {
  if (!isAllowedOrigin(req)) {
    ws.close(1008, 'Origin not allowed');
    return;
  }

  const id = randomUUID();
  const name = 'Player';
  const state: PlayerState = { id, name, x: 0, y: 0, z: 0 };
  const now = Date.now();
  const client: Client = {
    id,
    name,
    socket: ws,
    state,
    lastSeen: now,
    isAlive: true,
    invalidMessages: 0,
    windowStartedAt: now,
    windowCount: 0,
  };
  clients.set(ws, client);
  dirtyPlayers.add(id);

  send(ws, { type: 'welcome', v: PROTOCOL_VERSION, id, tickRate: TICK_RATE });
  send(ws, { type: 'snapshot', v: PROTOCOL_VERSION, players: snapshotPayload() });

  ws.on('pong', () => {
    client.isAlive = true;
    client.lastSeen = Date.now();
  });

  ws.on('message', (raw) => {
    if (!registerMessage(client)) {
      ws.close(1008, 'Rate limit exceeded');
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.toString());
    } catch {
      registerInvalidMessage(client, 'Invalid JSON');
      return;
    }

    if (!isClientMessage(parsed)) {
      registerInvalidMessage(client, 'Invalid message');
      return;
    }

    if (parsed.v !== PROTOCOL_VERSION) {
      registerInvalidMessage(client, 'Protocol version mismatch');
      return;
    }

    client.lastSeen = Date.now();
    client.isAlive = true;
    client.invalidMessages = 0;

    switch (parsed.type) {
      case 'hello': {
        client.name = sanitizeName(parsed.name);
        client.state.name = client.name;
        dirtyPlayers.add(client.id);
        break;
      }
      case 'move': {
        if (
          Math.abs(parsed.x) > MAX_COORD_ABS ||
          Math.abs(parsed.y) > MAX_COORD_ABS ||
          Math.abs(parsed.z) > MAX_COORD_ABS
        ) {
          registerInvalidMessage(client, 'Move out of bounds');
          return;
        }
        client.state.x = parsed.x;
        client.state.y = parsed.y;
        client.state.z = parsed.z;
        dirtyPlayers.add(client.id);
        break;
      }
      case 'ping': {
        send(ws, { type: 'pong', v: PROTOCOL_VERSION, t: parsed.t });
        break;
      }
      default:
        break;
    }
  });

  ws.on('close', () => {
    cleanupClient(client);
  });

  ws.on('error', () => {
    cleanupClient(client);
  });
});

let lastSnapshot = Date.now();

setInterval(() => {
  const now = Date.now();
  if (now - lastSnapshot >= SNAPSHOT_INTERVAL_MS) {
    const snapshot = snapshotPayload();
    broadcast({ type: 'snapshot', v: PROTOCOL_VERSION, players: snapshot });
    lastSnapshot = now;
  }
  if (dirtyPlayers.size === 0) return;
  const delta = deltaPayload();
  if (delta.length > 0) {
    broadcast({ type: 'delta', v: PROTOCOL_VERSION, players: delta });
  }
  dirtyPlayers.clear();
}, TICK_MS);

setInterval(() => {
  const now = Date.now();
  for (const client of clients.values()) {
    if (!client.isAlive || now - client.lastSeen > CLIENT_TIMEOUT_MS) {
      client.socket.terminate();
      cleanupClient(client);
      continue;
    }
    client.isAlive = false;
    client.socket.ping();
  }
}, HEARTBEAT_INTERVAL_MS);

server.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});
