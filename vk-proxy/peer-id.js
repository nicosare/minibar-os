function createPeerResolver({ defaultPeerId = '', allowedPeerIds = [] } = {}) {
  const configuredDefault = String(defaultPeerId || '').trim();
  const allowlist = new Set(
    Array.from(allowedPeerIds || [])
      .map(value => String(value || '').trim())
      .filter(Boolean)
  );

  return function resolvePeerId(value) {
    if (allowlist.size === 0) {
      throw new Error(
        'VK_BOT_ALLOWED_PEER_IDS не настроен: отправка в беседу не разрешена до настройки списка доступа'
      );
    }

    // With one allowed chat, the bot's allowlist is authoritative. Ignore a
    // stale or malformed client-supplied peer_id so the Mini App cannot drift
    // from the conversation the bot is configured to read.
    if (allowlist.size === 1) {
      return allowlist.values().next().value;
    }

    // When several chats are allowed, prefer the server-side destination.
    // Only use a client-supplied peer_id when no server default exists.
    const requested = configuredDefault || String(value || '').trim();

    if (!requested) {
      throw new Error(
        'VK_DEFAULT_PEER_ID не настроен: разрешено несколько бесед, укажи целевую беседу в конфигурации сервера'
      );
    }

    if (!allowlist.has(requested)) {
      throw new Error('Целевая беседа отсутствует в VK_BOT_ALLOWED_PEER_IDS');
    }

    return requested;
  };
}

module.exports = { createPeerResolver };
