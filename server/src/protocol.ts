export const PROTOCOL_VERSION = 1;

export type PlayerState = {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
};

export type ClientMessage =
  | { type: 'hello'; v: number; name?: string }
  | { type: 'move'; v: number; x: number; y: number; z: number }
  | { type: 'ping'; v: number; t: number };

export type ServerMessage =
  | { type: 'welcome'; v: number; id: string; tickRate: number }
  | { type: 'snapshot'; v: number; players: PlayerState[] }
  | { type: 'delta'; v: number; players: PlayerState[] }
  | { type: 'playerLeft'; v: number; id: string }
  | { type: 'pong'; v: number; t: number }
  | { type: 'error'; v: number; message: string };

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isClientMessage(value: unknown): value is ClientMessage {
  if (!value || typeof value !== 'object') return false;
  const msg = value as { type?: unknown; v?: unknown };
  if (typeof msg.type !== 'string' || !isNumber(msg.v)) return false;

  switch (msg.type) {
    case 'hello': {
      const name = (value as { name?: unknown }).name;
      return typeof name === 'undefined' || typeof name === 'string';
    }
    case 'move': {
      const m = value as { x?: unknown; y?: unknown; z?: unknown };
      return isNumber(m.x) && isNumber(m.y) && isNumber(m.z);
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
