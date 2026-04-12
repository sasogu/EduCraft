import test from 'node:test';
import assert from 'node:assert/strict';

import { PROTOCOL_VERSION, isClientMessage, sanitizeName } from '../dist/protocol.js';

test('sanitizeName uses a safe default for empty values', () => {
  assert.equal(sanitizeName(undefined), 'Player');
  assert.equal(sanitizeName('   '), 'Player');
});

test('sanitizeName trims input and caps length', () => {
  assert.equal(sanitizeName('  Ada Lovelace  '), 'Ada Lovelace');
  assert.equal(sanitizeName('abcdefghijklmnopqrstuvwxy'), 'abcdefghijklmnopqrstuvwx');
});

test('isClientMessage accepts valid hello, move and ping messages', () => {
  assert.equal(isClientMessage({ type: 'hello', v: PROTOCOL_VERSION, name: 'Ada' }), true);
  assert.equal(isClientMessage({ type: 'move', v: PROTOCOL_VERSION, x: 1, y: 2, z: 3 }), true);
  assert.equal(isClientMessage({ type: 'ping', v: PROTOCOL_VERSION, t: Date.now() }), true);
});

test('isClientMessage rejects malformed payloads', () => {
  assert.equal(isClientMessage(null), false);
  assert.equal(isClientMessage({}), false);
  assert.equal(isClientMessage({ type: 'hello', v: '1' }), false);
  assert.equal(isClientMessage({ type: 'move', v: PROTOCOL_VERSION, x: 1, y: 2 }), false);
  assert.equal(isClientMessage({ type: 'ping', v: PROTOCOL_VERSION, t: Number.NaN }), false);
  assert.equal(isClientMessage({ type: 'dance', v: PROTOCOL_VERSION }), false);
});
