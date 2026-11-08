import { pageHeader } from '../components/chrome.js';
import { icon } from '../components/icons.js';

export function renderRooms() {
  return '<div class="screen screen-rooms">' + pageHeader({ title: 'Номера' }) +
    '<section class="rooms-empty-card"><span class="rooms-empty-icon">' + icon('rooms', 28) +
    '</span><h2>Список номеров</h2></section></div>';
}
