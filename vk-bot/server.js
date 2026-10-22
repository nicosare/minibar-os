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

async function sendPrivateText(peerId, message, keyboard = null) {
  if (!VK_ACCESS_TOKEN) {
    throw new Error('VK_BOT_ACCESS_TOKEN не настроен');
  }

  const values = {
    peer_id: String(peerId),
    message,
    random_id: String(Math.floor(Math.random() * 2147483647) + 1),
    access_token: VK_ACCESS_TOKEN,
    v: VK_API_VERSION
  };
  if (keyboard) values.keyboard = JSON.stringify(keyboard);

  const params = new URLSearchParams(values);
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

function parseMessagePayload(message) {
  const raw = message?.payload;
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return null;

  try {
    const payload = JSON.parse(raw);
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
}

async function handleDeadlinesValidButton(peerId, payload) {
  const roomId = Number(payload?.roomId);
  const roomNumber = Number(payload?.roomNumber);
  if (!Number.isSafeInteger(roomId) || roomId <= 0 ||
      !Number.isSafeInteger(roomNumber) || roomNumber < 100 || roomNumber > 9999) {
    await sendPrivateText(peerId, 'Не удалось определить номер для изменения «Сроков».');
    return;
  }

  const roomResponse = await fetch(API_BASE_URL + '/api/rooms/' + roomId);
  const room = await roomResponse.json().catch(() => ({}));
  if (!roomResponse.ok || room.error) {
    throw new Error(room.error || 'Не удалось загрузить номер');
  }
  if (Number(room.number) !== roomNumber) {
    await sendPrivateText(peerId, 'Номер в уведомлении уже не совпадает с данными системы. Ничего не изменено.');
    return;
  }

  const statusesResponse = await fetch(
    API_BASE_URL + '/api/rooms/' + roomId + '/product-statuses'
  );
  const statuses = await statusesResponse.json().catch(() => []);
  if (!statusesResponse.ok || !Array.isArray(statuses)) {
    throw new Error('Не удалось проверить продукты в «Сроках»');
  }

  if (room.expiryStatus === 'valid' && statuses.length === 0) {
    await sendPrivateText(peerId, '✅ Номер ' + roomNumber + ': в «Сроках» уже отмечено «В порядке».');
    return;
  }

  // The button is valid for the just-refilled room only while its status is still neutral.
  // This also makes repeated taps idempotent and prevents stale buttons overwriting new work.
  if ((room.expiryStatus || 'neutral') !== 'neutral' || statuses.length > 0) {
    await sendPrivateText(
      peerId,
      'Статус номера ' + roomNumber + ' уже изменился. Ничего не менял.'
    );
    return;
  }

  // Use the exact endpoint used by the website's «В порядке» action.
  const updateResponse = await fetch(
    API_BASE_URL + '/api/rooms/' + roomId + '/product-statuses',
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomStatus: 'valid' })
    }
  );
  const updateResult = await updateResponse.json().catch(() => ({}));
  if (!updateResponse.ok || updateResult.error) {
    throw new Error(updateResult.error || 'Не удалось обновить «Сроки»');
  }

  await sendPrivateText(
    peerId,
    '✅ Номер ' + roomNumber + ' отмечен в «Сроках» как «В порядке».'
  );
  console.log('[VK] deadlines marked valid for room=' + roomNumber + ' user=' + peerId);
}

function deadlinesValidKeyboard(roomId, roomNumber, eventId) {
  return {
    one_time: false,
    buttons: [[{
      action: {
        type: 'text',
        label: 'Сроки в порядке',
        payload: JSON.stringify({
          command: 'deadlines_valid',
          roomId: Number(roomId),
          roomNumber: Number(roomNumber),
          eventId: String(eventId || '')
        })
      },
      color: 'positive'
    }]]
  };
}

async function sendDeadlineNotifications(peerId, notifications, eventId) {
  const recipientId = Number(peerId);
  if (!Number.isSafeInteger(recipientId) || recipientId <= 0 || !Array.isArray(notifications)) {
    return;
  }

  for (const notification of notifications) {
    const roomNumber = Number(notification?.roomNumber);
    if (!Number.isSafeInteger(roomNumber) || roomNumber < 100 || roomNumber > 9999) continue;

    try {
      if (notification.type === 'emptied_with_deadlines') {
        const products = Array.isArray(notification.products) ? notification.products : [];
        if (!products.length) continue;
        const productLines = products.map(item => {
          const name = String(item?.name || 'Без названия');
          const qty = Number(item?.qtyToReplace) || 0;
          return '• ' + name + (qty > 0 ? ' — ' + qty + ' шт.' : '');
        });
        await sendPrivateText(
          recipientId,
          '🧊 Номер ' + roomNumber + ' опустошён.\n\n' +
          'В «Сроках» были отмечены продукты:\n' + productLines.join('\n') +
          '\n\nОтметки продуктов для этого номера очищены.'
        );
      } else if (notification.type === 'refilled_empty') {
        await sendPrivateText(
          recipientId,
          '✅ Номер ' + roomNumber + ' пополнен после опустошения.\n\n' +
          'Нажми кнопку ниже, чтобы отметить «Сроки» этого номера как «В порядке».',
          deadlinesValidKeyboard(notification.roomId, roomNumber, eventId)
        );
      }
    } catch (error) {
      // A private-message failure must never roll back or reprocess the room check.
      console.error(
        '[VK] deadline notification failed for room=' + roomNumber +
        ' user=' + recipientId + ': ' + error.message
      );
    }
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

  const payload = parseMessagePayload(message);
  if (payload?.command === 'deadlines_valid') {
    await handleDeadlinesValidButton(peerId, payload);
    return true;
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
      ? '🧊 Опустошённые за сегодня: ' + rooms.length + '\n\n' +
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

  const senderId = Number(message.from_id);
  const payload = {
    eventId,
    peerId,
    messageId,
    senderId: Number.isSafeInteger(senderId) && senderId > 0 ? senderId : null,
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

    if (result.status === 'processed' && result.notifications?.length) {
      await sendDeadlineNotifications(senderId, result.notifications, result.eventId || eventId);
    }

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
