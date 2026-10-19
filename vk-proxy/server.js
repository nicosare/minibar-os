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

function vkUrl(method, params = {}) {
  const search = new URLSearchParams({
    ...params,
    access_token: VK_ACCESS_TOKEN,
    v: VK_API_VERSION
  });

  return `https://api.vk.com/method/${method}?${search.toString()}`;
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
    throw new Error(data.error.error_msg || 'VK API error');
  }

  return data;
}

/**
 * VK's upload endpoint can occasionally return an incomplete payload without
 * the required "photo" field. Never call photos.saveMessagesPhoto with
 * undefined parameters: obtain a fresh upload URL and retry the binary upload.
 */
async function uploadPhotoToVk(fileBuffer, mimetype, roomNumber, peerId) {
  const attempts = 3;
  let lastReason = 'VK не вернул данные загруженного фото';

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const serverData = await vkJson(
        vkUrl('photos.getMessagesUploadServer', { peer_id: peerId })
      );
      const uploadUrl = serverData.response?.upload_url;

      if (typeof uploadUrl !== 'string' || !uploadUrl.startsWith('https://')) {
        throw new Error('VK не вернул корректный адрес загрузки фото');
      }

      // A new FormData is required for each attempt.
      const form = new FormData();
      form.append(
        'photo',
        new Blob([fileBuffer], { type: mimetype || 'image/jpeg' }),
        `room_${roomNumber}.jpg`
      );

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: form
      });

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

      // Validate every required field before constructing the save API request.
      const photo = result?.photo;
      const server = result?.server;
      const hash = result?.hash;

      if (
        (typeof photo !== 'string' && typeof photo !== 'number') ||
        String(photo).trim() === '' ||
        !server ||
        !hash
      ) {
        throw new Error('VK вернул неполные данные фото (photo/server/hash отсутствуют)');
      }

      return { photo: String(photo), server: String(server), hash: String(hash) };
    } catch (error) {
      lastReason = error.message || lastReason;
      console.warn(`[VK proxy] Upload attempt ${attempt}/${attempts} failed: ${lastReason}`);

      if (attempt < attempts) {
        await new Promise(resolve => setTimeout(resolve, 250 * attempt));
      }
    }
  }

  throw new Error(`Не удалось загрузить фото в VK после ${attempts} попыток: ${lastReason}`);
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

    const uploadResult = await uploadPhotoToVk(
      req.file.buffer,
      req.file.mimetype,
      roomNumber,
      peerId
    );

    const savedPhotoData = await vkJson(
      vkUrl('photos.saveMessagesPhoto', {
        photo: uploadResult.photo,
        server: uploadResult.server,
        hash: uploadResult.hash
      })
    );

    const savedPhoto = savedPhotoData.response?.[0];

    if (!savedPhoto?.owner_id || !savedPhoto?.id) {
      throw new Error('VK не вернул корректные данные сохранённого фото');
    }

    const attachment = `photo${savedPhoto.owner_id}_${savedPhoto.id}`;
    const randomId = Math.floor(Math.random() * 2147483647);

    const messageData = await vkJson(
      vkUrl('messages.send', {
        peer_id: peerId,
        message: roomNumber,
        attachment,
        random_id: randomId
      })
    );

    return res.json({
      ok: true,
      message_id: messageData.response
    });
  } catch (error) {
    console.error('[VK proxy]', error);

    return res.status(400).json({
      ok: false,
      error: error.message || 'Ошибка VK proxy'
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
