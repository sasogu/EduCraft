import http from 'http';
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

type Client = {
  id: string;
  name: string;
  socket: WebSocket;
  state: PlayerState;
  lastSeen: number;
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

const wss = new WebSocketServer({ server });

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

wss.on('connection', (ws) => {
  const id = randomUUID();
  const name = 'Player';
  const state: PlayerState = { id, name, x: 0, y: 0, z: 0 };
  const client: Client = { id, name, socket: ws, state, lastSeen: Date.now() };
  clients.set(ws, client);
  dirtyPlayers.add(id);

  send(ws, { type: 'welcome', v: PROTOCOL_VERSION, id, tickRate: TICK_RATE });
  send(ws, { type: 'snapshot', v: PROTOCOL_VERSION, players: snapshotPayload() });

  ws.on('message', (raw) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.toString());
    } catch (err) {
      send(ws, { type: 'error', v: PROTOCOL_VERSION, message: 'Invalid JSON' });
      return;
    }

    if (!isClientMessage(parsed)) {
      send(ws, { type: 'error', v: PROTOCOL_VERSION, message: 'Invalid message' });
      return;
    }

    if (parsed.v !== PROTOCOL_VERSION) {
      send(ws, { type: 'error', v: PROTOCOL_VERSION, message: 'Protocol version mismatch' });
      return;
    }

    client.lastSeen = Date.now();

    switch (parsed.type) {
      case 'hello': {
        client.name = sanitizeName(parsed.name);
        client.state.name = client.name;
        dirtyPlayers.add(client.id);
        break;
      }
      case 'move': {
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
    clients.delete(ws);
    dirtyPlayers.delete(client.id);
    broadcast({ type: 'playerLeft', v: PROTOCOL_VERSION, id: client.id });
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

server.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});
