const BRIDGE_URL = 'https://cdn.jsdelivr.net/npm/@vkontakte/vk-bridge@3.0.2/+esm';
let bridgePromise;
export function getVkBridge() {
  if (!bridgePromise) bridgePromise = import(BRIDGE_URL).then(module => module.default).catch(error => {
    bridgePromise = null;
    console.warn('[MINIBAR VK] VK Bridge недоступен:', error);
    return null;
  });
  return bridgePromise;
}
export async function initializeVkApp() {
  const bridge = await getVkBridge();
  if (!bridge) return false;
  try { await bridge.send('VKWebAppInit'); return true; }
  catch (error) { console.warn('[MINIBAR VK] Не удалось инициализировать Mini App:', error); return false; }
}
