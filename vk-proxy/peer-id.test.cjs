'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createPeerResolver } = require('./peer-id');

test('uses the single allowed chat when no default is configured', () => {
  const resolve = createPeerResolver({ allowedPeerIds: ['2000000352'] });
  assert.equal(resolve(), '2000000352');
});

test('uses explicit default when several chats are allowed', () => {
  const resolve = createPeerResolver({
    defaultPeerId: '2000000777',
    allowedPeerIds: ['2000000352', '2000000777']
  });
  assert.equal(resolve(), '2000000777');
});

test('does not guess when several chats are allowed and there is no default', () => {
  const resolve = createPeerResolver({
    allowedPeerIds: ['2000000352', '2000000777']
  });
  assert.throws(resolve, /VK_DEFAULT_PEER_ID не настроен/);
});

test('refuses a target outside the allowlist', () => {
  const resolve = createPeerResolver({ allowedPeerIds: ['2000000352'] });
  assert.throws(() => resolve('2000000777'), /отсутствует в VK_BOT_ALLOWED_PEER_IDS/);
});

test('requires an allowlist even if a default target is set', () => {
  const resolve = createPeerResolver({ defaultPeerId: '2000000352', allowedPeerIds: [] });
  assert.throws(resolve, /VK_BOT_ALLOWED_PEER_IDS не настроен/);
});
