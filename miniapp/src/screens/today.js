import { pageHeader } from '../components/chrome.js';
import { icon } from '../components/icons.js';

const dateFormatter = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
const workAreas = [
  { id: 'arrivals', title: 'Заезды', description: 'Подготовка номеров к заезду', glyph: 'calendar' },
  { id: 'departures', title: 'Выезды', description: 'Обработка выезжающих номеров', glyph: 'lists' },
  { id: 'gih', title: 'GIH', description: 'Проверки и сохранённые записи', glyph: 'clipboard' }
];

export function renderToday() {
  return '<div class="screen screen-today">' +
    pageHeader({ eyebrow: dateFormatter.format(new Date()), title: 'Сегодня', description: 'Всё необходимое для работы с номерами — под рукой.' }) +
    '<section class="section-block"><div class="section-heading"><div><h2>Рабочие списки</h2><p>Быстрый переход к текущей работе</p></div></div>' +
    '<div class="work-area-grid">' + workAreas.map(item =>
      '<button type="button" class="work-area-card" data-open-screen="lists" data-list-type="' + item.id + '">' +
      '<span class="work-area-icon">' + icon(item.glyph, 21) + '</span><span class="work-area-copy"><strong>' + item.title +
      '</strong><small>' + item.description + '</small></span>' + icon('chevron', 18, 'work-area-arrow') + '</button>').join('') +
    '</div></section><section class="section-block quick-section"><div class="section-heading"><div><h2>Быстрый доступ</h2><p>Перейти к нужному инструменту</p></div></div>' +
    '<div class="quick-grid"><button type="button" class="quick-card quick-card-blue" data-open-screen="rooms"><span class="quick-card-icon">' +
    icon('rooms', 23) + '</span><strong>Номера</strong><small>Найти комнату</small></button><button type="button" class="quick-card quick-card-soft" data-open-screen="camera">' +
    '<span class="quick-card-icon">' + icon('camera', 23) + '</span><strong>Камера</strong><small>Съёмка по списку</small></button></div></section>' +
    '<section class="notice-card"><span class="notice-icon">' + icon('refresh', 19) + '</span><div><strong>Единое состояние номеров</strong>' +
    '<p>Изменения из рабочих бесед, сайта и Mini App будут отображаться согласованно.</p></div></section></div>';
}
