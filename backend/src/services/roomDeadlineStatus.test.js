import test from 'node:test';
import assert from 'node:assert/strict';
import { setRoomDeadlineStatus } from './roomDeadlineStatus.js';

function createTx({ expiryStatus = 'valid', statuses = [] } = {}) {
  const room = { id: 17, number: 1704, expiryStatus };
  const state = {
    room,
    statuses: statuses.map(item => ({ ...item })),
    lockCalls: 0,
    roomUpdates: [],
    deletedStatuses: 0,
    deadlineEvents: [],
    dailyStatUpserts: [],
    targetLookups: 0
  };

  const tx = {
    $queryRaw: async () => { state.lockCalls += 1; },
    room: {
      findUnique: async () => state.room,
      update: async ({ data }) => {
        state.roomUpdates.push(data);
        Object.assign(state.room, data);
        return state.room;
      },
      groupBy: async () => [{ expiryStatus: 'empty', _count: { id: 1 } }],
      count: async () => 1
    },
    roomProductStatus: {
      findMany: async () => state.statuses,
      deleteMany: async () => {
        state.deletedStatuses += state.statuses.length;
        state.statuses = [];
        return { count: state.deletedStatuses };
      }
    },
    check: {
      create: async ({ data }) => {
        state.deadlineEvents.push(data);
        return data;
      }
    },
    deadlineDailyStat: {
      upsert: async args => {
        state.dailyStatUpserts.push(args);
        return args.create;
      }
    },
    deadlineTarget: {
      findUnique: async ({ where }) => {
        state.targetLookups += 1;
        return {
          date: where.date,
          targetCount: 1,
          startBadCount: 1,
          lockedAt: new Date('2026-11-01T00:00:00.000Z')
        };
      }
    }
  };

  return { tx, state };
}

test('sets GIH room empty like Deadlines and records a reversible status event', async () => {
  const checkedAt = new Date('2026-11-08T10:00:00.000Z');
  const { tx, state } = createTx({
    expiryStatus: 'needs_replacement',
    statuses: [{
      productId: 8,
      expiryStatus: 'needs_replacement',
      qtyToReplace: 2,
      checkedAt,
      product: { name: 'Минеральная вода' }
    }]
  });

  const result = await setRoomDeadlineStatus(tx, {
    roomId: 17,
    roomStatus: 'empty',
    note: 'Номер автоматически отмечен как опустошённый после GIH',
    skipIfSame: true
  }, 300);

  assert.equal(result.changed, true);
  assert.equal(state.lockCalls, 1);
  assert.equal(state.room.expiryStatus, 'empty');
  assert.deepEqual(state.roomUpdates, [{ expiryStatus: 'empty' }]);
  assert.equal(state.deletedStatuses, 1);
  assert.deepEqual(state.statuses, []);
  assert.equal(state.deadlineEvents.length, 1);

  const event = state.deadlineEvents[0];
  assert.equal(event.type, 'deadline');
  assert.equal(event.status, 'done');
  assert.equal(event.operationSnapshot.before.roomStatus, 'needs_replacement');
  assert.deepEqual(event.operationSnapshot.before.products, [{
    productId: 8,
    expiryStatus: 'needs_replacement',
    qtyToReplace: 2,
    checkedAt: checkedAt.toISOString()
  }]);
  assert.deepEqual(event.operationSnapshot.after, { roomStatus: 'empty', products: [] });

  const notes = JSON.parse(event.notes);
  assert.equal(notes.action, 'emptied');
  assert.equal(notes.previousStatus, 'needs_replacement');
  assert.equal(notes.newStatus, 'empty');
  assert.equal(notes.note, 'Номер автоматически отмечен как опустошённый после GIH');
  assert.equal(state.dailyStatUpserts.length, 1);
  assert.equal(state.targetLookups, 2);
});

test('does nothing when Deadlines already marks the room empty', async () => {
  const { tx, state } = createTx({
    expiryStatus: 'empty',
    statuses: [{
      productId: 8,
      expiryStatus: 'needs_replacement',
      qtyToReplace: 2,
      checkedAt: new Date('2026-11-08T10:00:00.000Z'),
      product: { name: 'Минеральная вода' }
    }]
  });

  const result = await setRoomDeadlineStatus(tx, {
    roomId: 17,
    roomStatus: 'empty',
    skipIfSame: true
  }, 300);

  assert.equal(result.changed, false);
  assert.equal(state.lockCalls, 1);
  assert.equal(state.roomUpdates.length, 0);
  assert.equal(state.deletedStatuses, 0);
  assert.equal(state.deadlineEvents.length, 0);
  assert.equal(state.dailyStatUpserts.length, 0);
  assert.equal(state.targetLookups, 0);
  assert.equal(state.statuses.length, 1);
});
