import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const API_BASE_URL = String(
  process.env.MINIBAR_API_URL || 'http://backend:3000'
).replace(/\/$/, '');

// JS Date.getTimezoneOffset semantics: UTC minus local time.
// Default -300 means UTC+05:00; deployments can override this in .env.
const VK_BOT_TIMEZONE_OFFSET = String(
  process.env.VK_BOT_TIMEZONE_OFFSET ?? '-300'
).trim();

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
const PRIVATE_MENU_MESSAGES_FILE = process.env.VK_BOT_PRIVATE_MENU_MESSAGES_FILE || '/data/private-menu-messages.json';
const EXCISE_MENU_STATE_FILE = process.env.VK_BOT_EXCISE_MENU_STATE_FILE || '/data/excise-menu-state.json';
const PRIVATE_USER_SETTINGS_FILE = process.env.VK_BOT_PRIVATE_USER_SETTINGS_FILE || '/data/private-user-settings.json';
const NOTIFICATION_CATEGORIES = [
  { key: 'emptied', label: 'Опустошение минибара' },
  { key: 'emptiedWithDeadlines', label: 'Опустошение со сроками' },
  { key: 'refilledEmpty', label: 'Пополнение пустого' },
  { key: 'refilledWithComment', label: 'Пополнение с комментарием' }
];
const privateDialogIds = new Set();
const privateMenuMessageIds = new Map();
const privateUserSettings = new Map();
let privateDialogsLoaded = false;
let privateMenuMessagesLoaded = false;
let privateUserSettingsLoaded = false;
let dailyMenuSchedulerRunning = false;
let knownExcisePresence = null;
let exciseMenuMonitorRunning = false;
let knownPrivateMenuText = null;

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

async function loadPrivateMenuMessages() {
  if (privateMenuMessagesLoaded) return;
  privateMenuMessagesLoaded = true;
  try {
    const stored = JSON.parse(await fs.readFile(PRIVATE_MENU_MESSAGES_FILE, 'utf8'));
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      for (const [userIdValue, messageIdValue] of Object.entries(stored)) {
        const userId = Number(userIdValue);
        const messageId = Number(messageIdValue);
        if (Number.isSafeInteger(userId) && userId > 0 &&
            Number.isSafeInteger(messageId) && messageId > 0) {
          privateMenuMessageIds.set(userId, messageId);
        }
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      privateMenuMessagesLoaded = false;
      throw error;
    }
  }
}

async function persistPrivateMenuMessages() {
  await fs.mkdir(path.dirname(PRIVATE_MENU_MESSAGES_FILE), { recursive: true });
  const tempPath = PRIVATE_MENU_MESSAGES_FILE + '.tmp';
  const data = Object.fromEntries(
    [...privateMenuMessageIds.entries()].sort((a, b) => a[0] - b[0])
  );
  await fs.writeFile(tempPath, JSON.stringify(data), 'utf8');
  await fs.rename(tempPath, PRIVATE_MENU_MESSAGES_FILE);
}

async function rememberPrivateMenuMessage(userIdValue, messageIdValue) {
  const userId = Number(userIdValue);
  const messageId = Number(messageIdValue);
  if (!Number.isSafeInteger(userId) || userId <= 0 ||
      !Number.isSafeInteger(messageId) || messageId <= 0) return;
  await loadPrivateMenuMessages();
  privateMenuMessageIds.set(userId, messageId);
  await persistPrivateMenuMessages();
}

async function getPrivateMenuMessageId(userIdValue) {
  await loadPrivateMenuMessages();
  return privateMenuMessageIds.get(Number(userIdValue)) || null;
}

async function forgetPrivateMenuMessage(userIdValue) {
  await loadPrivateMenuMessages();
  privateMenuMessageIds.delete(Number(userIdValue));
  await persistPrivateMenuMessages();
}

function defaultPrivateUserSettings() {
  const localNow = getBotLocalDateTime();
  return {
    dailyMenuEnabled: true,
    dailyMenuTime: '09:00',
    notificationsEnabled: true,
    notificationSubscriptions: Object.fromEntries(
      NOTIFICATION_CATEGORIES.map(category => [category.key, true])
    ),
    awaitingMenuTime: false,
    settingsMessageCmid: null,
    settingsMessageId: null,
    lastDailyMenuDate: null,
    // Avoid an unsolicited catch-up on the first interaction after the default time.
    // If the user selects a future time for today, this suppression is cleared.
    suppressDailyMenuDate: localNow.timeKey > '09:00' ? localNow.dateKey : null
  };
}

function normalizePrivateUserSettings(value = {}) {
  const rawSubscriptions = value?.notificationSubscriptions &&
    typeof value.notificationSubscriptions === 'object'
    ? value.notificationSubscriptions
    : {};
  return {
    ...defaultPrivateUserSettings(),
    ...value,
    dailyMenuEnabled: value?.dailyMenuEnabled !== false,
    dailyMenuTime: /^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(String(value?.dailyMenuTime || ''))
      ? String(value.dailyMenuTime)
      : '09:00',
    notificationsEnabled: value?.notificationsEnabled !== false,
    notificationSubscriptions: Object.fromEntries(
      NOTIFICATION_CATEGORIES.map(category => [
        category.key,
        typeof rawSubscriptions[category.key] === 'boolean'
          ? rawSubscriptions[category.key]
          : true
      ])
    ),
    awaitingMenuTime: value?.awaitingMenuTime === true,
    settingsMessageCmid: Number.isSafeInteger(Number(value?.settingsMessageCmid)) &&
      Number(value.settingsMessageCmid) > 0
      ? Number(value.settingsMessageCmid)
      : null,
    settingsMessageId: Number.isSafeInteger(Number(value?.settingsMessageId)) &&
      Number(value.settingsMessageId) > 0
      ? Number(value.settingsMessageId)
      : null,
    lastDailyMenuDate: /^\d{4}-\d{2}-\d{2}$/u.test(String(value?.lastDailyMenuDate || ''))
      ? String(value.lastDailyMenuDate)
      : null,
    suppressDailyMenuDate: Object.prototype.hasOwnProperty.call(value, 'suppressDailyMenuDate')
      ? (/^\d{4}-\d{2}-\d{2}$/u.test(String(value.suppressDailyMenuDate || ''))
        ? String(value.suppressDailyMenuDate)
        : null)
      : defaultPrivateUserSettings().suppressDailyMenuDate
  };
}

async function loadPrivateUserSettings() {
  if (privateUserSettingsLoaded) return;
  privateUserSettingsLoaded = true;
  try {
    const stored = JSON.parse(await fs.readFile(PRIVATE_USER_SETTINGS_FILE, 'utf8'));
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      for (const [userIdValue, value] of Object.entries(stored)) {
        const userId = Number(userIdValue);
        if (Number.isSafeInteger(userId) && userId > 0) {
          privateUserSettings.set(userId, normalizePrivateUserSettings(value));
        }
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      privateUserSettingsLoaded = false;
      throw error;
    }
  }
}

async function persistPrivateUserSettings() {
  await fs.mkdir(path.dirname(PRIVATE_USER_SETTINGS_FILE), { recursive: true });
  const tempPath = PRIVATE_USER_SETTINGS_FILE + '.tmp';
  const data = Object.fromEntries(
    [...privateUserSettings.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([userId, value]) => [String(userId), value])
  );
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tempPath, PRIVATE_USER_SETTINGS_FILE);
}

async function getPrivateUserSettings(userIdValue) {
  const userId = Number(userIdValue);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new Error('Не удалось определить пользователя для настроек');
  }
  await loadPrivateUserSettings();
  if (!privateUserSettings.has(userId)) {
    privateUserSettings.set(userId, defaultPrivateUserSettings());
    await persistPrivateUserSettings();
  }
  return privateUserSettings.get(userId);
}

