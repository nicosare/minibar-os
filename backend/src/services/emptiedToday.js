export function buildEmptiedTodayRooms(items) {
  const ordered = (Array.isArray(items) ? [...items] : []).sort((a, b) => {
    const timeDifference = new Date(b.checkDate).getTime() - new Date(a.checkDate).getTime();
    if (Number.isFinite(timeDifference) && timeDifference !== 0) return timeDifference;
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });

  const latestByRoom = new Map();
  for (const item of ordered) {
    if (item?.room?.number === undefined || item?.room?.number === null) continue;
    const key = String(item.room.number);
    if (!latestByRoom.has(key)) latestByRoom.set(key, item);
  }

  return [...latestByRoom.values()]
    .filter(item => item.type === 'vk_emptied' && item.room && item.checkDate)
    .map(item => ({
      number: item.room.number,
      time: new Date(item.checkDate).toISOString()
    }))
    .sort((a, b) => Date.parse(a.time) - Date.parse(b.time) ||
      String(a.number).localeCompare(String(b.number), 'ru'));
}
