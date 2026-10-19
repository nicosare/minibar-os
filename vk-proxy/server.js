require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createPeerResolver } = require('./peer-id');

const app = express();

const PORT = Number(process.env.VK_PROXY_PORT || 3001);
const VK_ACCESS_TOKEN = process.env.VK_ACCESS_TOKEN || '';
const VK_API_VERSION = process.env.VK_API_VERSION || '5.199';
const DEFAULT_PEER_ID = String(process.env.VK_DEFAULT_PEER_ID || '');

const allowedPeerIds = String(process.env.VK_BOT_ALLOWED_PEER_IDS || '')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);

const resolvePeerId = createPeerResolver({
  defaultPeerId: DEFAULT_PEER_ID,
  allowedPeerIds
});

const corsOrigins = String(process.env.CORS_ORIGINS || '*')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || corsOrigins.includes('*') || corsOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('CORS origin is not allowed'));
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

function vkUrl(method) {
  return `https://api.vk.com/method/${method}`;
}

async function vkJson(url, options) {
  const response = await fetch(url, options);
  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(`VK вернул некорректный ответ (HTTP ${response.status})`);
  }

  if (!response.ok) {
    throw new Error(`VK HTTP ${response.status}`);
  }

  if (data.error) {
    const error = new Error(data.error.error_msg || 'VK API error');
    error.code = data.error.error_code;
    throw error;
  }

  return data;
}

// Send API parameters in the POST body. In particular, the upload "photo"
// value can be large and should not be placed into a URL query string.
async function vkCall(method, params = {}) {
  const body = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null)),
    access_token: VK_ACCESS_TOKEN,
    v: VK_API_VERSION
  });

  return vkJson(vkUrl(method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body
  });
}

function isLegacyPhotoUploadUrl(value) {
  try {
    const url = new URL(value);
    // VK's newer v2/bulk_upload response does not include the "photo" field
    // required by photos.saveMessagesPhoto. Do not upload bytes to that URL:
    // it wastes time and cannot complete the legacy save flow.
    return !/\/v2\/bulk_upload(?:\/|$)/i.test(url.pathname);
  } catch {
    return false;
  }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function uploadPhotoToVk(fileBuffer, mimetype, roomNumber, peerId) {
  const maxServerAttempts = 3;
  let lastReason = 'VK не вернул совместимый адрес загрузки фотографии';

  for (let attempt = 1; attempt <= maxServerAttempts; attempt += 1) {
    try {
      const serverData = await vkCall('photos.getMessagesUploadServer', {
        peer_id: peerId
      });
      const uploadUrl = serverData.response?.upload_url;

      if (typeof uploadUrl !== 'string' || !uploadUrl.startsWith('https://')) {
        throw new Error('VK не вернул корректный адрес загрузки фото');
      }

      if (!isLegacyPhotoUploadUrl(uploadUrl)) {
        lastReason = 'VK вернул новый bulk-upload адрес, несовместимый с photos.saveMessagesPhoto';
        console.warn(`[VK proxy] Incompatible photo upload URL, requesting another URL (${attempt}/${maxServerAttempts})`);
        if (attempt < maxServerAttempts) await sleep(120 * attempt);
        continue;
      }

      // Legacy VK photo upload protocol: multipart field must be named "photo".
      const form = new FormData();
      form.append(
        'photo',
        new Blob([fileBuffer], { type: mimetype || 'image/jpeg' }),
        `room_${roomNumber}.jpg`
      );

      const response = await fetch(uploadUrl, { method: 'POST', body: form });
      let result;

      try {
        result = await response.json();
      } catch {
        throw new Error(`Сервер загрузки VK вернул некорректный ответ (HTTP ${response.status})`);
      }

      if (!response.ok || result?.error) {
        throw new Error(
          typeof result?.error === 'string'
            ? result.error
            : `Ошибка загрузки фото в VK (HTTP ${response.status})`
        );
      }

      const photo = result?.photo;
      const server = result?.server;
      const hash = result?.hash;

      if (
        (typeof photo !== 'string' && typeof photo !== 'number') ||
        String(photo).trim() === '' ||
        server === undefined || server === null || String(server).trim() === '' ||
        typeof hash !== 'string' || hash.trim() === ''
      ) {
        lastReason = 'VK вернул неполные данные фото (photo/server/hash отсутствуют)';
        console.warn(`[VK proxy] Incomplete legacy upload response (${attempt}/${maxServerAttempts})`);
        if (attempt < maxServerAttempts) await sleep(120 * attempt);
        continue;
      }

      return { photo: String(photo), server: String(server), hash };
    } catch (error) {
      lastReason = error.message || lastReason;
      console.warn(`[VK proxy] Photo upload attempt ${attempt}/${maxServerAttempts} failed: ${lastReason}`);
      if (attempt < maxServerAttempts) await sleep(120 * attempt);
    }
  }

  throw new Error(
    `VK не предоставил совместимый адрес загрузки после ${maxServerAttempts} попыток. ${lastReason}`
  );
}

async function savePhotoOrDocument(fileBuffer, mimetype, roomNumber, peerId) {
  const uploaded = await uploadPhotoToVk(fileBuffer, mimetype, roomNumber, peerId);
  const saved = await vkCall('photos.saveMessagesPhoto', uploaded);
  const photo = saved.response?.[0];

  if (!photo?.owner_id || !photo?.id) {
    throw new Error('VK не вернул корректные данные сохранённого фото');
  }

  return {
    attachment: `photo${photo.owner_id}_${photo.id}`,
    mode: 'photo'
  };
}

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'minibar-vk-proxy',
    port: PORT,
    vk_api_version: VK_API_VERSION,
    token_configured: Boolean(VK_ACCESS_TOKEN)
  });
});

