import { pageHeader } from '../components/chrome.js';
import { icon } from '../components/icons.js';

export function renderCamera() {
  return '<div class="screen screen-camera">' + pageHeader({ eyebrow: 'ПОСЛЕДОВАТЕЛЬНАЯ СЪЁМКА', title: 'Камера',
    description: 'Сфотографировать номер, проверить снимок и только потом отправить.' }) +
    '<section class="camera-stage-card"><div class="camera-stage-top"><span class="card-kicker">ПРЕДПРОСМОТР</span><span class="soft-status">Камера подключается на следующем этапе</span></div>' +
    '<div class="camera-viewfinder-placeholder"><span class="viewfinder-corner corner-tl"></span><span class="viewfinder-corner corner-tr"></span><span class="viewfinder-corner corner-bl"></span><span class="viewfinder-corner corner-br"></span>' +
    '<span class="viewfinder-symbol">' + icon('camera', 34) + '</span><span class="viewfinder-caption">Область камеры</span></div>' +
    '<div class="camera-flow"><div class="camera-flow-step"><span>1</span><div><strong>Сделать фото</strong><small>Снимок выбранного номера</small></div></div>' +
    '<div class="camera-flow-step"><span>2</span><div><strong>Проверить снимок</strong><small>Можно переснять, если фото неудачное</small></div></div>' +
    '<div class="camera-flow-step"><span>3</span><div><strong>Подтвердить отправку</strong><small>После подтверждения — переход к следующему номеру</small></div></div></div>' +
    '</section><p class="camera-safety-note">' + icon('check', 17) + '<span>Снимок никогда не отправляется автоматически: отправка только после явного подтверждения.</span></p></div>';
}
