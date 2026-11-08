import { pageHeader } from '../components/chrome.js';
import { icon } from '../components/icons.js';

const entries = [
  { id: 'deadlines', title: 'Сроки годности', description: 'Состояние продуктов и сроки', glyph: 'clock', group: 'УЧЁТ' },
  { id: 'history', title: 'История', description: 'Операции и изменения по номерам', glyph: 'history', group: 'УЧЁТ' },
  { id: 'gih', title: 'GIH', description: 'Полная история и управление проверками', glyph: 'clipboard', group: 'РАБОЧИЕ ИНСТРУМЕНТЫ' },
  { id: 'excises', title: 'Акцизы', description: 'Учёт акцизных марок', glyph: 'tag', group: 'РАБОЧИЕ ИНСТРУМЕНТЫ' },
  { id: 'inventory', title: 'Инвентаризация', description: 'Учёт остатков', glyph: 'box', group: 'РАБОЧИЕ ИНСТРУМЕНТЫ' },
  { id: 'calculator', title: 'Калькулятор', description: 'Расчёт стоимости и состава', glyph: 'package', group: 'ИНСТРУМЕНТЫ' },
  { id: 'settings', title: 'Настройки', description: 'Продукты, шаблоны и параметры', glyph: 'settings', group: 'УПРАВЛЕНИЕ' }
];
const groups = ['УЧЁТ', 'РАБОЧИЕ ИНСТРУМЕНТЫ', 'ИНСТРУМЕНТЫ', 'УПРАВЛЕНИЕ'];

export function renderMore(state) {
  const selected = entries.find(item => item.id === state.moreItem);
  if (selected) return '<div class="screen screen-more"><button type="button" class="back-link" data-back-more>' +
    icon('back', 18) + ' Все разделы</button>' + pageHeader({ eyebrow: selected.group, title: selected.title, description: selected.description }) +
    '<section class="more-placeholder-card"><span class="more-placeholder-icon">' + icon(selected.glyph, 27) +
    '</span><strong>Раздел подготовлен к переносу</strong><p>Сюда постепенно перенесём существующие функции, сохранив текущие правила работы и данные.</p></section></div>';
  return '<div class="screen screen-more">' + pageHeader({ eyebrow: 'ДОПОЛНИТЕЛЬНЫЕ РАЗДЕЛЫ', title: 'Ещё',
    description: 'Учётные разделы и инструменты, которые нужны по мере работы.' }) +
    groups.map(group => '<section class="more-group"><div class="more-group-title">' + group + '</div><div class="more-list">' +
      entries.filter(item => item.group === group).map(item => '<button type="button" class="more-row" data-more-item="' + item.id + '">' +
      '<span class="more-row-icon">' + icon(item.glyph, 20) + '</span><span class="more-row-copy"><strong>' + item.title +
      '</strong><small>' + item.description + '</small></span>' + icon('chevron', 17, 'more-row-arrow') + '</button>').join('') +
      '</div></section>').join('') + '</div>';
}
