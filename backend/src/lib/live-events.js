import { AsyncLocalStorage } from 'node:async_hooks';
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

const changeContext = new AsyncLocalStorage();
const emitter = new EventEmitter();
emitter.setMaxListeners(0);

const instanceId = randomUUID();
let eventSequence = 0;
const eventHistory = [];
const EVENT_HISTORY_LIMIT = 500;

const MODEL_DOMAINS = {
  Product: ['products', 'templates', 'rooms', 'deadlines', 'dashboard', 'inventory', 'calculator', 'settings'],
  Room: ['rooms', 'deadlines', 'dashboard', 'lists', 'gih', 'calculator', 'miniapp'],
  RoomProductStatus: ['rooms', 'deadlines', 'dashboard'],
  RoomCustom: ['rooms', 'templates', 'calculator'],
  ReplacementItem: ['rooms', 'deadlines', 'calculator'],
  Check: ['history', 'dashboard', 'gih'],
  GihItem: ['history', 'dashboard', 'gih'],
  Excise: ['excises'],
  FillTemplate: ['templates', 'rooms', 'calculator', 'settings'],
  TemplateItem: ['templates', 'rooms', 'calculator', 'settings'],
  ProductMonthCheck: ['deadlines', 'products', 'settings'],
  DeadlineDailyStat: ['deadlines', 'dashboard'],
  DeadlineTarget: ['deadlines', 'dashboard'],
  MiniAppRoomTask: ['miniapp', 'rooms', 'dashboard'],
  VkBotEvent: ['bot'],
  ActiveList: ['lists'],
  ListRoom: ['lists'],
  Setting: ['settings']
};

function cleanClientId(value) {
  const id = String(value || '').trim();
  return /^[a-zA-Z0-9_-]{1,120}$/.test(id) ? id : null;
}

function sourceForRequest(req) {
  const path = String(req.path || '');
  if (path.startsWith('/api/vk-bot')) return 'vk-bot';
  if (path.startsWith('/api/miniapp')) return 'miniapp';
  if (path.startsWith('/api/events')) return 'events';
  return path.startsWith('/api/') ? 'api' : 'server';
}

function domainsForModels(models) {
  const domains = new Set();
  for (const model of models) {
    const mapped = MODEL_DOMAINS[model];
    if (!mapped) {
      domains.add('all');
      continue;
    }
    mapped.forEach(domain => domains.add(domain));
  }
  if (domains.has('all')) return ['all'];
  return [...domains].sort();
}

export function publishDataChanged({
  models = [],
  actions = [],
  source = 'service',
  clientId = null,
  path = null,
  domains = null
} = {}) {
  const normalizedModels = [...new Set(models.filter(Boolean))].sort();
  const normalizedDomains = domains && domains.length
    ? [...new Set(domains)].sort()
    : domainsForModels(normalizedModels);

  const event = {
    id: instanceId + ':' + (++eventSequence),
    sequence: eventSequence,
    type: 'data.changed',
    occurredAt: new Date().toISOString(),
    source,
    originClientId: cleanClientId(clientId),
    path: path || null,
    models: normalizedModels,
    actions: [...new Set(actions.filter(Boolean))].sort(),
    domains: normalizedDomains.length ? normalizedDomains : ['all']
  };

  eventHistory.push(event);
  if (eventHistory.length > EVENT_HISTORY_LIMIT) {
    eventHistory.splice(0, eventHistory.length - EVENT_HISTORY_LIMIT);
  }
  emitter.emit('change', event);
  return event;
}

export function recordPrismaMutation(model, action) {
  const context = changeContext.getStore();
  if (context) {
    context.models.add(model || 'Unknown');
    context.actions.add(action || 'write');
    return;
  }

  // For non-HTTP/background writes, publish an invalidation immediately.
  // Background transactions should publish once after commit via publishDataChanged().
  publishDataChanged({
    models: [model || 'Unknown'],
    actions: [action || 'write'],
    source: 'background'
  });
}

export function dataChangeRequestMiddleware(req, res, next) {
  const context = {
    models: new Set(),
    actions: new Set(),
    source: sourceForRequest(req),
    clientId: cleanClientId(req.get('X-Minibar-Client-ID')),
    path: String(req.path || '').split('?')[0]
  };
  let flushed = false;

  const flush = () => {
    if (flushed) return;
    flushed = true;
    if (!context.models.size) return;

    publishDataChanged({
      models: [...context.models],
      actions: [...context.actions],
      source: context.source,
      clientId: context.clientId,
      path: context.path
    });
  };

  changeContext.run(context, () => {
    res.once('finish', flush);
    res.once('close', () => {
      // A prematurely disconnected request may still be writing in the backend.
      // Do not notify subscribers until its response has actually finished.
      if (res.writableFinished) flush();
    });
    next();
  });
}

function writeSseEvent(res, type, payload, id = null) {
  if (res.writableEnded || res.destroyed) return;
  if (id) res.write('id: ' + id + '\n');
  res.write('event: ' + type + '\n');
  res.write('data: ' + JSON.stringify(payload) + '\n\n');
}

function parseEventId(value) {
  const id = String(value || '');
  const separator = id.lastIndexOf(':');
  if (separator < 1) return null;
  const instance = id.slice(0, separator);
  const sequence = Number(id.slice(separator + 1));
  if (!Number.isSafeInteger(sequence) || sequence < 0) return null;
  return { instance, sequence };
}

export function handleEventStream(req, res) {
  const clientId = cleanClientId(req.query.clientId);

  res.status(200);
  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders();
  res.write('retry: 3000\n: minibar live stream connected\n\n');

  // Subscribe before replaying so changes are not missed during reconnect.
  const listener = event => writeSseEvent(res, event.type, event, event.id);
  emitter.on('change', listener);

  const lastId = req.get('Last-Event-ID');
  const parsed = parseEventId(lastId);
  if (!parsed) {
    writeSseEvent(res, 'sync.required', {
      type: 'sync.required',
      reason: 'initial-connection',
      domains: ['all']
    });
  } else if (
    parsed.instance !== instanceId ||
    parsed.sequence > eventSequence ||
    (eventHistory.length && parsed.sequence < eventHistory[0].sequence - 1)
  ) {
    writeSseEvent(res, 'sync.required', {
      type: 'sync.required',
      reason: 'event-history-unavailable',
      domains: ['all']
    });
  } else {
    eventHistory
      .filter(event => event.sequence > parsed.sequence)
      .forEach(event => writeSseEvent(res, event.type, event, event.id));
  }

  const heartbeat = setInterval(() => {
    if (!res.writableEnded && !res.destroyed) {
      res.write(': ping ' + Date.now() + '\n\n');
    }
  }, 25000);
  heartbeat.unref?.();

  const cleanup = () => {
    clearInterval(heartbeat);
    emitter.off('change', listener);
  };
  res.once('close', cleanup);
  res.once('finish', cleanup);
}
