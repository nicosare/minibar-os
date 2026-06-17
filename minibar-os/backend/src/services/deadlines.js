import {
  startOfLocalDay,
  endOfLocalMonth,
  addLocalDays,
  daysLeftInclusive
} from '../lib/timezone.js';

const BAD_STATUSES = ['neutral', 'needs_replacement'];

export async function getBadCount(tx) {
  return tx.room.count({
    where: { expiryStatus: { in: BAD_STATUSES } }
  });
}

export async function recalcTomorrowTarget(tx, offsetMinutes = null) {
  const now = new Date();
  const tomorrow = addLocalDays(startOfLocalDay(now, offsetMinutes), 1, offsetMinutes);
  const monthEnd = endOfLocalMonth(now, offsetMinutes);
  const daysLeft = daysLeftInclusive(tomorrow, monthEnd);
  const badCount = await getBadCount(tx);
  const target = Math.ceil(badCount / daysLeft);
  
  await tx.deadlineTarget.upsert({
    where: { date: tomorrow },
    update: { targetCount: target },
    create: { date: tomorrow, targetCount: target, startBadCount: 0, lockedAt: null }
  });
  
  return { target, daysLeft, badCount };
}

export async function ensureTodayTarget(tx, offsetMinutes = null) {
  const today = startOfLocalDay(new Date(), offsetMinutes);
  
  // Пытаемся найти существующую запись
  let todayTarget = await tx.deadlineTarget.findUnique({ where: { date: today } });
  
  // КРИТИЧНО: если цель УЖЕ зафиксирована — возвращаем как есть, НИЧЕГО не меняем
  if (todayTarget?.lockedAt) {
    console.log('🔒 Today target locked:', { 
      date: today.toISOString().split('T')[0],
      startBad: todayTarget.startBadCount,
      target: todayTarget.targetCount
    });
    return todayTarget;
  }
  
  const badCount = await getBadCount(tx);
  const daysLeft = daysLeftInclusive(today, endOfLocalMonth(new Date(), offsetMinutes));
  const target = Math.ceil(badCount / Math.max(1, daysLeft));
  
  if (!todayTarget) {
    console.log('🆕 Creating today target:', { 
      date: today.toISOString().split('T')[0], 
      badCount, 
      target 
    });
    return tx.deadlineTarget.create({
      data: {
        date: today,
        targetCount: target,
        startBadCount: badCount,
        lockedAt: new Date()
      }
    });
  }
  
  // Обновляем незафиксированную запись
  console.log('🔧 Locking existing target:', { 
    date: today.toISOString().split('T')[0], 
    badCount, 
    target 
  });
  return tx.deadlineTarget.update({
    where: { date: today },
    data: { lockedAt: new Date(), startBadCount: badCount, targetCount: target }
  });
}

export async function updateAllTargets(tx, offsetMinutes = null) {
  await ensureTodayTarget(tx, offsetMinutes);
  await recalcTomorrowTarget(tx, offsetMinutes);
}

export async function upsertTodayRoomStats(tx, offsetMinutes = null) {
  const today = startOfLocalDay(new Date(), offsetMinutes);
  const counts = await tx.room.groupBy({
    by: ['expiryStatus'],
    _count: { id: true }
  });
  const stats = { valid: 0, empty: 0, needs_replacement: 0, neutral: 0 };
  counts.forEach(c => { stats[c.expiryStatus] = c._count.id; });
  
  return tx.deadlineDailyStat.upsert({
    where: { date: today },
    update: {
      validCount: stats.valid,
      emptyCount: stats.empty,
      needsReplacementCount: stats.needs_replacement,
      neutralCount: stats.neutral
    },
    create: {
      date: today,
      validCount: stats.valid,
      emptyCount: stats.empty,
      needsReplacementCount: stats.needs_replacement,
      neutralCount: stats.neutral
    }
  });
}

export async function buildTargetsResponse(tx, offsetMinutes = null) {
  const todayTarget = await ensureTodayTarget(tx, offsetMinutes);
  const tomorrowData = await recalcTomorrowTarget(tx, offsetMinutes);
  const badCount = await getBadCount(tx);
  const totalRooms = await tx.room.count();
  const processedToday = Math.max(0, todayTarget.startBadCount - badCount);
  
  console.log('🎯 Targets:', {
    date: todayTarget.date,
    startBadCount: todayTarget.startBadCount,
    currentBadCount: badCount,
    target: todayTarget.targetCount,
    processed: processedToday,
    lockedAt: todayTarget.lockedAt
  });
  
  const percentage = todayTarget.targetCount > 0
    ? Math.min(100, Math.round((processedToday / todayTarget.targetCount) * 100))
    : 0;

  return {
    today: {
      target: todayTarget.targetCount,
      processed: processedToday,
      percentage,
      startBadCount: todayTarget.startBadCount
    },
    tomorrow: {
      target: tomorrowData.target,
      daysLeft: tomorrowData.daysLeft
    },
    summary: {
      badCount,
      totalRooms,
      goodCount: totalRooms - badCount
    }
  };
}