import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEmptiedTodayRooms } from './emptiedToday.js';

function check(id, number, type, time) {
  return {
    id,
    type,
    checkDate: new Date(time),
    room: { number }
  };
}

test('includes a room whose latest event today is an emptying', () => {
  const rooms = buildEmptiedTodayRooms([
    check(1, 1700, 'vk_emptied', '2026-10-22T09:00:00.000Z')
  ]);
  assert.deepEqual(rooms, [{
    number: 1700,
    time: '2026-10-22T09:00:00.000Z'
  }]);
});

test('removes a room when a regular room message follows emptying', () => {
  const rooms = buildEmptiedTodayRooms([
    check(1, 1700, 'vk_emptied', '2026-10-22T09:00:00.000Z'),
    check(2, 1700, 'vk_room', '2026-10-22T10:00:00.000Z')
  ]);
  assert.deepEqual(rooms, []);
});

test('keeps the room when emptying follows a regular room message', () => {
  const rooms = buildEmptiedTodayRooms([
    check(1, 1700, 'vk_room', '2026-10-22T09:00:00.000Z'),
    check(2, 1700, 'vk_emptied', '2026-10-22T10:00:00.000Z')
  ]);
  assert.deepEqual(rooms, [{
    number: 1700,
    time: '2026-10-22T10:00:00.000Z'
  }]);
});

test('evaluates each room independently and uses id to break timestamp ties', () => {
  const rooms = buildEmptiedTodayRooms([
    check(4, 1700, 'vk_emptied', '2026-10-22T10:00:00.000Z'),
    check(5, 1700, 'vk_room', '2026-10-22T10:00:00.000Z'),
    check(6, 1701, 'vk_emptied', '2026-10-22T11:00:00.000Z')
  ]);
  assert.deepEqual(rooms, [{
    number: 1701,
    time: '2026-10-22T11:00:00.000Z'
  }]);
});
