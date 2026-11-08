import { pageHeader } from '../components/chrome.js';
import { icon } from '../components/icons.js';

export function renderRooms() {
  return '<div class="screen screen-rooms">' + pageHeader({ eyebrow: 'КАТАЛОГ ОТЕЛЯ', title: 'Номера',
    description: 'Общий список комнат, поиск и краткая информация о каждом минибаре.' }) +
    '<section class="rooms-empty-card"><span class="rooms-empty-icon">' + icon('rooms', 28) + '</span><h2>Каталог номеров</h2>' +
    '<p>Здесь появится единый список номеров с поиском, состоянием минибара, сроками и активными пополнениями.</p></section>' +
    '<div class="rooms-feature-list"><div>' + icon('search', 19) + '<span><strong>Быстрый поиск</strong><small>По номеру комнаты и этажу</small></span></div><div>' +
    icon('package', 19) + '<span><strong>Состояние минибара</strong><small>Что нужно пополнить и в каком количестве</small></span></div><div>' +
    icon('camera', 19) + '<span><strong>Действия по номеру</strong><small>Переход к съёмке и рабочим операциям</small></span></div></div></div>';
}
