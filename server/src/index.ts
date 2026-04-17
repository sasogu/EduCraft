import http, { IncomingMessage } from 'http';
import { randomUUID } from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { buildAdminHtml } from './admin/panel.js';
import { AdminStore, type AdminEventType, type ServerSnapshot, type WorldSnapshot } from './admin/store.js';
import {
  BlockEdit,
  PROTOCOL_VERSION,
  PlayerState,
  ServerMessage,
  isClientMessage,
  sanitizeName,
  sanitizeWorld,
} from './protocol.js';

const PORT = Number(process.env.PORT || 8080);
const TICK_RATE = 20;
const TICK_MS = Math.round(1000 / TICK_RATE);
const SNAPSHOT_INTERVAL_MS = Number(process.env.SNAPSHOT_INTERVAL_MS || 10000);
const ADMIN_SNAPSHOT_INTERVAL_MS = Number(process.env.ADMIN_SNAPSHOT_INTERVAL_MS || 60000);
const WS_MAX_PAYLOAD_BYTES = Number(process.env.WS_MAX_PAYLOAD_BYTES || 4096);
const CLIENT_TIMEOUT_MS = Number(process.env.CLIENT_TIMEOUT_MS || 30000);
const HEARTBEAT_INTERVAL_MS = Number(process.env.HEARTBEAT_INTERVAL_MS || 10000);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 1000);
const RATE_LIMIT_MAX_MESSAGES = Number(process.env.RATE_LIMIT_MAX_MESSAGES || 80);
const MAX_INVALID_MESSAGES = Number(process.env.MAX_INVALID_MESSAGES || 5);
const MAX_COORD_ABS = Number(process.env.MAX_COORD_ABS || 10000);
const MAX_BLOCK_ID = Number(process.env.MAX_BLOCK_ID || 4096);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const adminStore = new AdminStore(process.env.ADMIN_DATA_FILE);

type Client = {
  id: string;
  name: string;
  world: string | null;
  socket: WebSocket;
  state: PlayerState;
  initialized: boolean;
  connectedAt: number;
  lastSeen: number;
  isAlive: boolean;
  invalidMessages: number;
  windowStartedAt: number;
  windowCount: number;
};

type WorldRoom = {
  name: string;
  clients: Map<WebSocket, Client>;
  dirtyPlayers: Set<string>;
  blockEdits: Map<string, BlockEdit>;
};

const clients = new Map<WebSocket, Client>();
const rooms = new Map<string, WorldRoom>();
const knownWorlds = new Set<string>();

function roomSummary(room: WorldRoom) {
  return {
    name: room.name,
    activePlayers: room.clients.size,
    blockEdits: room.blockEdits.size,
    players: Array.from(room.clients.values()).map((client) => ({
      id: client.id,
      name: client.name,
      position: {
        x: client.state.x,
        y: client.state.y,
        z: client.state.z,
      },
      connectedAt: client.connectedAt,
      lastSeen: client.lastSeen,
      sessionSeconds: Math.max(0, Math.round((Date.now() - client.connectedAt) / 1000)),
    })),
  };
}