async function updatePrivateUserSettings(userIdValue, patch = {}) {
  const current = await getPrivateUserSettings(userIdValue);
  const next = normalizePrivateUserSettings({
    ...current,
    ...patch,
    notificationSubscriptions: {
      ...current.notificationSubscriptions,
      ...(patch.notificationSubscriptions || {})
    }
  });
  privateUserSettings.set(Number(userIdValue), next);
  await persistPrivateUserSettings();
  return next;
}

function getBotLocalDateTime(value = new Date()) {
  const parsedOffset = Number.parseInt(VK_BOT_TIMEZONE_OFFSET, 10);
  const offsetMinutes = Number.isFinite(parsedOffset) ? parsedOffset : -300;
  const localDate = new Date(value.getTime() - offsetMinutes * 60 * 1000);
  const pad = number => String(number).padStart(2, '0');
  return {
    dateKey: localDate.toISOString().slice(0, 10),
    timeKey: pad(localDate.getUTCHours()) + ':' + pad(localDate.getUTCMinutes())
  };
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

async function loadPrivateMenuSummary() {
  const response = await fetch(API_BASE_URL + '/api/vk-bot/summary', {
    headers: {
      'X-Minibar-Bot-Token': INTERNAL_TOKEN,
      'X-Timezone-Offset': VK_BOT_TIMEZONE_OFFSET
    },
    cache: 'no-store'
  });
  const summary = await response.json().catch(() => ({}));
  if (!response.ok || !summary || !summary.dateKey || !summary.lists || !summary.excises) {
    throw new Error(summary.error || 'Не удалось загрузить сводку MINIBAR OS');
  }
  return summary;
}

function russianCount(value, forms) {
  const count = Math.abs(Number(value) || 0);
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return forms[2];
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

function formatMenuDate(dateKey) {
  const date = new Date(String(dateKey) + 'T12:00:00.000Z');
  if (!Number.isFinite(date.getTime())) return String(dateKey);
  const formatted = date.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });
  return formatted.charAt(0).toLocaleUpperCase('ru-RU') + formatted.slice(1);
}

function formatMenuListLine(label, list) {
  if (!list || list.formed !== true || !Number.isFinite(Number(list.count))) {
    return label + ': ещё неизвестно';
  }
  const count = Math.max(0, Math.trunc(Number(list.count)));
  return label + ': ' + count + ' ' + russianCount(count, ['номер', 'номера', 'номеров']);
}

function formatPrivateMenuText(summary) {
  const lists = summary.lists || {};
  const goal = summary.deadlinesToday || {};
  const operations = summary.operationsToday || {};
  const excises = summary.excises || {};
  const checkedToday = Math.max(0, Math.trunc(Number(operations.checked) || 0));
  const emptiedToday = Math.max(0, Math.trunc(Number(operations.emptied) || 0));
  const refilledEmptyToday = Math.max(0, Math.trunc(Number(operations.refilledEmpty) || 0));
  const target = Math.max(0, Math.trunc(Number(goal.target) || 0));
  const processed = Math.max(0, Math.trunc(Number(goal.processed) || 0));
  const remaining = Math.max(0, Math.trunc(Number(goal.remaining) || 0));
  const totalExcises = Math.max(0, Math.trunc(Number(excises.total) || 0));
  const validExcises = Math.max(0, Math.trunc(Number(excises.valid) || 0));

  const lines = [
    '📋 MINIBAR OS',
    formatMenuDate(summary.dateKey),
    '',
    '📊 Сегодня',
    'Проверено всего: ' + checkedToday,
    'Опустошено: ' + emptiedToday,
    'Пополнено пустых: ' + refilledEmptyToday,
    '',
    '📑 Списки',
    formatMenuListLine('Заезды', lists.arrivals),
    formatMenuListLine('Выезды', lists.departures),
    'GIH: ' + Math.max(0, Math.trunc(Number(lists.gih?.count) || 0)) + ' ' +
      russianCount(Math.max(0, Math.trunc(Number(lists.gih?.count) || 0)), ['номер', 'номера', 'номеров']) + ' сегодня',
    formatMenuListLine('Сроки', lists.deadlines),
    '',
    '🎯 Цель по срокам на сегодня'
  ];

  if (target > 0) {
    lines.push('Выполнено: ' + processed + ' из ' + target);
    lines.push('Осталось: ' + remaining + ' ' + russianCount(remaining, ['номер', 'номера', 'номеров']));
  } else {
    lines.push('На сегодня цель не требуется: нет номеров к обработке');
  }

  lines.push('');
  lines.push('🏷 Акцизы');
  if (totalExcises > 0) {
    lines.push('Есть в базе: ' + totalExcises + ' ' +
      russianCount(totalExcises, ['марка', 'марки', 'марок']));
    lines.push('Валидных для Excel: ' + validExcises);
  } else {
    lines.push('Акцизов в базе нет');
  }

  return lines.join('\n');
}

async function buildPrivateMenuKeyboard(summary = null) {
  const buttons = [
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
  ];

  let hasExcises = Boolean(Number(summary?.excises?.total) > 0);
  if (!summary) {
    try {
      hasExcises = (await loadExcisesFromBackend()).length > 0;
    } catch (error) {
      console.error('[VK] cannot check excises for the private menu:', error.message);
    }
  }
  if (hasExcises) {
    buttons.push([{
      action: {
        type: 'text',
        label: '📄 Получить акцизы',
        payload: JSON.stringify({ command: 'get_excises' })
      },
      color: 'primary'
    }]);
  }

  // These actions stay on the regular VK keyboard, independently of inline
  // callback keyboards shown on settings or notification messages.
  buttons.push([
    {
      action: {
        type: 'text',
        label: '📋 Меню',
        payload: JSON.stringify({ command: 'show_menu' })
      },
      color: 'primary'
    },
    {
      action: {
        type: 'text',
        label: '⚙️ Настройки',
        payload: JSON.stringify({ command: 'settings' })
      },
      color: 'primary'
    }
  ]);

  return { one_time: false, buttons };
}

async function isStoredPrivateMenuAvailable(peerId, messageId) {
  const result = await callVkApi('messages.getById', {
    message_ids: String(messageId)
  });
  const items = Array.isArray(result?.items) ? result.items : [];
  return items.some(item =>
    Number(item?.id) === Number(messageId) &&
    Number(item?.deleted || 0) !== 1
  );
}

