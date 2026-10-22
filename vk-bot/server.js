import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

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
const PRIVATE_DIALOGS_FILE = process.env.VK_BOT_PRIVATE_DIALOGS_FILE || '/data/private-dialogs.json';
const privateDialogIds = new Set();
let privateDialogsLoaded = false;

async function loadPrivateDialogs() {
  if (privateDialogsLoaded) return;
  privateDialogsLoaded = true;
  try {
    const stored = JSON.parse(await fs.readFile(PRIVATE_DIALOGS_FILE, 'utf8'));
    if (Array.isArray(stored)) {
      for (const value of stored) {
        const id = Number(value);
        if (Number.isSafeInteger(id) && id > 0) privateDialogIds.add(id);
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      privateDialogsLoaded = false;
      throw error;
    }
  }
}

async function rememberPrivateDialog(userId) {
  const id = Number(userId);
  if (!Number.isSafeInteger(id) || id <= 0) return;
  await loadPrivateDialogs();
  if (privateDialogIds.has(id)) return;
  privateDialogIds.add(id);
  try {
    await fs.mkdir(path.dirname(PRIVATE_DIALOGS_FILE), { recursive: true });
    const tempPath = PRIVATE_DIALOGS_FILE + '.tmp';
    await fs.writeFile(tempPath, JSON.stringify([...privateDialogIds].sort((a, b) => a - b)), 'utf8');
    await fs.rename(tempPath, PRIVATE_DIALOGS_FILE);
    console.log('[VK] registered private dialog user=' + id + ' total=' + privateDialogIds.size);
  } catch (error) {
    privateDialogIds.delete(id);
    throw error;
  }
}

async function getPrivateDialogIds() {
  await loadPrivateDialogs();
  return [...privateDialogIds];
}

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

async function editPrivateMessage(peerId, conversationMessageId, message) {
  const cmid = Number(conversationMessageId);
  if (!Number.isSafeInteger(cmid) || cmid <= 0) {
    throw new Error('Не удалось определить сообщение для редактирования');
  }

  const params = new URLSearchParams({
    peer_id: String(peerId),
    conversation_message_id: String(cmid),
    message,
    keyboard: JSON.stringify({ inline: true, buttons: [] }),
    access_token: VK_ACCESS_TOKEN,
    v: VK_API_VERSION
  });
  const response = await fetch('https://api.vk.com/method/messages.edit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: params
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error || data.response !== 1) {
    throw new Error(data.error?.error_msg || 'VK messages.edit failed');
  }
}

async function answerMessageEvent(event, text = 'Готово') {
  const params = new URLSearchParams({
    event_id: String(event.event_id || ''),
    user_id: String(event.user_id || ''),
    peer_id: String(event.peer_id || ''),
    event_data: JSON.stringify({ type: 'show_snackbar', text }),
    access_token: VK_ACCESS_TOKEN,
    v: VK_API_VERSION
  });
  const response = await fetch('https://api.vk.com/method/messages.sendMessageEventAnswer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: params
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    throw new Error(data.error?.error_msg || 'VK message event acknowledgement failed');
  }
}

async function handleDeadlinesValidButton(event, payload) {
  const peerId = String(event.peer_id || '');
  const roomId = Number(payload?.roomId);
  const roomNumber = Number(payload?.roomNumber);
  const cmid = Number(event.conversation_message_id);

  if (!peerId ||
      !Number.isSafeInteger(roomId) || roomId <= 0 ||
      !Number.isSafeInteger(roomNumber) || roomNumber < 100 || roomNumber > 9999) {
    throw new Error('Не удалось определить номер для обновления «Сроков»');
  }

  const roomResponse = await fetch(API_BASE_URL + '/api/rooms/' + roomId);
  const room = await roomResponse.json().catch(() => ({}));
  if (!roomResponse.ok || room.error) {
    throw new Error(room.error || 'Не удалось загрузить номер');
  }
  if (Number(room.number) !== roomNumber) {
    throw new Error('Номер уже не совпадает с данными системы');
  }

  const statusesResponse = await fetch(
    API_BASE_URL + '/api/rooms/' + roomId + '/product-statuses'
  );
  const statuses = await statusesResponse.json().catch(() => []);
  if (!statusesResponse.ok || !Array.isArray(statuses)) {
    throw new Error('Не удалось проверить продукты в «Сроках»');
  }

  if (!(room.expiryStatus === 'valid' && statuses.length === 0)) {
    // Only change a neutral status, matching the website's «В порядке» action.
    if ((room.expiryStatus || 'neutral') !== 'neutral') {
      throw new Error('Статус номера уже изменился');
    }

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
  }

  // Editing the original notification is a presentation step: it must not block
  // the earlier callback acknowledgement or undo the successful status update.
  await editPrivateMessage(
    peerId,
    cmid,
    '✅ Сроки номера ' + roomNumber + ' в порядке.'
  );
  console.log('[VK] deadlines marked valid for room=' + roomNumber + ' user=' + event.user_id);
}

function deadlinesValidKeyboard(roomId, roomNumber, eventId) {
  return {
    inline: true,
    buttons: [[{
      action: {
        type: 'callback',
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

async function sendDeadlineNotifications(notifications, eventId) {
  if (!Array.isArray(notifications)) return;
  const recipientIds = await getPrivateDialogIds();
  if (!recipientIds.length) {
    console.warn('[VK] no registered private dialogs; notifications were not sent');
    return;
  }

  for (const notification of notifications) {
    const roomNumber = Number(notification?.roomNumber);
    if (!Number.isSafeInteger(roomNumber) || roomNumber < 100 || roomNumber > 9999) continue;

    let messageText;
    let keyboard = null;
    if (notification.type === 'emptied_with_deadlines') {
      const products = Array.isArray(notification.products) ? notification.products : [];
      if (!products.length) continue;
      const productLines = products.map(item => {
        const name = String(item?.name || 'Без названия');
        const qty = Number(item?.qtyToReplace) || 0;
        return '• ' + name + (qty > 0 ? ' — ' + qty + ' шт.' : '');
      });
      messageText = '🧊 Номер ' + roomNumber + ' опустошён.\n\n' +
        'В «Сроках» были отмечены продукты:\n' + productLines.join('\n') +
        '\n\nОтметки продуктов для этого номера очищены.';
    } else if (notification.type === 'refilled_empty') {
      messageText = '✅ Номер ' + roomNumber + ' пополнен после опустошения.\n\n' +
        'Нажми кнопку ниже, чтобы отметить «Сроки» этого номера как «В порядке».';
      keyboard = deadlinesValidKeyboard(notification.roomId, roomNumber, eventId);
    } else {
      continue;
    }

    for (const recipientId of recipientIds) {
      try {
        await sendPrivateText(recipientId, messageText, keyboard);
      } catch (error) {
        console.error('[VK] deadline notification failed for room=' + roomNumber +
          ' user=' + recipientId + ': ' + error.message);
      }
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

  // Every user who writes to the bot in a direct dialog becomes a persistent notification subscriber.
  await rememberPrivateDialog(senderId);

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

  if (type === 'message_event') {
    const event = body?.object || {};
    let payload = event.payload;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch { payload = null; }
    }

    // Answer VK's callback immediately; do not keep the button spinner active
    // while the backend is checking or updating room data.
    sendText(res, 200, 'ok');

    void (async () => {
      try {
        try {
          await answerMessageEvent(
            event,
            payload?.command === 'deadlines_valid' ? 'Обновляю «Сроки»…' : 'Готово'
          );
        } catch (answerError) {
          console.error('[VK] immediate message event acknowledgement failed:', answerError.message);
        }

        if (payload?.command === 'deadlines_valid') {
          await handleDeadlinesValidButton(event, payload);
        } else {
          console.warn('[VK] unknown inline callback payload');
        }
      } catch (error) {
        console.error('[VK] inline button handling failed:', error.message);
        try {
          await sendPrivateText(
            String(event.peer_id || ''),
            '⚠️ Не удалось обновить «Сроки». Проверь номер и попробуй нажать кнопку ещё раз.'
          );
        } catch (notifyError) {
          console.error('[VK] failed to send inline button error notice:', notifyError.message);
        }
      }
    })();

    return;
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
      await sendDeadlineNotifications(result.notifications, result.eventId || eventId);
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
