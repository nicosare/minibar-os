import { pageHeader } from '../components/chrome.js';
import { icon } from '../components/icons.js';

const types = [
  { id: 'arrivals', label: 'Заезды', description: 'Номера, время заезда, готовность и примечания.' },
  { id: 'departures', label: 'Выезды', description: 'Состав списка, отметки из беседы и номера на заезд.' },
  { id: 'gih', label: 'GIH', description: 'Черновики и сохранённые проверки номеров.' },
  { id: 'empty', label: 'Пустые', description: 'Номера, отмеченные как опустошённые.' }
];

export function renderLists(state) {
  const active = types.find(item => item.id === state.listType) || types[0];
  return '<div class="screen screen-lists">' + pageHeader({ eyebrow: 'ОСНОВНАЯ РАБОЧАЯ ОБЛАСТЬ', title: 'Списки',
    description: 'Номера и их состояние в каждом рабочем процессе.' }) +
    '<div class="segmented-tabs" role="tablist" aria-label="Тип рабочего списка">' +
    types.map(item => '<button type="button" role="tab" data-list-type="' + item.id + '" aria-selected="' + (item.id === active.id) +
      '" class="segment-tab' + (item.id === active.id ? ' is-selected' : '') + '">' + item.label + '</button>').join('') +
    '</div><section class="list-workspace-card"><div class="list-workspace-top"><div><span class="card-kicker">ТЕКУЩИЙ СПИСОК</span><h2>' +
    active.label + '</h2></div><span class="soft-status">Подключим данные</span></div><p class="list-workspace-description">' +
    active.description + '</p><div class="list-empty-state"><span class="list-empty-icon">' + icon('lists', 27) +
    '</span><strong>Список пока не подключён</strong><p>На следующем этапе перенесём сюда актуальные номера, краткую информацию, отметки из беседы и потребности в пополнении.</p></div>' +
    '</section><div class="list-principle"><strong>Каждый список сохраняет собственную логику.</strong><span>Общие изменения номера будут синхронизироваться между списками, но состав и правила каждого списка останутся независимыми.</span></div></div>';
}