function currentWorldSnapshots(): WorldSnapshot[] {
  return Array.from(rooms.values())
    .map((room) => ({
      name: room.name,
      activePlayers: room.clients.size,
      blockEdits: room.blockEdits.size,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function currentHealth() {
  const memory = process.memoryUsage();
  return {
    uptimeSeconds: Math.round(process.uptime()),
    memoryRssMb: Math.round(memory.rss / 1024 / 1024),
    memoryHeapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
    tickRate: TICK_RATE,
  };
}

function currentAdminSnapshot(): ServerSnapshot {
  const worlds = currentWorldSnapshots();
  const health = currentHealth();
  return {
    ts: new Date().toISOString(),
    activePlayers: clients.size,
    activeWorlds: rooms.size,
    knownWorldsSinceBoot: knownWorlds.size,
    memoryRssMb: health.memoryRssMb,
    memoryHeapUsedMb: health.memoryHeapUsedMb,
    uptimeSeconds: health.uptimeSeconds,
    worlds,
  };
}

function adminStats() {
  const worlds = Array.from(rooms.values())
    .map(roomSummary)
    .sort((a, b) => a.name.localeCompare(b.name));
  const health = currentHealth();

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    totals: {
      activePlayers: clients.size,
      activeWorlds: rooms.size,
      knownWorldsSinceBoot: knownWorlds.size,
      peakPlayers24h: adminStore.getRecentPeak(24 * 60 * 60 * 1000),
      events24h: adminStore.getRecentEventCount(24 * 60 * 60 * 1000),
    },
    health,
    worlds,
  };
}

function getOrCreateRoom(worldName: string): WorldRoom {
  const existing = rooms.get(worldName);
  if (existing) return existing;
  knownWorlds.add(worldName);
  const room: WorldRoom = {
    name: worldName,
    clients: new Map<WebSocket, Client>(),
    dirtyPlayers: new Set<string>(),
    blockEdits: new Map<string, BlockEdit>(),
  };
  rooms.set(worldName, room);
  return room;
}

function roomForClient(client: Client): WorldRoom | null {
  if (!client.world) return null;
  return rooms.get(client.world) || null;
}

function maybeDeleteRoom(room: WorldRoom) {
  if (room.clients.size === 0) {
    rooms.delete(room.name);
  }
}

function recordAdminEvent(type: AdminEventType, client: Client | null, meta?: Record<string, unknown>) {
  adminStore.recordEvent({
    type,
    clientId: client?.id,
    playerName: client?.name,
    worldName: client?.world || undefined,
    meta,
  });
}

function removeFromRoom(client: Client, notifyLeft: boolean) {
  const room = roomForClient(client);
  if (!room) return;
  room.clients.delete(client.socket);
  room.dirtyPlayers.delete(client.id);
  if (notifyLeft) {
    broadcastRoom(room, { type: 'playerLeft', v: PROTOCOL_VERSION, id: client.id });
  }
  maybeDeleteRoom(room);
}

function assignToWorld(client: Client, requestedWorld: string | undefined): WorldRoom {
  const nextWorld = sanitizeWorld(requestedWorld);
  if (client.world === nextWorld) {
    const current = getOrCreateRoom(nextWorld);
    current.clients.set(client.socket, client);
    return current;
  }

  if (client.world) {
    removeFromRoom(client, client.initialized);
  }

  client.world = nextWorld;
  const room = getOrCreateRoom(nextWorld);
  room.clients.set(client.socket, client);
  room.dirtyPlayers.add(client.id);
  return room;
}

function cleanupClient(client: Client, reason: 'player_leave' | 'client_timeout' | 'socket_error' = 'player_leave') {
  if (!clients.has(client.socket)) return;
  clients.delete(client.socket);
  removeFromRoom(client, client.initialized);

  if (client.initialized) {
    recordAdminEvent('player_leave', client, {
      reason,
      sessionSeconds: Math.max(0, Math.round((Date.now() - client.connectedAt) / 1000)),
    });
  }

  if (reason === 'client_timeout') {
    recordAdminEvent('client_timeout', client, {
      timeoutMs: CLIENT_TIMEOUT_MS,
    });
  }
}

function send(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcastRoom(room: WorldRoom, msg: ServerMessage, exclude?: WebSocket) {
  for (const client of room.clients.values()) {
    if (exclude && client.socket === exclude) continue;
    send(client.socket, msg);
  }
}

function snapshotPayload(room: WorldRoom): PlayerState[] {
  return Array.from(room.clients.values()).map((client) => client.state);
}

function deltaPayload(room: WorldRoom): PlayerState[] {
  const updates: PlayerState[] = [];
  for (const client of room.clients.values()) {
    if (!room.dirtyPlayers.has(client.id)) continue;
    updates.push(client.state);
  }
  return updates;
}

function worldEditsPayload(room: WorldRoom): BlockEdit[] {
  return Array.from(room.blockEdits.values());
}

function editKey(x: number, y: number, z: number): string {
  return `${x}|${y}|${z}`;
}

function isValidBlockUpdate(x: number, y: number, z: number, blockId: number): boolean {
  if (Math.abs(x) > MAX_COORD_ABS || Math.abs(y) > MAX_COORD_ABS || Math.abs(z) > MAX_COORD_ABS) {
    return false;
  }
  if (blockId < 0 || blockId > MAX_BLOCK_ID) {
    return false;
  }
  return Number.isInteger(blockId);
}

function sendWorldSync(client: Client, room: WorldRoom) {
  send(client.socket, {
    type: 'welcome',
    v: PROTOCOL_VERSION,
    id: client.id,
    tickRate: TICK_RATE,
    world: room.name,
  });
  send(client.socket, { type: 'snapshot', v: PROTOCOL_VERSION, players: snapshotPayload(room) });
  send(client.socket, { type: 'worldEdits', v: PROTOCOL_VERSION, edits: worldEditsPayload(room) });
}

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
  recordAdminEvent('invalid_message', client, { message, count: client.invalidMessages });
  if (client.invalidMessages >= MAX_INVALID_MESSAGES) {
    client.socket.close(1008, 'Too many invalid messages');
  }
}

function parseRangeMs(raw: string | null) {
  if (!raw || raw === '24h') return 24 * 60 * 60 * 1000;
  if (raw === '1h') return 60 * 60 * 1000;
  if (raw === '7d') return 7 * 24 * 60 * 60 * 1000;
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  return 24 * 60 * 60 * 1000;
}

function parseStepMs(raw: string | null, rangeMs: number) {
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  if (rangeMs <= 60 * 60 * 1000) return 5 * 60 * 1000;
  if (rangeMs <= 24 * 60 * 60 * 1000) return 15 * 60 * 1000;
  return 60 * 60 * 1000;
}

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (reqUrl.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, clients: clients.size, rooms: rooms.size }));
    return;
  }

  if (reqUrl.pathname === '/admin' || reqUrl.pathname === '/admin/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(buildAdminHtml());
    return;
  }

  if (reqUrl.pathname === '/admin/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(adminStats()));
    return;
  }

  if (reqUrl.pathname === '/admin/events') {
    const limit = Number(reqUrl.searchParams.get('limit') || '100');
    const type = reqUrl.searchParams.get('type') || '';
    const world = reqUrl.searchParams.get('world') || '';
    const player = reqUrl.searchParams.get('player') || '';
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({
      ok: true,
      events: adminStore.getRecentEvents({ limit, type, world, player }),
    }));
    return;
  }

  if (reqUrl.pathname === '/admin/history') {
    const rangeMs = parseRangeMs(reqUrl.searchParams.get('range'));
    const stepMs = parseStepMs(reqUrl.searchParams.get('step'), rangeMs);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({
      ok: true,
      rangeMs,
      stepMs,
      points: adminStore.getHistory({ rangeMs, stepMs }),
    }));
    return;
  }

  if (reqUrl.pathname === '/admin/worlds') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({
      ok: true,
      worlds: adminStore.getWorldInsights(24 * 60 * 60 * 1000, currentWorldSnapshots()),
    }));
    return;
  }

  if (reqUrl.pathname === '/admin/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ ok: true, health: currentHealth() }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

const wss = new WebSocketServer({ server, maxPayload: WS_MAX_PAYLOAD_BYTES });

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
    world: null,
    socket: ws,
    state,
    initialized: false,
    connectedAt: now,
    lastSeen: now,
    isAlive: true,
    invalidMessages: 0,
    windowStartedAt: now,
    windowCount: 0,
  };
  clients.set(ws, client);

  ws.on('pong', () => {
    client.isAlive = true;
    client.lastSeen = Date.now();
  });

  ws.on('message', (raw) => {
    if (!registerMessage(client)) {
      recordAdminEvent('rate_limit', client, {
        windowMs: RATE_LIMIT_WINDOW_MS,
        maxMessages: RATE_LIMIT_MAX_MESSAGES,
      });
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
        const previousWorld = client.world;
        const requestedWorld = sanitizeWorld(parsed.world);
        const isFirstHello = !client.initialized;
        const shouldResync = isFirstHello || previousWorld !== requestedWorld;
        const room = assignToWorld(client, requestedWorld);
        client.name = sanitizeName(parsed.name);
        client.state.name = client.name;
        room.dirtyPlayers.add(client.id);
        client.initialized = true;

        if (isFirstHello) {
          recordAdminEvent('player_join', client, { world: room.name });
        } else if (previousWorld !== room.name) {
          recordAdminEvent('world_change', client, { from: previousWorld, to: room.name });
        }

        if (shouldResync) {
          sendWorldSync(client, room);
        }
        break;
      }
      case 'move': {
        const room = roomForClient(client);
        if (!client.initialized || !room) {
          registerInvalidMessage(client, 'Send hello first');
          return;
        }
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
        room.dirtyPlayers.add(client.id);
        break;
      }
      case 'blockUpdate': {
        const room = roomForClient(client);
        if (!client.initialized || !room) {
          registerInvalidMessage(client, 'Send hello first');
          return;
        }
        if (typeof parsed.world === 'string' && sanitizeWorld(parsed.world) !== room.name) {
          registerInvalidMessage(client, 'World mismatch');
          return;
        }
        if (!isValidBlockUpdate(parsed.x, parsed.y, parsed.z, parsed.blockId)) {
          registerInvalidMessage(client, 'Block update out of bounds');
          return;
        }
        const update: BlockEdit = {
          x: parsed.x,
          y: parsed.y,
          z: parsed.z,
          blockId: parsed.blockId,
        };
        room.blockEdits.set(editKey(parsed.x, parsed.y, parsed.z), update);
        recordAdminEvent('block_update', client, {
          x: parsed.x,
          y: parsed.y,
          z: parsed.z,
          blockId: parsed.blockId,
        });
        broadcastRoom(room, {
          type: 'blockUpdate',
          v: PROTOCOL_VERSION,
          x: parsed.x,
          y: parsed.y,
          z: parsed.z,
          blockId: parsed.blockId,
          by: client.id,
        });
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
    cleanupClient(client, 'player_leave');
  });

  ws.on('error', () => {
    cleanupClient(client, 'socket_error');
  });
});

