import { pageHeader } from '../components/chrome.js';
import { icon } from '../components/icons.js';

const types = [
  { id: 'arrivals', label: 'Заезды' },
  { id: 'departures', label: 'Выезды' },
  { id: 'gih', label: 'GIH' },
  { id: 'empty', label: 'Пустые' }
];

export function renderLists(state) {
  const active = types.find(item => item.id === state.listType) || types[0];
  return '<div class="screen screen-lists">' + pageHeader({ title: 'Списки' }) +
    '<div class="segmented-tabs" role="tablist" aria-label="Тип списка">' +
    types.map(item => '<button type="button" role="tab" data-list-type="' + item.id + '" aria-selected="' + (item.id === active.id) +
      '" class="segment-tab' + (item.id === active.id ? ' is-selected' : '') + '">' + item.label + '</button>').join('') +
    '</div><section class="list-workspace-card"><div class="list-empty-state"><span class="list-empty-icon">' + icon('lists', 27) +
    '</span><strong>Пока нет номеров</strong></div></section></div>';
}
