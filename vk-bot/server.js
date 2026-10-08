import crypto from 'node:crypto';

const VK_ACCESS_TOKEN = String(process.env.VK_BOT_ACCESS_TOKEN || '').trim();
const VK_API_VERSION = String(process.env.VK_API_VERSION || '5.199').trim();
const VK_LONGPOLL_VERSION = String(process.env.VK_LONGPOLL_VERSION || '3').trim();
const API_BASE_URL = String(
  process.env.MINIBAR_API_URL || 'http://backend:3000'
).replace(/\/$/, '');
const INTERNAL_TOKEN = String(
  process.env.VK_BOT_INTERNAL_TOKEN || ''
).trim();

const allowedPeerIds = new Set(
  String(process.env.VK_BOT_ALLOWED_PEER_IDS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
);

let groupId = String(process.env.VK_BOT_GROUP_ID || '').trim();
let longPoll = null;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function hashEvent(parts) {
  return crypto
    .createHash('sha256')
    .update(parts.join('\x1f'))
    .digest('hex');
}

function requireConfig() {
  const missing = [];

  if (!VK_ACCESS_TOKEN) missing.push('VK_BOT_ACCESS_TOKEN');
  if (!INTERNAL_TOKEN) missing.push('VK_BOT_INTERNAL_TOKEN');
  if (allowedPeerIds.size === 0) missing.push('VK_BOT_ALLOWED_PEER_IDS');

  if (missing.length) {
    throw new Error('Не настроены переменные: ' + missing.join(', '));
  }
}

function vkMethodUrl(method, params = {}) {
  const query = new URLSearchParams({
    ...params,
    access_token: VK_ACCESS_TOKEN,
    v: VK_API_VERSION
  });

  return 'https://api.vk.com/method/' + method + '?' + query.toString();
}

async function vkMethod(method, params = {}) {
  const response = await fetch(vkMethodUrl(method, params));

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      'VK ' + method + ': некорректный JSON (HTTP ' + response.status + ')'
    );
  }

  if (!response.ok) {
    throw new Error('VK ' + method + ': HTTP ' + response.status);
  }

  if (data.error) {
    throw new Error(
      'VK ' + method + ': ' + (data.error.error_msg || 'API error')
    );
  }

  return data.response;
}

async function resolveGroupId() {
  if (groupId) return Number(groupId);

  const response = await vkMethod('groups.getById', {
    fields: 'id,name'
  });

  const group = Array.isArray(response)
    ? response[0]
    : response?.groups?.[0];

  if (!group?.id) {
    throw new Error(
      'Не удалось определить ID сообщества по VK_BOT_ACCESS_TOKEN'
    );
  }

  groupId = String(group.id);
  console.log(
    'VK bot group: ' + (group.name || 'community') + ' (' + groupId + ')'
  );

  return Number(group.id);
}

async function configureLongPoll() {
  const id = await resolveGroupId();

  await vkMethod('groups.setLongPollSettings', {
    group_id: id,
    api_version: VK_API_VERSION,
    enabled: 1,
    message_new: 1
  });

  console.log('VK Group Long Poll: message_new включён');
}

async function refreshLongPollServer() {
  const id = await resolveGroupId();

  const response = await vkMethod('groups.getLongPollServer', {
    group_id: id
  });

  if (!response?.server || !response?.key || response?.ts === undefined) {
    throw new Error('VK не вернул корректные параметры Long Poll');
  }

  longPoll = {
    server: String(response.server),
    key: String(response.key),
    ts: String(response.ts)
  };
}

async function forwardEvent(update) {
  const message = update?.object?.message || update?.object;
  if (!message) return;

  const type = String(update?.type || '');
  if (type !== 'message_new') return;

  const peerId = String(message.peer_id ?? '').trim();
  const text = String(message.text || '').trim();

  if (!peerId || !allowedPeerIds.has(peerId) || !text) {
    return;
  }

  if (message.out === 1 || Number(message.from_id) === -Number(groupId)) {
    return;
  }

  const conversationMessageId =
    message.conversation_message_id ??
    message.id ??
    message.random_id ??
    null;

  const eventId = String(
    update.event_id ||
    hashEvent([
      peerId,
      String(conversationMessageId ?? ''),
      String(message.date ?? ''),
      text
    ])
  );

  const payload = {
    eventId,
    peerId,
    messageId: conversationMessageId,
    text,
    occurredAt: message.date
      ? new Date(Number(message.date) * 1000).toISOString()
      : new Date().toISOString()
  };

  let lastError = null;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch(
        API_BASE_URL + '/api/vk-bot/events',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Minibar-Bot-Token': INTERNAL_TOKEN
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || 'MiniBar API HTTP ' + response.status
        );
      }

      console.log(
        '[VK] peer=' + peerId +
        ' text=' + JSON.stringify(text) +
        ' -> ' + data.status +
        ' ' + JSON.stringify(data.rooms || '')
      );

      return;
    } catch (error) {
      lastError = error;
      console.error(
        '[VK] forwarding attempt ' + attempt + '/5 failed:',
        error.message
      );

      if (attempt < 5) {
        await sleep(500 * attempt);
      }
    }
  }

  throw lastError || new Error(
    'Не удалось отправить событие в MiniBar API'
  );
}

async function pollForever() {
  requireConfig();

  await configureLongPoll();
  await refreshLongPollServer();

  console.log(
    'VK bot started. peer_id whitelist: ' +
    Array.from(allowedPeerIds).join(', ')
  );

  while (true) {
    try {
      if (!longPoll) {
        await refreshLongPollServer();
      }

      const url = new URL(longPoll.server);
      url.searchParams.set('act', 'a_check');
      url.searchParams.set('key', longPoll.key);
      url.searchParams.set('ts', longPoll.ts);
      url.searchParams.set('wait', '25');
      url.searchParams.set('version', VK_LONGPOLL_VERSION);

      const response = await fetch(url);
      const data = await response.json();

      if (data.failed !== undefined) {
        console.warn(
          'VK Long Poll failed=' + data.failed +
          '. Refreshing server...'
        );
        await refreshLongPollServer();
        continue;
      }

      if (data.ts !== undefined) {
        longPoll.ts = String(data.ts);
      }

      for (const update of Array.isArray(data.updates) ? data.updates : []) {
        await forwardEvent(update);
      }
    } catch (error) {
      console.error('VK Long Poll error:', error.message);
      await sleep(2000);

      try {
        await refreshLongPollServer();
      } catch (refreshError) {
        console.error(
          'VK Long Poll refresh error:',
          refreshError.message
        );
      }
    }
  }
}

pollForever().catch(error => {
  console.error('VK bot fatal error:', error);
  process.exit(1);
});
