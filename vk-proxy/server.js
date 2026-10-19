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

// Use the exact same allowlist as the long-poll bot. Do not maintain a
// separate VK_ALLOWED_PEER_IDS value that can silently point to another chat.
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
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: 'Файл фото не передан'
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

    const uploadServerData = await vkJson(
      vkUrl('photos.getMessagesUploadServer', {
        peer_id: peerId
      })
    );

    const uploadForm = new FormData();

    uploadForm.append(
      'photo',
      new Blob([req.file.buffer], {
        type: req.file.mimetype || 'image/jpeg'
      }),
      `room_${roomNumber}.jpg`
    );

    const uploadResponse = await fetch(
      uploadServerData.response.upload_url,
      {
        method: 'POST',
        body: uploadForm
      }
    );

    let uploadResult;

    try {
      uploadResult = await uploadResponse.json();
    } catch {
      throw new Error(
        `VK upload server вернул некорректный ответ (HTTP ${uploadResponse.status})`
      );
    }

    if (!uploadResponse.ok || uploadResult.error) {
      throw new Error(
        uploadResult?.error ||
        `Ошибка загрузки фото в VK (HTTP ${uploadResponse.status})`
      );
    }

    const savedPhotoData = await vkJson(
      vkUrl('photos.saveMessagesPhoto', {
        photo: uploadResult.photo,
        server: uploadResult.server,
        hash: uploadResult.hash
      })
    );

    const savedPhoto = savedPhotoData.response?.[0];

    if (!savedPhoto) {
      throw new Error('VK не вернул сохранённое фото');
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