let lastSnapshot = Date.now();
let lastAdminSnapshot = 0;

setInterval(() => {
  const now = Date.now();
  const shouldSendSnapshot = now - lastSnapshot >= SNAPSHOT_INTERVAL_MS;
  const shouldCaptureAdminSnapshot = now - lastAdminSnapshot >= ADMIN_SNAPSHOT_INTERVAL_MS;

  for (const room of rooms.values()) {
    if (shouldSendSnapshot) {
      broadcastRoom(room, { type: 'snapshot', v: PROTOCOL_VERSION, players: snapshotPayload(room) });
    }

    if (room.dirtyPlayers.size === 0) continue;
    const delta = deltaPayload(room);
    if (delta.length > 0) {
      broadcastRoom(room, { type: 'delta', v: PROTOCOL_VERSION, players: delta });
    }
    room.dirtyPlayers.clear();
  }

  if (shouldSendSnapshot) {
    lastSnapshot = now;
  }

  if (shouldCaptureAdminSnapshot) {
    adminStore.recordSnapshot(currentAdminSnapshot());
    lastAdminSnapshot = now;
  }
}, TICK_MS);

setInterval(() => {
  const now = Date.now();
  for (const client of clients.values()) {
    if (!client.isAlive || now - client.lastSeen > CLIENT_TIMEOUT_MS) {
      client.socket.terminate();
      cleanupClient(client, 'client_timeout');
      continue;
    }
    client.isAlive = false;
    client.socket.ping();
  }
}, HEARTBEAT_INTERVAL_MS);

server.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});
