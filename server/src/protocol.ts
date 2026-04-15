export const PROTOCOL_VERSION = 1;

export type BlockEdit = {
  x: number;
  y: number;
  z: number;
  blockId: number;
};

export type PlayerState = {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
};

export type ClientMessage =
  | { type: 'hello'; v: number; name?: string; world?: string }
  | { type: 'move'; v: number; x: number; y: number; z: number }
  | { type: 'blockUpdate'; v: number; world?: string; x: number; y: number; z: number; blockId: number }
  | { type: 'ping'; v: number; t: number };

export type ServerMessage =
  | { type: 'welcome'; v: number; id: string; tickRate: number; world: string }
  | { type: 'snapshot'; v: number; players: PlayerState[] }
  | { type: 'delta'; v: number; players: PlayerState[] }
  | { type: 'playerLeft'; v: number; id: string }
  | { type: 'worldEdits'; v: number; edits: BlockEdit[] }
  | { type: 'blockUpdate'; v: number; x: number; y: number; z: number; blockId: number; by: string }
  | { type: 'pong'; v: number; t: number }
  | { type: 'error'; v: number; message: string };

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isInteger(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value);
}

export function isClientMessage(value: unknown): value is ClientMessage {
  if (!value || typeof value !== 'object') return false;
  const msg = value as { type?: unknown; v?: unknown };
  if (typeof msg.type !== 'string' || !isNumber(msg.v)) return false;

  switch (msg.type) {
    case 'hello': {
      const m = value as { name?: unknown; world?: unknown };
      const validName = typeof m.name === 'undefined' || typeof m.name === 'string';
      const validWorld = typeof m.world === 'undefined' || typeof m.world === 'string';
      return validName && validWorld;
    }
    case 'move': {
      const m = value as { x?: unknown; y?: unknown; z?: unknown };
      return isNumber(m.x) && isNumber(m.y) && isNumber(m.z);
    }
    case 'blockUpdate': {
      const m = value as { world?: unknown; x?: unknown; y?: unknown; z?: unknown; blockId?: unknown };
      const validWorld = typeof m.world === 'undefined' || typeof m.world === 'string';
      return validWorld && isInteger(m.x) && isInteger(m.y) && isInteger(m.z) && isInteger(m.blockId);
    }
    case 'ping': {
      const m = value as { t?: unknown };
      return isNumber(m.t);
    }
    default:
      return false;
  }
}

export function sanitizeName(name: string | undefined): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return 'Player';
  return trimmed.slice(0, 24);
}

export function sanitizeWorld(world: string | undefined): string {
  const cleaned = (world || '').trim().replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
  return cleaned || 'default';
}