async function sendPrivateMenu(peerId, keyboard = null, messageText = null, summary = null, options = {}) {
  if (!VK_ACCESS_TOKEN) {
    throw new Error('VK_BOT_ACCESS_TOKEN не настроен');
  }

  let currentSummary = summary;
  if (!keyboard || !messageText) {
    try {
      if (!currentSummary) currentSummary = await loadPrivateMenuSummary();
    } catch (error) {
      console.error('[VK] could not load summary for private menu:', error.message);
    }
  }
  const currentKeyboard = keyboard || await buildPrivateMenuKeyboard(currentSummary);
  const currentMessage = messageText ||
    (currentSummary ? formatPrivateMenuText(currentSummary) :
      '📋 MINIBAR OS\nСводка временно недоступна. Попробуй открыть меню ещё раз.');

  const existingMessageId = options.forceNew ? null : await getPrivateMenuMessageId(peerId);
  if (existingMessageId) {
    // Recover only when VK confirms the stored message no longer exists. Temporary API
    // failures still throw, so they cannot accidentally create duplicate menus.
    const existingAvailable = await isStoredPrivateMenuAvailable(peerId, existingMessageId);
    if (existingAvailable) {
      await editPrivateMenu(peerId, existingMessageId, currentKeyboard, currentMessage);
      return;
    }
    console.warn('[VK] stored menu is missing for user=' + peerId + '; creating one replacement');
    await forgetPrivateMenuMessage(peerId);
  }

  const params = new URLSearchParams({
    peer_id: String(peerId),
    message: currentMessage,
    keyboard: JSON.stringify(currentKeyboard),
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

  const messageId = Number(
    data.response?.message_id ??
    data.response?.id ??
    data.response
  );
  if (Number.isSafeInteger(messageId) && messageId > 0) {
    try {
      await rememberPrivateMenuMessage(peerId, messageId);
    } catch (error) {
      console.error('[VK] could not persist menu message id for user=' + peerId + ': ' + error.message);
      throw error;
    }
  } else {
    throw new Error('[VK] did not return a usable menu message id; refusing to send another menu');
  }
}

async function editPrivateMenu(peerId, messageId, keyboard, messageText) {
  const params = new URLSearchParams({
    peer_id: String(peerId),
    message_id: String(messageId),
    message: String(messageText || '📋 MINIBAR OS'),
    keyboard: JSON.stringify(keyboard),
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

async function refreshAllPrivateMenus(reason, summary = null) {
  const recipientIds = await getPrivateDialogIds();
  if (!recipientIds.length) {
    console.log('[VK] no registered private dialogs; menu refresh skipped');
    return true;
  }

  const currentSummary = summary || await loadPrivateMenuSummary();
  const messageText = formatPrivateMenuText(currentSummary);
  const keyboard = await buildPrivateMenuKeyboard(currentSummary);
  let allUpdated = true;
  let updated = 0;

  for (const recipientId of recipientIds) {
    try {
      const menuMessageId = await getPrivateMenuMessageId(recipientId);
      if (menuMessageId) {
        try {
          const menuAvailable = await isStoredPrivateMenuAvailable(recipientId, menuMessageId);
          if (!menuAvailable) {
            console.warn('[VK] stored menu is missing for user=' + recipientId +
              '; creating one replacement');
            await forgetPrivateMenuMessage(recipientId);
            await sendPrivateMenu(recipientId, keyboard, messageText, currentSummary);
            updated += 1;
            continue;
          }
          await editPrivateMenu(recipientId, menuMessageId, keyboard, messageText);
          updated += 1;
        } catch (error) {
          allUpdated = false;
          console.warn('[VK] could not verify/edit stored menu for user=' + recipientId +
            '; not sending a duplicate menu and will retry: ' + error.message);
        }
        continue;
      }

      await sendPrivateMenu(recipientId, keyboard, messageText, currentSummary);
      updated += 1;
    } catch (error) {
      allUpdated = false;
      console.error('[VK] private menu refresh failed for user=' + recipientId +
        ' reason=' + reason + ': ' + error.message);
    }
  }

  console.log('[VK] private menus refreshed reason=' + reason +
    ' updated=' + updated + '/' + recipientIds.length +
    ' exciseButton=' + Boolean(currentSummary.excises?.hasExcises));
  return allUpdated;
}

async function persistExciseMenuState(hasExcises) {
  await fs.mkdir(path.dirname(EXCISE_MENU_STATE_FILE), { recursive: true });
  const tempPath = EXCISE_MENU_STATE_FILE + '.tmp';
  await fs.writeFile(tempPath, JSON.stringify({ hasExcises }), 'utf8');
  await fs.rename(tempPath, EXCISE_MENU_STATE_FILE);
}

async function checkExciseMenuState() {
  if (exciseMenuMonitorRunning) return;
  exciseMenuMonitorRunning = true;
  try {
    const summary = await loadPrivateMenuSummary();
    const hasExcises = Boolean(summary.excises?.hasExcises || Number(summary.excises?.total) > 0);
    const messageText = formatPrivateMenuText(summary);
    let previous = knownExcisePresence;
    if (previous === null) {
      try {
        const stored = JSON.parse(await fs.readFile(EXCISE_MENU_STATE_FILE, 'utf8'));
        if (typeof stored?.hasExcises === 'boolean') previous = stored.hasExcises;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }

    const exciseStateChanged = previous === null ? true : previous !== hasExcises;
    const messageChanged = knownPrivateMenuText === null || knownPrivateMenuText !== messageText;
    if (exciseStateChanged || messageChanged) {
      const reason = exciseStateChanged
        ? (previous === null ? 'initial-state' : 'excise-state-changed')
        : 'summary-changed';
      const refreshed = await refreshAllPrivateMenus(reason, summary);
      if (!refreshed) {
        console.warn('[VK] not all private menus refreshed; will retry on the next poll');
        return;
      }
    }

    knownExcisePresence = hasExcises;
    knownPrivateMenuText = messageText;
    await persistExciseMenuState(hasExcises);
  } catch (error) {
    console.error('[VK] private menu monitor failed:', error.message);
  } finally {
    exciseMenuMonitorRunning = false;
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

  const messageId = Number(data.response?.message_id ?? data.response?.id ?? data.response);
  return Number.isSafeInteger(messageId) && messageId > 0 ? messageId : null;
}


function formatPrivateSettingsText(settings) {
  const lines = [
    '⚙️ Настройки MINIBAR OS',
    '',
    '📋 Ежедневная отправка меню: ' + (settings.dailyMenuEnabled ? 'включена' : 'отключена'),
    'Время: ' + settings.dailyMenuTime,
    '',
    '🔔 Все уведомления: ' + (settings.notificationsEnabled ? 'включены' : 'отключены'),
    ...NOTIFICATION_CATEGORIES.map(category =>
      (settings.notificationSubscriptions[category.key] ? '✅ ' : '▫️ ') + category.label
    )
  ];
  if (settings.awaitingMenuTime) {
    lines.push('', '✍️ Отправь новое время в формате ЧЧ:ММ, например 09:30.');
  }
  return lines.join('\n');
}

function privateSettingsButton(label, command, extra = {}, color = 'primary') {
  return {
    action: {
      type: 'callback',
      label,
      payload: JSON.stringify({ command, ...extra })
    },
    color
  };
}

function buildPrivateSettingsKeyboard(settings) {
  if (settings.awaitingMenuTime) {
    return {
      inline: true,
      buttons: [[privateSettingsButton('Отмена', 'settings_cancel_menu_time', {}, 'secondary')]]
    };
  }

  // VK inline keyboards support at most 6 rows. Keep the daily menu toggle
  // and time picker together; the persistent bottom keyboard already has Menu.
  const buttons = [
    [
      privateSettingsButton(
        'Ежедневное меню: ' + (settings.dailyMenuEnabled ? 'Вкл.' : 'Выкл.'),
        'settings_toggle_daily_menu',
        {},
        settings.dailyMenuEnabled ? 'positive' : 'secondary'
      ),
      privateSettingsButton('Время: ' + settings.dailyMenuTime, 'settings_set_menu_time')
    ],
    [privateSettingsButton(
      'Все уведомления: ' + (settings.notificationsEnabled ? 'Вкл.' : 'Выкл.'),
      'settings_toggle_notifications',
      {},
      settings.notificationsEnabled ? 'positive' : 'secondary'
    )]
  ];

  for (const category of NOTIFICATION_CATEGORIES) {
    const enabled = settings.notificationSubscriptions[category.key] === true;
    buttons.push([privateSettingsButton(
      (enabled ? '✅ ' : '▫️ ') + category.label,
      'settings_toggle_notification',
      { key: category.key },
      enabled ? 'positive' : 'secondary'
    )]);
  }

  return { inline: true, buttons };
}

async function showPrivateSettings(peerId) {
  let settings = await getPrivateUserSettings(peerId);
  const messageText = formatPrivateSettingsText(settings);
  const keyboard = buildPrivateSettingsKeyboard(settings);

  // Reuse the existing settings panel rather than adding another settings
  // message every time the persistent keyboard's Settings button is pressed.
  if (settings.settingsMessageId) {
    const available = await isStoredPrivateMenuAvailable(peerId, settings.settingsMessageId);
    if (available) {
      await editPrivateMenu(peerId, settings.settingsMessageId, keyboard, messageText);
      return;
    }
    settings = await updatePrivateUserSettings(peerId, { settingsMessageId: null });
  }

  const messageId = await sendPrivateText(peerId, messageText, keyboard);
  if (messageId) {
    await updatePrivateUserSettings(peerId, { settingsMessageId: messageId });
  } else {
    console.warn('[VK] VK did not return a message id for settings panel user=' + peerId);
  }
}

async function checkDailyPrivateMenus() {
  if (dailyMenuSchedulerRunning) return;
  dailyMenuSchedulerRunning = true;
  try {
    const recipientIds = await getPrivateDialogIds();
    if (!recipientIds.length) return;

    const localNow = getBotLocalDateTime();
    const dueRecipientIds = [];
    for (const recipientId of recipientIds) {
      const settings = await getPrivateUserSettings(recipientId);
      if (settings.dailyMenuEnabled &&
          localNow.timeKey >= settings.dailyMenuTime &&
          settings.lastDailyMenuDate !== localNow.dateKey &&
          settings.suppressDailyMenuDate !== localNow.dateKey) {
        dueRecipientIds.push(recipientId);
      }
    }
    if (!dueRecipientIds.length) return;

    const summary = await loadPrivateMenuSummary();
    const messageText = formatPrivateMenuText(summary);
    const keyboard = await buildPrivateMenuKeyboard(summary);

    for (const recipientId of dueRecipientIds) {
      try {
        const settings = await getPrivateUserSettings(recipientId);
        await sendPrivateMenu(
          recipientId,
          keyboard,
          messageText,
          summary,
          { forceNew: true }
        );
        await updatePrivateUserSettings(recipientId, {
          lastDailyMenuDate: localNow.dateKey
        });
        console.log('[VK] daily private menu sent user=' + recipientId +
          ' time=' + localNow.timeKey + ' date=' + localNow.dateKey);
      } catch (error) {
        console.error('[VK] daily private menu failed for user=' + recipientId + ': ' + error.message);
      }
    }
  } catch (error) {
    console.error('[VK] daily private menu scheduler failed:', error.message);
  } finally {
    dailyMenuSchedulerRunning = false;
  }
}

const EXCISE_XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

async function loadExcisesFromBackend() {
  const response = await fetch(API_BASE_URL + '/api/excises', {
    headers: { 'X-Minibar-Bot-Token': INTERNAL_TOKEN },
    cache: 'no-store'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(data)) {
    throw new Error(data.error || 'Не удалось загрузить акцизы из базы данных');
  }
  return data.map(item => ({
    id: item.id,
    markNumber: String(item.markNumber ?? item.mark_number ?? '').trim(),
    createdAt: item.createdAt ?? item.created_at ?? null
  }));
}

function isValidExciseMark(mark) {
  const value = String(mark || '').trim();
  return value.length >= 20 && /^\d/.test(value);
}

function exciseFileName(dateValue = new Date()) {
  const two = value => String(value).padStart(2, '0');
  const parsedOffset = Number.parseInt(VK_BOT_TIMEZONE_OFFSET, 10);
  const offsetMinutes = Number.isFinite(parsedOffset) ? parsedOffset : -300;
  // Shift the instant into the configured bot-local date and use UTC getters
  // so the result is independent of the container's own TZ setting.
  const localDate = new Date(dateValue.getTime() - offsetMinutes * 60 * 1000);
  const date = two(localDate.getUTCDate()) + '.' + two(localDate.getUTCMonth() + 1) + '.' +
    String(localDate.getUTCFullYear()).slice(-2);
  return 'Акцизы мини-бар ' + date + '.xlsx';
}

function exciseCrc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildExciseXlsxBytes(values) {
  const xml = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  const rows = values.map((value, index) => {
    const row = index + 1;
    return '<row r="' + row + '"><c r="A' + row + '" t="inlineStr"><is><t xml:space="preserve">' +
      xml(value) + '</t></is></c></row>';
  }).join('');
  const entries = [
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets><sheet name="Акцизы" sheetId="1" r:id="rId1"/></sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'],
    ['xl/worksheets/sheet1.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
      rows + '</sheetData></worksheet>']
  ];

  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  for (const [name, content] of entries) {
    const nameBytes = Buffer.from(name, 'utf8');
    const data = Buffer.from(content, 'utf8');
    const checksum = exciseCrc32(data);
    const local = Buffer.alloc(30 + nameBytes.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x0021, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    nameBytes.copy(local, 30);
    localParts.push(local, data);

    const central = Buffer.alloc(46 + nameBytes.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x0021, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(localOffset, 42);
    nameBytes.copy(central, 46);
    centralParts.push(central);
    localOffset += local.length + data.length;
  }

  const directory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(localOffset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, directory, end]);
}

async function createExciseExportSnapshot() {
  // New scans created after the snapshot remain in the database when this file is cleared.
  const clearBefore = Date.now();
  const rows = await loadExcisesFromBackend();
  const valid = rows.filter(item => isValidExciseMark(item.markNumber)).map(item => item.markNumber);
  return {
    clearBefore,
    filename: exciseFileName(new Date(clearBefore)),
    valid,
    bytes: valid.length ? buildExciseXlsxBytes(valid) : null
  };
}

function clearExcisesKeyboard(clearBefore, count) {
  return {
    inline: true,
    buttons: [[{
      action: {
        type: 'callback',
        label: 'Очистить акцизы',
        payload: JSON.stringify({
          command: 'clear_excises',
          clearBefore: Number(clearBefore),
          count: Number(count)
        })
      },
      color: 'negative'
    }]]
  };
}

async function uploadAndSendExciseFile(peerId, snapshot) {
  const uploadServer = await callVkApi('docs.getMessagesUploadServer', {
    peer_id: peerId,
    type: 'doc'
  });
  if (!uploadServer?.upload_url) throw new Error('VK не вернул адрес загрузки Excel-файла');

  const form = new FormData();
  form.append('file', new Blob([snapshot.bytes], { type: EXCISE_XLSX_MIME }), snapshot.filename);
  const uploadResponse = await fetch(uploadServer.upload_url, { method: 'POST', body: form });
  const uploadText = await uploadResponse.text();
  let uploaded = {};
  try { uploaded = JSON.parse(uploadText); }
  catch { uploaded = { raw: uploadText }; }
  if (!uploadResponse.ok || uploaded.error || !uploaded.file) {
    const detail = uploaded.error
      ? (typeof uploaded.error === 'string' ? uploaded.error : JSON.stringify(uploaded.error))
      : (uploaded.raw || JSON.stringify(uploaded));
    throw new Error('VK upload HTTP ' + uploadResponse.status + ': ' +
      String(detail || 'поле file отсутствует').slice(0, 400));
  }

  const saved = await callVkApi('docs.save', { file: uploaded.file, title: snapshot.filename });
  const doc = saved?.doc || (Array.isArray(saved) ? (saved[0]?.doc || saved[0]) : saved);
  if (!doc || !Number.isSafeInteger(Number(doc.id)) || !Number.isSafeInteger(Number(doc.owner_id))) {
    throw new Error('VK не подтвердил сохранение Excel-документа');
  }

  // The count message owns the clear button; the following document message
  // contains only the Excel attachment so it can be forwarded independently.
  await callVkApi('messages.send', {
    peer_id: peerId,
    random_id: String(Math.floor(Math.random() * 2147483647) + 1),
    message: '📄 Акцизы мини-бар\nМарок: ' + snapshot.valid.length,
    keyboard: JSON.stringify(clearExcisesKeyboard(snapshot.clearBefore, snapshot.valid.length))
  });
  await callVkApi('messages.send', {
    peer_id: peerId,
    random_id: String(Math.floor(Math.random() * 2147483647) + 1),
    attachment: 'doc' + String(doc.owner_id) + '_' + String(doc.id)
  });
  console.log('[VK] excise Excel sent peer=' + peerId + ' count=' + snapshot.valid.length +
    ' file=' + snapshot.filename + ' clearBefore=' + snapshot.clearBefore);
}

async function sendExcisesFile(peerId) {
  const targetPeerId = String(peerId || '').trim();
  if (!/^\d+$/.test(targetPeerId) ||
      !Number.isSafeInteger(Number(targetPeerId)) ||
      Number(targetPeerId) <= 0) {
    throw new Error('Не удалось определить чат, в котором нажали кнопку');
  }

  const snapshot = await createExciseExportSnapshot();
  if (!snapshot.valid.length) {
    await sendPrivateText(targetPeerId, '⚠️ В базе нет валидных акцизов для Excel-файла.');
    return { ok: false, count: 0 };
  }

  try {
    await uploadAndSendExciseFile(targetPeerId, snapshot);
    console.log('[VK] requested excise Excel sent to invoking peer=' + targetPeerId +
      ' count=' + snapshot.valid.length + ' file=' + snapshot.filename);
    return { ok: true, count: snapshot.valid.length, filename: snapshot.filename, peer: targetPeerId };
  } catch (error) {
    console.error('[VK] requested excise Excel failed in invoking peer=' + targetPeerId + ': ' + error.message);
    await sendPrivateText(targetPeerId, '⚠️ Не удалось отправить Excel в этот чат. ' + error.message);
    return { ok: false, count: snapshot.valid.length, error: error.message };
  }
}
async function handleClearExcisesButton(event, payload) {
  const peerId = String(event?.peer_id || '').trim();
  const cmid = Number(event?.conversation_message_id);
  const clearBefore = Number(payload?.clearBefore);
  if (!peerId || !Number.isSafeInteger(cmid) || cmid <= 0 ||
      !Number.isSafeInteger(clearBefore) || clearBefore <= 0) {
    throw new Error('Некорректные данные кнопки очистки акцизов');
  }

  const response = await fetch(API_BASE_URL + '/api/excises/clear-before', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Minibar-Bot-Token': INTERNAL_TOKEN
    },
    body: JSON.stringify({ before: new Date(clearBefore).toISOString() })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok !== true) {
    throw new Error(data.error || 'Не удалось очистить акцизы в базе данных');
  }

  // The button is on the count message, never on the file. Remove the button
  // after clearing, without sending a confirmation or modifying the attachment.
  const exportedCount = Number(payload?.count);
  if (Number.isSafeInteger(exportedCount) && exportedCount >= 0) {
    try {
      await editPrivateMessage(
        peerId,
        cmid,
        '📄 Акцизы мини-бар\nМарок: ' + exportedCount,
        { inline: true, buttons: [] }
      );
    } catch (error) {
      console.warn('[VK] could not remove excise clear button: ' + error.message);
    }
  }

  // The regular monitor refreshes the latest menu in place. It must not
  // send another menu after the excise count changes.
  void checkExciseMenuState();

  console.log('[VK] excises cleared before=' + clearBefore + ' deleted=' + (Number(data.deleted) || 0) +
    ' peer=' + peerId);
  return data;
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

async function editPrivateMessagePreservingAttachments(peerId, conversationMessageId, messageText) {
  const cmid = Number(conversationMessageId);
  if (!Number.isSafeInteger(cmid) || cmid <= 0) {
    throw new Error('Не удалось определить сообщение с Excel-файлом');
  }

  const found = await callVkApi('messages.getByConversationMessageId', {
    peer_id: String(peerId),
    conversation_message_ids: String(cmid)
  });
  const original = Array.isArray(found?.items)
    ? (found.items.find(item => Number(item.conversation_message_id) === cmid) || found.items[0])
    : null;
  if (!original) {
    throw new Error('VK не вернул исходное сообщение с Excel-файлом');
  }

  const attachments = (Array.isArray(original.attachments) ? original.attachments : [])
    .map(item => {
      const type = String(item?.type || '').trim();
      const media = type ? item[type] : null;
      if (!type || !media || media.owner_id == null || media.id == null) {
        throw new Error('Не удалось безопасно сохранить одно из вложений сообщения');
      }
      return type + String(media.owner_id) + '_' + String(media.id) +
        (media.access_key ? '_' + String(media.access_key) : '');
    });

  // An empty attachment list would replace and remove the Excel document, so refuse to edit.
  if (!attachments.length || !attachments.some(value => value.startsWith('doc'))) {
    throw new Error('В исходном сообщении не найден документ для сохранения');
  }

  const params = new URLSearchParams({
    peer_id: String(peerId),
    conversation_message_id: String(cmid),
    message: String(messageText || ''),
    attachment: attachments.join(','),
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

async function editPrivateMessage(peerId, conversationMessageId, message, keyboard = { inline: true, buttons: [] }) {
  const cmid = Number(conversationMessageId);
  if (!Number.isSafeInteger(cmid) || cmid <= 0) {
    throw new Error('Не удалось определить сообщение для редактирования');
  }

  const params = new URLSearchParams({
    peer_id: String(peerId),
    conversation_message_id: String(cmid),
    message,
    keyboard: JSON.stringify(keyboard),
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
  const eventId = String(event?.event_id || '').trim();
  const userId = Number(event?.user_id);
  const peerId = Number(event?.peer_id);
  if (!eventId || !Number.isSafeInteger(userId) || userId <= 0 ||
      !Number.isSafeInteger(peerId) || peerId <= 0) {
    throw new Error('VK message_event lacks event_id, user_id or peer_id');
  }

  const params = new URLSearchParams({
    event_id: eventId,
    user_id: String(userId),
    peer_id: String(peerId),
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
  console.log('[VK] message_event answer accepted user=' + userId +
    ' peer=' + peerId + ' event_id=' + eventId);
}

async function callVkApi(method, values = {}) {
  if (!VK_ACCESS_TOKEN) throw new Error('VK_BOT_ACCESS_TOKEN не настроен');
  const params = new URLSearchParams({
    ...Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value)])),
    access_token: VK_ACCESS_TOKEN,
    v: VK_API_VERSION
  });
  const response = await fetch('https://api.vk.com/method/' + method, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: params
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    throw new Error(data.error?.error_msg || 'VK API ' + method + ' failed');
  }
  return data.response;
}

function vkSettingEnabled(value) {
  return value === true || value === 1 || value === '1';
}

// Callback buttons never finish loading unless VK delivers message_event and
// the bot calls messages.sendMessageEventAnswer. Ensure the existing callback
// server subscribes to that event, instead of leaving this as a manual setting.
async function ensureMessageEventSubscription() {
  if (!VK_ACCESS_TOKEN || !/^\d+$/.test(groupId)) {
    console.warn('[VK] cannot verify message_event subscription: group ID or access token missing');
    return;
  }

  try {
    const response = await callVkApi('groups.getCallbackServers', { group_id: groupId });
    const servers = Array.isArray(response?.items) ? response.items : [];
    if (!servers.length) {
      console.warn('[VK] no Callback API servers found; message_event subscription was not changed');
      return;
    }

    const configuredServerId = String(process.env.VK_CALLBACK_SERVER_ID || '').trim();
    const serverSettings = [];
    for (const server of servers) {
      const settingsResponse = await callVkApi('groups.getCallbackSettings', {
        group_id: groupId,
        server_id: server.id
      });
      // VK returns event subscriptions nested under "events" in the
      // Callback API settings response.
      const settings = settingsResponse?.events || settingsResponse || {};
      serverSettings.push({ server, settings });
    }

    let target;
    if (configuredServerId) {
      target = serverSettings.find(item => String(item.server.id) === configuredServerId);
      if (!target) {
        console.warn('[VK] VK_CALLBACK_SERVER_ID=' + configuredServerId +
          ' was not found; message_event subscription was not changed');
        return;
      }
    } else if (serverSettings.length === 1) {
      target = serverSettings[0];
    } else {
      const messageServers = serverSettings.filter(item =>
        vkSettingEnabled(item.settings.message_new)
      );
      if (messageServers.length === 1) {
        target = messageServers[0];
      } else {
        console.warn('[VK] cannot safely select Callback API server for message_event; ' +
          'servers=' + serverSettings.map(item =>
            String(item.server.id) + ':message_new=' + String(item.settings.message_new)
          ).join(', ') + '. Set VK_CALLBACK_SERVER_ID to the correct server ID.');
        return;
      }
    }

    if (vkSettingEnabled(target.settings.message_event)) {
      console.log('[VK] Callback API message_event is already enabled on server=' + target.server.id);
      return;
    }

    await callVkApi('groups.setCallbackSettings', {
      group_id: groupId,
      server_id: target.server.id,
      message_event: 1
    });
    const verifyResponse = await callVkApi('groups.getCallbackSettings', {
      group_id: groupId,
      server_id: target.server.id
    });
    const verifiedSettings = verifyResponse?.events || verifyResponse || {};
    if (!vkSettingEnabled(verifiedSettings.message_event)) {
      throw new Error('VK did not enable message_event on Callback API server=' + target.server.id);
    }
    console.log('[VK] Callback API message_event enabled and verified on server=' + target.server.id);
  } catch (error) {
    console.error('[VK] could not enable Callback API message_event:', error.message);
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

async function handlePrivateSettingsButton(event, payload) {
  const userId = Number(event?.user_id);
  const peerId = String(event?.peer_id || '').trim();
  const cmid = Number(event?.conversation_message_id);
  if (!Number.isSafeInteger(userId) || userId <= 0 || peerId !== String(userId) ||
      !Number.isSafeInteger(cmid) || cmid <= 0) {
    throw new Error('Настройки доступны только в личном диалоге с ботом');
  }

  let settings = await getPrivateUserSettings(userId);
  const command = String(payload?.command || '');

  if (command === 'settings_toggle_daily_menu') {
    const enable = !settings.dailyMenuEnabled;
    const localNow = getBotLocalDateTime();
    settings = await updatePrivateUserSettings(userId, {
      dailyMenuEnabled: enable,
      awaitingMenuTime: false,
      ...(enable && localNow.timeKey > settings.dailyMenuTime
        ? { suppressDailyMenuDate: localNow.dateKey }
        : {})
    });
  } else if (command === 'settings_toggle_notifications') {
    settings = await updatePrivateUserSettings(userId, {
      notificationsEnabled: !settings.notificationsEnabled,
      awaitingMenuTime: false
    });
  } else if (command === 'settings_toggle_notification') {
    const key = String(payload?.key || '');
    if (!NOTIFICATION_CATEGORIES.some(category => category.key === key)) {
      throw new Error('Неизвестная категория уведомлений');
    }
    settings = await updatePrivateUserSettings(userId, {
      notificationSubscriptions: {
        [key]: !settings.notificationSubscriptions[key]
      },
      awaitingMenuTime: false
    });
  } else if (command === 'settings_set_menu_time') {
    settings = await updatePrivateUserSettings(userId, {
      awaitingMenuTime: true,
      settingsMessageCmid: cmid
    });
    await editPrivateMessage(
      peerId,
      cmid,
      formatPrivateSettingsText(settings),
      buildPrivateSettingsKeyboard(settings)
    );
    return;
  } else if (command === 'settings_cancel_menu_time') {
    settings = await updatePrivateUserSettings(userId, {
      awaitingMenuTime: false
    });
  } else if (command === 'settings_show_menu') {
    await updatePrivateUserSettings(userId, { awaitingMenuTime: false });
    await editPrivateMessage(
      peerId,
      cmid,
      '📋 Открываю меню. Следующее сообщение — актуальное меню MINIBAR OS.',
      { inline: true, buttons: [] }
    );
    await sendPrivateMenu(peerId, null, null, null, { forceNew: true });
    return;
  } else {
    throw new Error('Неизвестная команда настроек');
  }

  settings = await getPrivateUserSettings(userId);
  await editPrivateMessage(
    peerId,
    cmid,
    formatPrivateSettingsText(settings),
    buildPrivateSettingsKeyboard(settings)
  );
}

async function sendDeadlineNotifications(notifications, eventId) {
  if (!Array.isArray(notifications)) return;
  const recipientIds = await getPrivateDialogIds();
  if (!recipientIds.length) {
    console.warn('[VK] no registered private dialogs; notifications were not sent');
    return;
  }

  const subscriptionKeys = {
    emptied: 'emptied',
    emptied_with_deadlines: 'emptiedWithDeadlines',
    refilled_empty: 'refilledEmpty',
    refilled_with_comment: 'refilledWithComment'
  };
  const roomsWithDetailedEmptying = new Set(
    notifications
      .filter(notification =>
        notification?.type === 'emptied_with_deadlines' &&
        Array.isArray(notification.products) &&
        notification.products.length > 0
      )
      .map(notification => Number(notification.roomNumber))
      .filter(roomNumber => Number.isSafeInteger(roomNumber))
  );

  for (const notification of notifications) {
    const roomNumber = Number(notification?.roomNumber);
    if (!Number.isSafeInteger(roomNumber) || roomNumber < 100 || roomNumber > 9999) continue;

    const subscriptionKey = subscriptionKeys[notification.type];
    if (!subscriptionKey) continue;

    let messageText;
    let keyboard = null;
    if (notification.type === 'emptied') {
      messageText = '🧊 Номер ' + roomNumber + ' опустошён.';
    } else if (notification.type === 'emptied_with_deadlines') {
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
    } else if (notification.type === 'refilled_with_comment') {
      const note = String(notification.note || '').trim();
      if (!note) continue;
      messageText = '💬 Номер ' + roomNumber + ' пополнен с комментарием:\n' + note;
    } else {
      continue;
    }

    for (const recipientId of recipientIds) {
      try {
        const settings = await getPrivateUserSettings(recipientId);
        if (!settings.notificationsEnabled ||
            settings.notificationSubscriptions[subscriptionKey] !== true) {
          continue;
        }

        // Detailed emptying notices take precedence over generic emptying notices
        // per user. If the detail subscription is enabled, send only one message.
        if (notification.type === 'emptied' &&
            roomsWithDetailedEmptying.has(roomNumber) &&
            settings.notificationSubscriptions.emptiedWithDeadlines === true) {
          continue;
        }

        await sendPrivateText(recipientId, messageText, keyboard);
      } catch (error) {
        console.error('[VK] operational notification failed for room=' + roomNumber +
          ' type=' + notification.type + ' user=' + recipientId + ': ' + error.message);
      }
    }
  }
}

async function requestPrivateRoomApi(endpoint, values) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value)]))
  );
  const response = await fetch(API_BASE_URL + '/api/vk-bot/' + endpoint + '?' + query.toString(), {
    method: 'GET',
    headers: {
      'X-Minibar-Bot-Token': INTERNAL_TOKEN,
      'X-Timezone-Offset': VK_BOT_TIMEZONE_OFFSET
    },
    cache: 'no-store'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Не удалось загрузить данные номера');
    error.statusCode = response.status;
    throw error;
  }
  return data;
}

function formatRoomDateTime(value) {
  if (!value) return 'Нет данных';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Нет данных';
  const parsedOffset = Number.parseInt(VK_BOT_TIMEZONE_OFFSET, 10);
  const offsetMinutes = Number.isFinite(parsedOffset) ? parsedOffset : -300;
  const localDate = new Date(date.getTime() - offsetMinutes * 60 * 1000);
  const pad = number => String(number).padStart(2, '0');
  return pad(localDate.getUTCDate()) + '.' +
    pad(localDate.getUTCMonth() + 1) + '.' +
    localDate.getUTCFullYear() + ' ' +
    pad(localDate.getUTCHours()) + ':' + pad(localDate.getUTCMinutes());
}

function roomOperationalStatusLabel(data) {
  const lastAction = data?.lastAction || null;
  if (data?.room?.expiryStatus === 'empty' ||
      (lastAction && ['vk_emptied', 'emptied', 'empty'].includes(String(lastAction.type || '')))) {
    return 'Опустошён';
  }
  if (Array.isArray(data?.refillProducts) && data.refillProducts.length) {
    return 'Нужно пополнить';
  }
  return 'Полный';
}

function roomDeadlineStatusLabel(status) {
  const labels = {
    neutral: 'Не проверен',
    empty: 'Опустошён',
    valid: 'В порядке',
    needs_replacement: 'Заменить'
  };
  return labels[String(status || '')] || (status ? String(status) : 'Неизвестен');
}

function formatProductQuantities(items, quantityKey) {
  return (Array.isArray(items) ? items : [])
    .filter(item => Math.max(0, Number(item?.[quantityKey]) || 0) > 0)
    .map(item => cleanHistoryText(item?.name || 'Продукт', 70) +
      (Number(item?.[quantityKey]) > 1 ? ' ×' + Number(item[quantityKey]) : ''))
    .join(', ');
}

function formatPrivateRoomInfo(data) {
  const room = data?.room || {};
  const lastCheck = data?.lastCheck || null;
  const status = roomOperationalStatusLabel(data);
  const deadlineProducts = formatProductQuantities(data?.deadlineProducts, 'qtyToReplace');
  const refillProducts = formatProductQuantities(data?.refillProducts, 'qty');
  const note = cleanHistoryText(lastCheck?.notes, 220);
  const lines = [
    '🏨 Номер ' + String(room.number || '—'),
    'Последняя проверка: ' + (lastCheck ? formatRoomDateTime(lastCheck.checkDate) : 'Нет данных'),
    'Статус: ' + status
  ];
  if (status === 'Нужно пополнить' && refillProducts) {
    lines.push('Продукты: ' + refillProducts);
  }
  lines.push('Статус сроков: ' + roomDeadlineStatusLabel(room.expiryStatus));
  if (room.expiryStatus === 'needs_replacement' && deadlineProducts) {
    lines.push('Продукты: ' + deadlineProducts);
  }
  if (note) lines.push('Комментарий: ' + note);
  return lines.join('\n');
}

function roomCallbackButton(label, command, extra = {}, color = 'primary') {
  return privateSettingsButton(label, command, extra, color);
}

function buildRoomInfoKeyboard(roomNumber) {
  const extra = { roomNumber: Number(roomNumber) };
  return {
    inline: true,
    buttons: [[
      roomCallbackButton('История', 'room_history', extra),
      roomCallbackButton('GIH', 'room_gih', extra)
    ]]
  };
}

function cleanHistoryText(value, maxLength = 140) {
  return String(value || '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, maxLength);
}

function roomHistoryTypeLabel(record) {
  if (record?.type === 'vk_emptied' || record?.type === 'emptied') return 'Опустошение';
  return 'Проверка';
}

function gihHistorySummary(record) {
  const mode = String(record?.gihRoomStatus || '');
  const modeLabels = {
    dnd: 'DND',
    all_in_place: 'Всё на месте',
    all_out: 'Всё выложили',
    empty: 'Опустошён',
    not_checked: 'Не проверен'
  };
  return modeLabels[mode] || '';
}

function formatGihStatusGroups(record) {
  const mode = String(record?.gihRoomStatus || '');
  if (['dnd', 'empty', 'not_checked'].includes(mode)) return [];

  const modeStatus = mode === 'all_in_place' ? 'in_place'
    : mode === 'all_out' ? 'out' : null;
  const labels = {
    replenished: 'Пополнено',
    in_place: 'На месте',
    out: 'Выложили',
    not_replenished: 'Не пополнено',
    pending: 'Не размечено'
  };
  const groups = new Map();
  for (const item of Array.isArray(record?.gihItems) ? record.gihItems : []) {
    const status = modeStatus || String(item?.itemStatus || 'pending');
    const name = cleanHistoryText(item?.productName || 'Продукт', 70);
    if (!groups.has(status)) groups.set(status, new Map());
    const products = groups.get(status);
    products.set(name, (products.get(name) || 0) + 1);
  }
  const order = ['replenished', 'in_place', 'out', 'not_replenished', 'pending'];
  return order.filter(status => groups.has(status)).map(status => {
    const products = [...groups.get(status)].map(([name, qty]) =>
      name + (qty > 1 ? ' ×' + qty : '')
    ).join(', ');
    return labels[status] + ': ' + products;
  });
}

function formatRoomHistoryRecord(record, section) {
  const date = formatRoomDateTime(record?.checkDate);
  const notes = cleanHistoryText(record?.notes, 220);
  if (section !== 'gih') {
    const operation = roomHistoryTypeLabel(record);
    const lines = ['• ' + date + ' — Операция: ' + operation];
    if (notes && notes !== operation && notes !== 'Проверен, жилой') {
      lines.push('  Комментарий: ' + notes);
    }
    return lines.join('\n');
  }

  const mode = gihHistorySummary(record);
  const lines = ['• ' + date + ' — GIH' + (mode ? ': ' + mode : '')];
  lines.push(...formatGihStatusGroups(record));
  if (notes && notes !== 'Проверен, жилой') lines.push('Комментарий: ' + notes);
  return lines.join('\n');
}

function formatPrivateRoomHistory(data, section) {
  const title = section === 'gih' ? 'GIH номера ' : 'История номера ';
  const items = Array.isArray(data?.items) ? data.items : [];
  if (!items.length) return '📚 ' + title + String(data?.room || '—') + '\n\nЗаписей пока нет.';
  const lines = ['📚 ' + title + String(data.room), ''];
  items.forEach((item, index) => {
    if (index) lines.push('');
    lines.push(formatRoomHistoryRecord(item, section));
  });
  return lines.join('\n');
}

function buildRoomHistoryKeyboard(roomNumber, section, count, hasMore) {
  const buttons = [];
  if (hasMore && count < 100) {
    buttons.push([roomCallbackButton(
      'Ещё',
      section === 'gih' ? 'room_gih_more' : 'room_history_more',
      { roomNumber: Number(roomNumber), count: Math.min(100, count + 3) }
    )]);
  }
  buttons.push([
    roomCallbackButton('История', 'room_history', { roomNumber: Number(roomNumber) }, section === 'history' ? 'positive' : 'primary'),
    roomCallbackButton('GIH', 'room_gih', { roomNumber: Number(roomNumber) }, section === 'gih' ? 'positive' : 'primary')
  ]);
  buttons.push([roomCallbackButton('↩ К номеру', 'room_info', { roomNumber: Number(roomNumber) }, 'secondary')]);
  return { inline: true, buttons };
}

async function showPrivateRoomInfo(peerId, roomNumber) {
  try {
    const data = await requestPrivateRoomApi('room-info', { number: roomNumber });
    await sendPrivateText(peerId, formatPrivateRoomInfo(data), buildRoomInfoKeyboard(roomNumber));
  } catch (error) {
    const message = error.statusCode === 404
      ? '⚠️ ' + error.message
      : '⚠️ Не удалось загрузить данные номера. Попробуй ещё раз.';
    await sendPrivateText(peerId, message);
  }
}

async function handleRoomInfoButton(event, payload) {
  const userId = Number(event?.user_id);
  const peerId = String(event?.peer_id || '').trim();
  const cmid = Number(event?.conversation_message_id);
  const roomNumber = Number(payload?.roomNumber);
  if (!Number.isSafeInteger(userId) || userId <= 0 ||
      peerId !== String(userId) ||
      !Number.isSafeInteger(cmid) || cmid <= 0 ||
      !Number.isInteger(roomNumber) || roomNumber < 100 || roomNumber > 9999) {
    throw new Error('Информация о номере доступна только в личном диалоге с ботом');
  }

  const command = String(payload?.command || '');
  if (command === 'room_info') {
    const data = await requestPrivateRoomApi('room-info', { number: roomNumber });
    await editPrivateMessage(peerId, cmid, formatPrivateRoomInfo(data), buildRoomInfoKeyboard(roomNumber));
    return;
  }

  const section = command.includes('gih') ? 'gih' : 'history';
  const isMore = command.endsWith('_more');
  const requestedCount = isMore ? Number(payload?.count) : 3;
  const count = Math.min(100, Math.max(3, Number.isSafeInteger(requestedCount) ? requestedCount : 3));
  const data = await requestPrivateRoomApi('room-history', {
    number: roomNumber,
    section,
    count
  });
  await editPrivateMessage(
    peerId,
    cmid,
    formatPrivateRoomHistory(data, section),
    buildRoomHistoryKeyboard(roomNumber, section, count, data.hasMore === true)
  );
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

  // Only a user's direct dialog registers them for personal settings and notices.
  await rememberPrivateDialog(senderId);

  const normalized = text.toLocaleLowerCase('ru-RU').replace(/^\/+/, '').trim();
  const commandText = normalized.replace(/^[^\p{L}\p{N}]+/u, '').trim();

  if (/^(?:начать|старт|start|меню|menu|начать работу)$/iu.test(commandText)) {
    await updatePrivateUserSettings(senderId, { awaitingMenuTime: false });
    await sendPrivateMenu(peerId, null, null, null, { forceNew: true });
    console.log('[VK] private menu opened for user=' + peerId);
    return true;
  }

  if (/^(?:настройки|settings)$/iu.test(commandText)) {
    await updatePrivateUserSettings(senderId, { awaitingMenuTime: false });
    await showPrivateSettings(peerId);
    console.log('[VK] private settings opened for user=' + peerId);
    return true;
  }

  if (/^📄?\s*получить акцизы$/iu.test(normalized)) {
    await sendExcisesFile(peerId);
    console.log('[VK] requested excise Excel from private dialog user=' + peerId);
    return true;
  }

  if (/^🧊?\s*опустошённые за сегодня$/iu.test(normalized)) {
    const response = await fetch(API_BASE_URL + '/api/vk-bot/emptied-today', {
      method: 'GET',
      headers: {
        'X-Minibar-Bot-Token': INTERNAL_TOKEN,
        'X-Timezone-Offset': VK_BOT_TIMEZONE_OFFSET
      },
      cache: 'no-store'
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

  const settings = await getPrivateUserSettings(senderId);
  if (settings.awaitingMenuTime) {
    const match = text.trim().match(/^(\d{1,2}):([0-5]\d)$/u);
    const hour = match ? Number(match[1]) : NaN;
    if (!match || hour < 0 || hour > 23) {
      const prompt = '✍️ Отправь время в формате ЧЧ:ММ, например 09:30.\n' +
        'Чтобы отменить изменение, нажми «Отмена» под этим сообщением.';
      if (settings.settingsMessageCmid) {
        await editPrivateMessage(
          peerId,
          settings.settingsMessageCmid,
          prompt,
          buildPrivateSettingsKeyboard(settings)
        );
      } else {
        await sendPrivateText(peerId, prompt);
      }
      return true;
    }

    const time = String(hour).padStart(2, '0') + ':' + match[2];
    const localNow = getBotLocalDateTime();
    const updatedSettings = await updatePrivateUserSettings(senderId, {
      dailyMenuTime: time,
      awaitingMenuTime: false,
      suppressDailyMenuDate: localNow.timeKey > time ? localNow.dateKey : null
    });
    const confirmationText = '✅ Время ежедневной отправки сохранено.\n\n' +
      formatPrivateSettingsText(updatedSettings);
    if (updatedSettings.settingsMessageCmid) {
      await editPrivateMessage(
        peerId,
        updatedSettings.settingsMessageCmid,
        confirmationText,
        buildPrivateSettingsKeyboard(updatedSettings)
      );
    } else {
      await sendPrivateText(peerId, confirmationText, buildPrivateSettingsKeyboard(updatedSettings));
    }
    return true;
  }

  if (/^\d{3,4}$/u.test(text.trim())) {
    await showPrivateRoomInfo(peerId, Number(text.trim()));
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

    console.log('[VK] message_event received user=' + String(event.user_id || '-') +
      ' peer=' + String(event.peer_id || '-') +
      ' event_id=' + String(event.event_id || '-') +
      ' command=' + String(payload?.command || 'unknown'));

    // Answer VK's callback immediately; do not keep the button spinner active
    // while the backend is checking or updating room data.
    sendText(res, 200, 'ok');

    void (async () => {
      try {
        try {
          await answerMessageEvent(
            event,
            payload?.command === 'deadlines_valid' ? 'Обновляю «Сроки»…' :
            payload?.command === 'clear_excises' ? 'Очищаю акцизы…' :
            String(payload?.command || '').startsWith('settings_') ? 'Сохраняю настройки…' :
            String(payload?.command || '').startsWith('room_') ? 'Загружаю данные номера…' : 'Готово'
          );
        } catch (answerError) {
          console.error('[VK] immediate message event acknowledgement failed:', answerError.message);
        }

        if (payload?.command === 'deadlines_valid') {
          await handleDeadlinesValidButton(event, payload);
        } else if (payload?.command === 'clear_excises') {
          await handleClearExcisesButton(event, payload);
        } else if (String(payload?.command || '').startsWith('settings_')) {
          await handlePrivateSettingsButton(event, payload);
        } else if (String(payload?.command || '').startsWith('room_')) {
          await handleRoomInfoButton(event, payload);
        } else {
          console.warn('[VK] unknown inline callback payload');
        }
      } catch (error) {
        console.error('[VK] inline button handling failed:', error.message);
        try {
          const command = String(payload?.command || '');
          const errorText = command === 'clear_excises'
            ? '⚠️ Не удалось очистить акцизы. Попробуй нажать кнопку ещё раз.'
            : command.startsWith('settings_')
              ? '⚠️ Не удалось сохранить настройки. Попробуй нажать кнопку ещё раз.'
              : command.startsWith('room_')
                ? '⚠️ Не удалось загрузить историю номера. Попробуй нажать кнопку ещё раз.'
                : '⚠️ Не удалось обновить «Сроки». Проверь номер и попробуй нажать кнопку ещё раз.';
          await sendPrivateText(String(event.peer_id || ''), errorText);
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
    void ensureMessageEventSubscription();
    void checkExciseMenuState();
    void checkDailyPrivateMenus();
    setInterval(() => { void checkExciseMenuState(); }, 10000);
    setInterval(() => { void checkDailyPrivateMenus(); }, 15000);
  });
}

startServer();
