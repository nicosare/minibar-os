'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createPeerResolver } = require('./peer-id');

test('uses the bot\'s single allowed chat when no default is configured', () => {
  const resolve = createPeerResolver({ allowedPeerIds: ['2000000001'] });
  assert.equal(resolve(), '2000000001');
});

test('single bot chat overrides stale client peer_id and mismatched default', () => {
  const resolve = createPeerResolver({
    defaultPeerId: '54809268',
    allowedPeerIds: ['2000000001']
  });
  assert.equal(resolve('54809268'), '2000000001');
});

test('uses explicit server default when several chats are allowed', () => {
  const resolve = createPeerResolver({
    defaultPeerId: '2000000777',
    allowedPeerIds: ['2000000001', '2000000777']
  });
  assert.equal(resolve('2000000001'), '2000000777');
});

test('does not guess when several chats are allowed and neither default nor peer_id is supplied', () => {
  const resolve = createPeerResolver({
    allowedPeerIds: ['2000000001', '2000000777']
  });
  assert.throws(resolve, /VK_DEFAULT_PEER_ID не настроен/);
});

test('refuses a target outside the allowlist when several chats are allowed', () => {
  const resolve = createPeerResolver({
    allowedPeerIds: ['2000000001', '2000000777']
  });
  assert.throws(() => resolve('2000000999'), /отсутствует в VK_BOT_ALLOWED_PEER_IDS/);
});

test('requires an allowlist even if a default target is set', () => {
  const resolve = createPeerResolver({ defaultPeerId: '2000000001', allowedPeerIds: [] });
  assert.throws(resolve, /VK_BOT_ALLOWED_PEER_IDS не настроен/);
});
