import http from 'node:http';
import crypto from 'node:crypto';

const API_BASE_URL = String(
  process.env.MINIBAR_API_URL || 'http://backend:3000'
).replace(/\/$/, '');

const INTERNAL_TOKEN = String(
  process.env.VK_BOT_INTERNAL_TOKEN || ''
).trim();

const CALLBACK_SECRET = String(
  process.env.VK_CALLBACK_SECRET || ''
).trim();

const CONFIRMATION_TOKEN = String(
  process.env.VK_CALLBACK_CONFIRMATION || ''
).trim();

const groupId = String(
  process.env.VK_BOT_GROUP_ID || ''
).trim();

const VK_ACCESS_TOKEN = String(
  process.env.VK_BOT_ACCESS_TOKEN || process.env.VK_ACCESS_TOKEN || ''
).trim();

const VK_API_VERSION = String(
  process.env.VK_API_VERSION || '5.199'
).trim();

const MINI_APP_ID = 54809268;

const httpPort = Number(
  process.env.VK_BOT_HTTP_PORT || 3002
);

const allowedPeerIds = new Set(
  String(process.env.VK_BOT_ALLOWED_PEER_IDS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
);

function hashEvent(parts) {
  return crypto
    .createHash('sha256')
    .update(parts.join('\x1f'))
    .digest('hex');
}

function sameSecret(actual, expected) {
  if (!actual || !expected) return false;

  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function requireConfig() {
  const missing = [];

  if (!INTERNAL_TOKEN) missing.push('VK_BOT_INTERNAL_TOKEN');
  if (!CALLBACK_SECRET) missing.push('VK_CALLBACK_SECRET');
  if (!CONFIRMATION_TOKEN) missing.push('VK_CALLBACK_CONFIRMATION');
  if (!groupId) missing.push('VK_BOT_GROUP_ID');
  if (!allowedPeerIds.size) missing.push('VK_BOT_ALLOWED_PEER_IDS');

  if (!Number.isInteger(httpPort) || httpPort < 1 || httpPort > 65535) {
    missing.push('VK_BOT_HTTP_PORT');
  }

  if (missing.length) {
    throw new Error('Не настроены переменные: ' + missing.join(', '));
  }
}

function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store'
  });
  res.end(payload);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
    'Cache-Control': 'no-store'
  });
  res.end(text);
}

function readBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on('data', chunk => {
      size += chunk.length;

      if (size > limit) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }

      chunks.push(chunk);
    });

    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });

    req.on('error', reject);
  });
}

async function sendPrivateMenu(peerId) {
  if (!VK_ACCESS_TOKEN) {
    throw new Error('VK_BOT_ACCESS_TOKEN не настроен');
  }

  const keyboard = {
    one_time: false,
    buttons: [
      [{
        action: {
          type: 'open_app',
          label: '📱 Открыть Mini App',
          app_id: MINI_APP_ID
        }
      }],
      [{
        action: {
          type: 'text',
          label: '🧊 Опустошённые за сегодня',
          payload: JSON.stringify({ command: 'emptied_today' })
        },
        color: 'primary'
      }]
    ]
  };

  const params = new URLSearchParams({
    peer_id: String(peerId),
    message: 'Меню MINIBAR OS',
    keyboard: JSON.stringify(keyboard),
    random_id: String(Math.floor(Math.random() * 2147483647) + 1),
    access_token: VK_ACCESS_TOKEN,
    v: VK_API_VERSION
  });

  const response = await fetch('https://api.vk.com/method/messages.send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: params
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.error) {
    throw new Error(data.error?.error_msg || 'VK messages.send failed');
  }
}

async function sendPrivateText(peerId, message) {
  if (!VK_ACCESS_TOKEN) {
    throw new Error('VK_BOT_ACCESS_TOKEN не настроен');
  }

  const params = new URLSearchParams({
    peer_id: String(peerId),
    message,
    random_id: String(Math.floor(Math.random() * 2147483647) + 1),
    access_token: VK_ACCESS_TOKEN,
    v: VK_API_VERSION
  });

  const response = await fetch('https://api.vk.com/method/messages.send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: params
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.error) {
    throw new Error(data.error?.error_msg || 'VK messages.send failed');
  }
}

async function handlePrivateMessage(message, peerId, text) {
  const senderId = Number(message.from_id);
  const peerNumber = Number(peerId);
  const isDirectDialog = Number.isSafeInteger(senderId) &&
    senderId > 0 &&
    peerNumber === senderId;

  if (!isDirectDialog || message.out === 1 || senderId === -Number(groupId)) {
    return false;
  }

  const normalized = text.toLocaleLowerCase('ru-RU').replace(/^\/+/, '').trim();
  if (/^(?:начать|старт|start|меню|menu|начать работу)$/iu.test(normalized)) {
    await sendPrivateMenu(peerId);
    console.log('[VK] private menu sent to user=' + peerId);
    return true;
  }

  if (/^🧊?\s*опустошённые за сегодня$/iu.test(normalized)) {
    const response = await fetch(API_BASE_URL + '/api/vk-bot/emptied-today', {
      method: 'GET',
      headers: { 'X-Minibar-Bot-Token': INTERNAL_TOKEN }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Не удалось загрузить опустошённые номера');
    }

    const rooms = Array.isArray(data.rooms) ? data.rooms : [];
    const messageText = rooms.length
      ? '🧊 Опустошённые за сегодня: ' + rooms.length + '\\n\\n' +
        rooms.map(room => String(room.number)).join(', ')
      : '🧊 Сегодня опустошённых номеров пока нет.';
    await sendPrivateText(peerId, messageText);
    console.log('[VK] sent emptied-today list to user=' + peerId + ' count=' + rooms.length);
    return true;
  }

  return false;
}

async function forwardToBackend(payload) {
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

      return data;
    } catch (error) {
      lastError = error;

      console.error(
        '[VK] forwarding attempt ' + attempt + '/5 failed:',
        error.message
      );

      if (attempt < 5) {
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }
  }

  throw lastError || new Error(
    'Не удалось отправить событие в MiniBar API'
  );
}

