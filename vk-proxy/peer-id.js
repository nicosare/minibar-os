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

    const explicitPeerId = String(value || configuredDefault || '').trim();
    const onlyAllowedPeerId = allowlist.size === 1
      ? allowlist.values().next().value
      : '';
    const requested = explicitPeerId || onlyAllowedPeerId;

    if (!requested) {
      if (allowlist.size > 1) {
        throw new Error(
          'VK_DEFAULT_PEER_ID не настроен: разрешено несколько бесед, укажи целевую беседу в конфигурации сервера'
        );
      }

      throw new Error('VK peer_id не настроен');
    }

    if (!allowlist.has(requested)) {
      throw new Error('Целевая беседа отсутствует в VK_BOT_ALLOWED_PEER_IDS');
    }

    return requested;
  };
}

module.exports = { createPeerResolver };