app.post('/send-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer?.length) {
      return res.status(400).json({
        ok: false,
        error: 'Файл фото не передан или пуст'
      });
    }

    const peerId = resolvePeerId(req.body?.peer_id);
    const roomNumber = String(req.body?.room || 'Неизвестно');

    if (!VK_ACCESS_TOKEN) {
      return res.status(500).json({
        ok: false,
        error: 'VK_ACCESS_TOKEN не настроен'
      });
    }

    const savedAttachment = await savePhotoOrDocument(
      req.file.buffer,
      req.file.mimetype,
      roomNumber,
      peerId
    );

    const requestedRandomId = Number(req.body?.random_id);
    const randomId = Number.isInteger(requestedRandomId) &&
      requestedRandomId > 0 &&
      requestedRandomId <= 2147483647
      ? requestedRandomId
      : Math.floor(Math.random() * 2147483647) + 1;

    const messageData = await vkCall('messages.send', {
      peer_id: peerId,
      message: roomNumber,
      attachment: savedAttachment.attachment,
      random_id: randomId
    });

    return res.json({
      ok: true,
      message_id: messageData.response,
      mode: savedAttachment.mode
    });
  } catch (error) {
    console.error('[VK proxy]', error);

    return res.status(400).json({
      ok: false,
      error: error.message || 'Ошибка VK proxy'
    });
  }
});


app.post('/send-message', async (req, res) => {
  try {
    if (!VK_ACCESS_TOKEN) {
      return res.status(500).json({ ok: false, error: 'VK_ACCESS_TOKEN не настроен' });
    }

    const peerId = resolvePeerId(req.body?.peer_id);
    const message = String(req.body?.message || '').trim();

    if (!message) {
      return res.status(400).json({ ok: false, error: 'Текст сообщения пуст' });
    }
    if (message.length > 1000) {
      return res.status(400).json({ ok: false, error: 'Сообщение слишком длинное' });
    }

    const result = await vkCall('messages.send', {
      peer_id: peerId,
      message,
      random_id: Math.floor(Math.random() * 2147483647) + 1
    });

    return res.json({ ok: true, message_id: result.response });
  } catch (error) {
    console.error('[VK proxy] Text message failed:', error.message);
    return res.status(400).json({
      ok: false,
      error: error.message || 'Не удалось отправить сообщение'
    });
  }
});

app.use((error, req, res, next) => {
  console.error('[Unhandled]', error);

  res.status(500).json({
    ok: false,
    error: error.message || 'Internal server error'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`VK proxy running on port ${PORT}`);
});
