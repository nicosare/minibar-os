import { PrismaClient } from '@prisma/client';
import { recordPrismaMutation } from './live-events.js';

export const prisma = new PrismaClient();

const MUTATING_ACTIONS = new Set([
  'create',
  'createMany',
  'createManyAndReturn',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'upsert',
  'delete',
  'deleteMany',
  'executeRaw',
  'executeRawUnsafe',
  'runCommandRaw'
]);

// The shared change tracker sees writes from every API route and Prisma-backed
// source (web UI, VK bot, Mini App, and future modules). Request-level events
// are delivered only after the HTTP response completes, after transactions commit.
prisma.$use(async (params, next) => {
  const result = await next(params);
  if (MUTATING_ACTIONS.has(params.action)) {
    recordPrismaMutation(params.model || 'Unknown', params.action);
  }
  return result;
});
