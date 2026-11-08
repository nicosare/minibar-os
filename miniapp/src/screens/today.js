import { pageHeader } from '../components/chrome.js';
import { icon } from '../components/icons.js';

const workAreas = [
  { id: 'arrivals', title: 'Заезды', glyph: 'plane-landing' },
  { id: 'departures', title: 'Выезды', glyph: 'plane-takeoff' },
  { id: 'gih', title: 'GIH', glyph: 'clipboard-check' }
];

export function renderToday() {
  return '<div class="screen screen-today">' +
    pageHeader({ title: 'Сегодня' }) +
    '<section class="section-block"><div class="section-heading"><div><h2>Списки</h2></div></div>' +
    '<div class="work-area-grid">' + workAreas.map(item =>
      '<button type="button" class="work-area-card" data-open-screen="lists" data-list-type="' + item.id + '">' +
      '<span class="work-area-icon">' + icon(item.glyph, 21) + '</span><span class="work-area-copy"><strong>' +
      item.title + '</strong></span>' + icon('chevron-right', 18, 'work-area-arrow') + '</button>').join('') +
    '</div></section><section class="quick-section"><div class="section-heading"><div><h2>Быстрый доступ</h2></div></div>' +
    '<div class="quick-grid"><button type="button" class="quick-card quick-card-blue" data-open-screen="rooms"><span class="quick-card-icon">' +
    icon('door-open', 21) + '</span><strong>Номера</strong></button><button type="button" class="quick-card quick-card-soft" data-open-screen="camera">' +
    '<span class="quick-card-icon">' + icon('camera', 23) + '</span><strong>Камера</strong></button></div></section></div>';
}