async function handleCallback(req, res) {
  if (req.method !== 'POST') {
    return sendText(res, 405, 'Method Not Allowed');
  }

  let body;

  try {
    const rawBody = await readBody(req);
    body = JSON.parse(rawBody);
  } catch (error) {
    console.error('[VK] invalid callback payload:', error.message);
    return sendText(res, 400, 'Bad Request');
  }

  const incomingGroupId = String(body?.group_id ?? '').trim();
  const incomingSecret = String(body?.secret ?? '').trim();
  const type = String(body?.type ?? '').trim();

  if (incomingGroupId !== groupId) {
    console.warn(
      '[VK] callback rejected: unexpected group_id=' + incomingGroupId
    );
    return sendText(res, 403, 'Forbidden');
  }

  if (type === 'confirmation') {
    console.log('[VK] confirmation requested');
    return sendText(res, 200, CONFIRMATION_TOKEN);
  }

  if (!sameSecret(incomingSecret, CALLBACK_SECRET)) {
    console.warn('[VK] callback rejected: invalid secret');
    return sendText(res, 403, 'Forbidden');
  }

  if (type !== 'message_new') {
    return sendText(res, 200, 'ok');
  }

  const message = body?.object?.message || body?.object;

  if (!message) {
    return sendText(res, 200, 'ok');
  }

  const peerId = String(message.peer_id ?? '').trim();
  const text = String(message.text || '').trim();

  if (!peerId || !text) {
    return sendText(res, 200, 'ok');
  }

  try {
    if (await handlePrivateMessage(message, peerId, text)) {
      return sendText(res, 200, 'ok');
    }
  } catch (error) {
    console.error('[VK] private menu handling failed for peer=' + peerId + ':', error.message);
    return sendJson(res, 500, { error: 'VK private menu handling failed' });
  }

  if (!allowedPeerIds.has(peerId)) {
    return sendText(res, 200, 'ok');
  }

  if (
    message.out === 1 ||
    Number(message.from_id) === -Number(groupId)
  ) {
    return sendText(res, 200, 'ok');
  }

  const messageId =
    message.conversation_message_id ??
    message.id ??
    null;

  const eventId = String(
    body.event_id ||
    hashEvent([
      peerId,
      String(messageId ?? ''),
      String(message.date ?? ''),
      text
    ])
  );

  const payload = {
    eventId,
    peerId,
    messageId,
    text,
    occurredAt: message.date
      ? new Date(Number(message.date) * 1000).toISOString()
      : new Date().toISOString()
  };

  try {
    const result = await forwardToBackend(payload);

    console.log(
      '[VK] peer=' + peerId +
      ' text=' + JSON.stringify(text) +
      ' -> ' + result.status +
      ' ' + JSON.stringify(result.rooms || '') +
      (result.unavailableRooms?.length ? ' unavailable=' + JSON.stringify(result.unavailableRooms) : '') +
      (result.missingRooms?.length ? ' missing=' + JSON.stringify(result.missingRooms) : '')
    );

    return sendText(res, 200, 'ok');
  } catch (error) {
    console.error(
      '[VK] callback processing failed:',
      error.message
    );

    return sendJson(res, 500, {
      error: 'MiniBar processing failed'
    });
  }
}

function looksOperationalText(value) {
  const text = String(value || '').trim();
  return /^\s*\d{3,4}(?:[\s,;:/|+_-]*\d{3,4})*(?:\s+(?:опустош\p{L}*|проверен\p{L}*\s*,?\s*жилой))?(?:\s*\([^)]*\))?\s*$/iu.test(text);
}

function startServer() {
  requireConfig();

  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/health') {
        return sendJson(res, 200, {
          status: 'ok',
          service: 'vk-callback'
        });
      }

      if (req.url === '/callback') {
        return await handleCallback(req, res);
      }

      return sendText(res, 404, 'Not Found');
    } catch (error) {
      console.error('[VK] unhandled HTTP error:', error);
      if (!res.headersSent) {
        sendText(res, 500, 'Internal Server Error');
      } else {
        res.destroy();
      }
    }
  });

  server.listen(httpPort, '0.0.0.0', () => {
    console.log(
      'VK Callback server listening on port ' + httpPort
    );
    console.log(
      'VK callback peer_id whitelist: ' +
      Array.from(allowedPeerIds).join(', ')
    );
  });
}

startServer();
