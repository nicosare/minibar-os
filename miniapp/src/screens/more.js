import { pageHeader } from '../components/chrome.js';
import { icon } from '../components/icons.js';

const entries = [
  { id: 'deadlines', title: 'Сроки годности', glyph: 'calendar', group: 'УЧЁТ' },
  { id: 'history', title: 'История', glyph: 'history', group: 'УЧЁТ' },
  { id: 'gih', title: 'GIH', glyph: 'clipboard-check', group: 'РАБОЧИЕ ИНСТРУМЕНТЫ' },
  { id: 'excises', title: 'Акцизы', glyph: 'stamp', group: 'РАБОЧИЕ ИНСТРУМЕНТЫ' },
  { id: 'inventory', title: 'Инвентаризация', glyph: 'clipboard-list', group: 'РАБОЧИЕ ИНСТРУМЕНТЫ' },
  { id: 'calculator', title: 'Калькулятор', glyph: 'calculator', group: 'ИНСТРУМЕНТЫ' },
  { id: 'settings', title: 'Настройки', glyph: 'settings', group: 'УПРАВЛЕНИЕ' }
];
const groups = ['УЧЁТ', 'РАБОЧИЕ ИНСТРУМЕНТЫ', 'ИНСТРУМЕНТЫ', 'УПРАВЛЕНИЕ'];

export function renderMore(state) {
  const selected = entries.find(item => item.id === state.moreItem);
  if (selected) return '<div class="screen screen-more"><button type="button" class="back-link" data-back-more>' +
    icon('chevron-left', 18) + ' Назад</button>' + pageHeader({ title: selected.title }) +
    '<section class="more-placeholder-card"><span class="more-placeholder-icon">' + icon(selected.glyph, 27) +
    '</span><strong>Пока пусто</strong></section></div>';
  return '<div class="screen screen-more">' + pageHeader({ title: 'Ещё' }) +
    groups.map(group => '<section class="more-group"><div class="more-group-title">' + group + '</div><div class="more-list">' +
      entries.filter(item => item.group === group).map(item => '<button type="button" class="more-row" data-more-item="' + item.id + '">' +
      '<span class="more-row-icon">' + icon(item.glyph, 20) + '</span><span class="more-row-copy"><strong>' + item.title +
      '</strong></span>' + icon('chevron-right', 17, 'more-row-arrow') + '</button>').join('') +
      '</div></section>').join('') + '</div>';
}
