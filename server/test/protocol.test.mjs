import test from 'node:test';
import assert from 'node:assert/strict';

import { PROTOCOL_VERSION, isClientMessage, sanitizeName, sanitizeWorld } from '../dist/protocol.js';

test('sanitizeName uses a safe default for empty values', () => {
  assert.equal(sanitizeName(undefined), 'PLY');
  assert.equal(sanitizeName('   '), 'PLY');
});

test('sanitizeName only accepts 3 alphanumeric chars', () => {
  assert.equal(sanitizeName(' a1b '), 'A1B');
  assert.equal(sanitizeName('ab'), 'PLY');
  assert.equal(sanitizeName('abcd'), 'PLY');
  assert.equal(sanitizeName('a-b'), 'PLY');
});

test('isClientMessage accepts valid hello, move and ping messages', () => {
  assert.equal(isClientMessage({ type: 'hello', v: PROTOCOL_VERSION, name: 'Ada', world: 'ABC' }), true);
  assert.equal(isClientMessage({ type: 'move', v: PROTOCOL_VERSION, x: 1, y: 2, z: 3 }), true);
  assert.equal(
    isClientMessage({ type: 'blockUpdate', v: PROTOCOL_VERSION, x: 1, y: 2, z: 3, blockId: 5, world: 'ABC' }),
    true,
  );
  assert.equal(isClientMessage({ type: 'ping', v: PROTOCOL_VERSION, t: Date.now() }), true);
});

test('isClientMessage rejects malformed payloads', () => {
  assert.equal(isClientMessage(null), false);
  assert.equal(isClientMessage({}), false);
  assert.equal(isClientMessage({ type: 'hello', v: '1' }), false);
  assert.equal(isClientMessage({ type: 'move', v: PROTOCOL_VERSION, x: 1, y: 2 }), false);
  assert.equal(
    isClientMessage({ type: 'blockUpdate', v: PROTOCOL_VERSION, x: 1, y: 2, z: 3, blockId: 1.5 }),
    false,
  );
  assert.equal(isClientMessage({ type: 'ping', v: PROTOCOL_VERSION, t: Number.NaN }), false);
  assert.equal(isClientMessage({ type: 'dance', v: PROTOCOL_VERSION }), false);
});

test('sanitizeWorld normalizes values and falls back to default', () => {
  assert.equal(sanitizeWorld(' abc '), 'ABC');
  assert.equal(sanitizeWorld('a!b@c#'), 'ABC');
  assert.equal(sanitizeWorld(''), 'default');
  assert.equal(sanitizeWorld(undefined), 'default');
});
