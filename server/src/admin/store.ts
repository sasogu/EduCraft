import fs from 'fs';
import path from 'path';

export type AdminEventType =
  | 'player_join'
  | 'player_leave'
  | 'world_change'
  | 'invalid_message'
  | 'rate_limit'
  | 'client_timeout'
  | 'block_update';

export type AdminEvent = {
  id: string;
  ts: string;
  type: AdminEventType;
  clientId?: string;
  playerName?: string;
  worldName?: string;
  meta?: Record<string, unknown>;
};

export type WorldSnapshot = {
  name: string;
  activePlayers: number;
  blockEdits: number;
};

export type ServerSnapshot = {
  ts: string;
  activePlayers: number;
  activeWorlds: number;
  knownWorldsSinceBoot: number;
  memoryRssMb: number;
  memoryHeapUsedMb: number;
  uptimeSeconds: number;
  worlds: WorldSnapshot[];
};

type PersistedAdminStore = {
  events: AdminEvent[];
  snapshots: ServerSnapshot[];
};

type EventFilters = {
  limit?: number;
  type?: string;
  world?: string;
  player?: string;
};

type HistoryOptions = {
  rangeMs: number;
  stepMs: number;
};

const DEFAULT_MAX_EVENTS = 2500;
const DEFAULT_MAX_SNAPSHOTS = 5000;

function toIso(value: number): string {
  return new Date(value).toISOString();
}

export class AdminStore {
  private readonly filePath: string;
  private readonly maxEvents: number;
  private readonly maxSnapshots: number;
  private events: AdminEvent[] = [];
  private snapshots: ServerSnapshot[] = [];
  private persistTimer: NodeJS.Timeout | null = null;

  constructor(filePath?: string, maxEvents = DEFAULT_MAX_EVENTS, maxSnapshots = DEFAULT_MAX_SNAPSHOTS) {
    this.filePath = filePath || path.join(process.cwd(), 'admin-data', 'admin-store.json');
    this.maxEvents = maxEvents;
    this.maxSnapshots = maxSnapshots;
    this.load();
  }

  recordEvent(event: Omit<AdminEvent, 'id' | 'ts'> & { ts?: string }) {
    this.events.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: event.ts || toIso(Date.now()),
      type: event.type,
      clientId: event.clientId,
      playerName: event.playerName,
      worldName: event.worldName,
      meta: event.meta,
    });
    if (this.events.length > this.maxEvents) {
      this.events.splice(0, this.events.length - this.maxEvents);
    }
    this.schedulePersist();
  }

  recordSnapshot(snapshot: ServerSnapshot) {
    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.splice(0, this.snapshots.length - this.maxSnapshots);
    }
    this.schedulePersist();
  }

  getRecentEvents(filters: EventFilters = {}) {
    const limit = Math.max(1, Math.min(Number(filters.limit || 100), 500));
    const player = (filters.player || '').trim().toLowerCase();
    const world = (filters.world || '').trim().toLowerCase();
    const type = (filters.type || '').trim().toLowerCase();

    return this.events
      .filter((event) => {
        if (type && event.type.toLowerCase() !== type) return false;
        if (world && (event.worldName || '').toLowerCase() !== world) return false;
        if (player && (event.playerName || '').toLowerCase() !== player) return false;
        return true;
      })
      .slice(-limit)
      .reverse();
  }

  getHistory(options: HistoryOptions) {
    const now = Date.now();
    const rangeStart = now - options.rangeMs;
    const buckets = new Map<number, ServerSnapshot>();

    for (const snapshot of this.snapshots) {
      const ts = Date.parse(snapshot.ts);
      if (!Number.isFinite(ts) || ts < rangeStart) continue;
      const bucketTs = Math.floor(ts / options.stepMs) * options.stepMs;
      buckets.set(bucketTs, snapshot);
    }

    return Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([bucketTs, snapshot]) => ({
        ts: toIso(bucketTs),
        activePlayers: snapshot.activePlayers,
        activeWorlds: snapshot.activeWorlds,
        memoryRssMb: snapshot.memoryRssMb,
        memoryHeapUsedMb: snapshot.memoryHeapUsedMb,
      }));
  }

  getRecentPeak(rangeMs: number) {
    const since = Date.now() - rangeMs;
    let peak = 0;
    for (const snapshot of this.snapshots) {
      const ts = Date.parse(snapshot.ts);
      if (!Number.isFinite(ts) || ts < since) continue;
      peak = Math.max(peak, snapshot.activePlayers);
    }
    return peak;
  }

  getRecentEventCount(rangeMs: number) {
    const since = Date.now() - rangeMs;
    let total = 0;
    for (const event of this.events) {
      const ts = Date.parse(event.ts);
      if (!Number.isFinite(ts) || ts < since) continue;
      total += 1;
    }
    return total;
  }

  getWorldInsights(rangeMs: number, currentWorlds: WorldSnapshot[]) {
    const since = Date.now() - rangeMs;
    const map = new Map<string, { peakPlayers: number; lastSeenAt: string | null; latestBlockEdits: number }>();

    for (const world of currentWorlds) {
      map.set(world.name, {
        peakPlayers: world.activePlayers,
        lastSeenAt: null,
        latestBlockEdits: world.blockEdits,
      });
    }

    for (const snapshot of this.snapshots) {
      const ts = Date.parse(snapshot.ts);
      if (!Number.isFinite(ts) || ts < since) continue;
      for (const world of snapshot.worlds) {
        const current = map.get(world.name) || {
          peakPlayers: 0,
          lastSeenAt: null,
          latestBlockEdits: 0,
        };
        current.peakPlayers = Math.max(current.peakPlayers, world.activePlayers);
        current.lastSeenAt = snapshot.ts;
        current.latestBlockEdits = world.blockEdits;
        map.set(world.name, current);
      }
    }

    return Array.from(map.entries())
      .map(([name, values]) => ({
        name,
        peakPlayers24h: values.peakPlayers,
        lastSeenAt: values.lastSeenAt,
        blockEdits: values.latestBlockEdits,
        activePlayers: currentWorlds.find((world) => world.name === name)?.activePlayers || 0,
      }))
      .sort((a, b) => {
        if (b.activePlayers !== a.activePlayers) return b.activePlayers - a.activePlayers;
        return b.peakPlayers24h - a.peakPlayers24h;
      });
  }

  private load() {
    try {
      if (!fs.existsSync(this.filePath)) return;
      const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as PersistedAdminStore;
      this.events = Array.isArray(parsed.events) ? parsed.events.slice(-this.maxEvents) : [];
      this.snapshots = Array.isArray(parsed.snapshots) ? parsed.snapshots.slice(-this.maxSnapshots) : [];
    } catch (error) {
      console.warn('[admin] failed to load persisted admin store', error);
      this.events = [];
      this.snapshots = [];
    }
  }

  private schedulePersist() {
    if (this.persistTimer) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.persist();
    }, 1000);
  }

  private persist() {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      const payload: PersistedAdminStore = {
        events: this.events,
        snapshots: this.snapshots,
      };
      fs.writeFileSync(this.filePath, JSON.stringify(payload, null, 2));
    } catch (error) {
      console.warn('[admin] failed to persist admin store', error);
    }
  }
}
