import { api } from '../core/api.js';
import { getState, setState } from '../core/store.js';
import { pageHeader } from '../components/chrome.js';
import { icon } from '../components/icons.js';

const TYPES = [
  { id: 'arrivals', label: 'Заезды' },
  { id: 'departures', label: 'Выезды' },
  { id: 'gih', label: 'GIH' },
  { id: 'empty', label: 'Пустые' }
];

const PREFERENCES_KEY = 'minibar-os-miniapp-list-preferences-v1';
const DEFAULT_UI = {
  showCompleted: false,
  sort: 'asc',
  settingsOpen: false,
  details: { roomStatus: true, products: true, roomMeta: false }
};
const requestSequence = { arrivals: 0, departures: 0 };

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
}

function readPreferences() {
  try {
    const stored = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || '{}');
    return {
      ...DEFAULT_UI,
      ...stored,
      settingsOpen: false,
      details: { ...DEFAULT_UI.details, ...(stored.details || {}) }
    };
  } catch (_) {
    return { ...DEFAULT_UI, details: { ...DEFAULT_UI.details } };
  }
}

function persistPreferences(ui) {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({
      showCompleted: ui.showCompleted,
      sort: ui.sort,
      details: ui.details
    }));
  } catch (_) {}
}

function updateUi(patch) {
  const current = getState().listUi || DEFAULT_UI;
  const next = {
    ...current,
    ...patch,
    details: { ...current.details, ...(patch.details || {}) }
  };
  persistPreferences(next);
  setState({ listUi: next });
}

function updateListData(type, data) {
  if (!data) return;
  setState(current => ({
    listData: { ...(current.listData || {}), [type]: data },
    listErrors: { ...(current.listErrors || {}), [type]: '' }
  }));
}

function updateBusy(type, key, value) {
  const busyKey = type + ':' + key;
  setState(current => ({
    listBusy: { ...(current.listBusy || {}), [busyKey]: value }
  }));
}

function setNotice(message, isError = false) {
  setState({ listNotice: message ? { message, isError } : null });
}

function isBusy(type, key) {
  return Boolean(getState().listBusy && getState().listBusy[type + ':' + key]);
}

export function initializeLists() {
  setState({ listUi: readPreferences() });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshVisibleList();
  });
  window.addEventListener('focus', refreshVisibleList);
}

function refreshVisibleList() {
  const state = getState();
  if (state.screen === 'lists' && (state.listType === 'arrivals' || state.listType === 'departures')) {
    void loadList(state.listType);
  }
}

export async function loadList(type) {
  if (type !== 'arrivals' && type !== 'departures') return;
  const sequence = ++requestSequence[type];
  setState(current => ({
    listLoading: { ...(current.listLoading || {}), [type]: true },
    listErrors: { ...(current.listErrors || {}), [type]: '' }
  }));

  try {
    const path = type === 'arrivals' ? 'arrivals/miniapp-list' : 'departures/miniapp-list';
    const data = await api.get(path);
    if (sequence !== requestSequence[type]) return;
    setState(current => ({
      listData: { ...(current.listData || {}), [type]: data },
      listLoading: { ...(current.listLoading || {}), [type]: false },
      listErrors: { ...(current.listErrors || {}), [type]: '' }
    }));
  } catch (error) {
    if (sequence !== requestSequence[type]) return;
    setState(current => ({
      listLoading: { ...(current.listLoading || {}), [type]: false },
      listErrors: { ...(current.listErrors || {}), [type]: error.message || 'Не удалось загрузить список' }
    }));
  }
}

function listNumbers(type, data, showCompleted) {
  if (!data) return { pending: [], completed: [], visible: [] };
  const completedSet = new Set((type === 'arrivals'
    ? data.checkedRoomNumbers
    : data.completedNumbers || []).map(value => String(value)));
  const source = (data.roomNumbers || []).map(value => String(value));
  const pending = type === 'arrivals'
    ? source.filter(number => !completedSet.has(number))
    : source;
  const completed = type === 'arrivals'
    ? source.filter(number => completedSet.has(number))
    : (data.completedNumbers || []).map(value => String(value));

  const visible = [...pending, ...(showCompleted ? completed : [])];
  const unique = [...new Set(visible)];
  return { pending, completed, visible: unique };
}

function renderRoomMeta(info, details) {
  if (!details.roomMeta) return '';
  const values = [];
  if (info.floor !== undefined && info.floor !== null) values.push('Этаж ' + info.floor);
  if (info.category) values.push(info.category);
  return values.length ? '<span class="list-room-meta">' + values.map(escapeHtml).join(' · ') + '</span>' : '';
}

function renderRoomStatuses(info, details) {
  const badges = [];
  if (details.roomStatus) {
    if (info.expiryStatus === 'empty') badges.push('<span class="list-status-chip is-empty">Пустой</span>');
    if (info.expiryStatus === 'needs_replacement') badges.push('<span class="list-status-chip is-refill">Требует пополнения</span>');
  }
  if (details.products) {
    const products = Array.isArray(info.productStatuses) ? info.productStatuses : [];
    products.filter(item => item && (item.expiryStatus === 'needs_replacement' || Number(item.qtyToReplace) > 0))
      .forEach(item => {
        const name = String(item.name || 'Продукт');
        const quantity = Number(item.qtyToReplace) > 0 ? ' ×' + Number(item.qtyToReplace) : '';
        badges.push('<span class="list-product-chip">' + escapeHtml(name + quantity) + '</span>');
      });
  }
  return badges.length ? '<div class="list-room-deadlines">' + badges.join('') + '</div>' : '';
}

function renderArrivalCard(number, info, entry, done, details, busy) {
  const disabled = busy || done ? ' disabled' : '';
  const flags = [];
  if (entry.vip) flags.push('<span class="list-room-chip is-vip">VIP</span>');
  if (entry.empty) flags.push('<span class="list-room-chip is-empty-action">Опустошить</span>');
  if (entry.time) flags.push('<span class="list-room-chip is-time">' + escapeHtml(entry.time) + '</span>');
  flags.push(entry.ready
    ? '<span class="list-room-chip is-ready">Можно делать</span>'
    : '<span class="list-room-chip is-not-ready">Пока нельзя</span>');
  if (done) flags.push('<span class="list-room-chip is-completed">Выполнен</span>');

  return '<article class="list-room-card' + (done ? ' is-completed' : '') + (busy ? ' is-saving' : '') + '">' +
    '<div class="list-room-card-top"><div class="list-room-identity"><strong>' + escapeHtml(number) + '</strong>' +
    renderRoomMeta(info, details) + '</div>' +
    '<button type="button" class="list-remove-button" data-list-action="remove" data-number="' + escapeHtml(number) +
    '" aria-label="Убрать номер ' + escapeHtml(number) + '"' + (busy ? ' disabled' : '') + '>' + icon('x', 17) + '</button></div>' +
    '<div class="list-room-chips">' + flags.join('') + '</div>' +
    renderRoomStatuses(info, details) +
    '<div class="list-arrival-controls">' +
      '<label class="list-switch"><input type="checkbox" data-list-field="vip" data-number="' + escapeHtml(number) + '"' +
        (entry.vip ? ' checked' : '') + disabled + '><span>VIP</span></label>' +
      '<label class="list-switch"><input type="checkbox" data-list-field="empty" data-number="' + escapeHtml(number) + '"' +
        (entry.empty ? ' checked' : '') + disabled + '><span>Опустошить</span></label>' +
      '<label class="list-switch"><input type="checkbox" data-list-field="ready" data-number="' + escapeHtml(number) + '"' +
        (entry.ready ? ' checked' : '') + disabled + '><span>Можно делать</span></label>' +
    '</div>' +
    '<div class="list-arrival-text-fields">' +
      '<label class="list-field"><span>Время</span><input type="time" data-list-field="time" data-number="' + escapeHtml(number) +
        '" value="' + escapeHtml(entry.time || '') + '"' + disabled + '></label>' +
      '<label class="list-field list-comment-field"><span>Комментарий</span><input type="text" maxlength="500" data-list-field="comment" data-number="' +
        escapeHtml(number) + '" value="' + escapeHtml(entry.comment || '') + '" placeholder="Добавить комментарий"' + disabled + '></label>' +
    '</div></article>';
}

function renderDepartureCard(number, info, onArrival, done, details, busy) {
  return '<article class="list-room-card' + (done ? ' is-completed' : '') + (busy ? ' is-saving' : '') + '">' +
    '<div class="list-room-card-top"><div class="list-room-identity"><strong>' + escapeHtml(number) + '</strong>' +
    renderRoomMeta(info, details) + '</div>' +
    '<button type="button" class="list-remove-button" data-list-action="remove" data-number="' + escapeHtml(number) +
    '" aria-label="Убрать номер ' + escapeHtml(number) + '"' + (busy ? ' disabled' : '') + '>' + icon('x', 17) + '</button></div>' +
    (onArrival ? '<div class="list-room-chips"><span class="list-room-chip is-arrival">На заезд</span></div>' : '') +
    renderRoomStatuses(info, details) +
    '<div class="list-departure-actions">' +
      '<button type="button" class="list-arrival-toggle' + (onArrival ? ' is-active' : '') +
        '" data-list-action="toggle-arrival" data-number="' + escapeHtml(number) + '" aria-pressed="' + String(onArrival) +
        '"' + (busy || done ? ' disabled' : '') + '>' + icon('arrow-right-circle', 16) +
        (onArrival ? 'Снять «На заезд»' : 'Отметить «На заезд»') + '</button>' +
      (done ? '<span class="list-done-label">' + icon('check-circle-2', 15) + ' Выполнен</span>' : '') +
    '</div></article>';
}

function renderSettings(ui) {
  if (!ui.settingsOpen) return '';
  return '<section class="list-settings-panel"><div class="list-settings-title">Отображение</div>' +
    '<label class="list-settings-option"><input type="checkbox" data-list-pref="roomStatus"' +
      (ui.details.roomStatus ? ' checked' : '') + '><span>Статус номера: пустой / пополнение</span></label>' +
    '<label class="list-settings-option"><input type="checkbox" data-list-pref="products"' +
      (ui.details.products ? ' checked' : '') + '><span>Сроки и продукты к пополнению</span></label>' +
    '<label class="list-settings-option"><input type="checkbox" data-list-pref="roomMeta"' +
      (ui.details.roomMeta ? ' checked' : '') + '><span>Этаж и категория</span></label>' +
    '</section>';
}

function renderListBody(state, type) {
  if (type !== 'arrivals' && type !== 'departures') {
    const title = type === 'gih' ? 'GIH' : 'Пустые';
    return '<section class="list-placeholder"><span class="list-placeholder-icon">' + icon(type === 'gih' ? 'clipboard-check' : 'door-open', 24) +
      '</span><strong>' + title + '</strong><span>Этот список подключим отдельным этапом.</span></section>';
  }

  const data = state.listData && state.listData[type];
  const loading = Boolean(state.listLoading && state.listLoading[type]);
  const error = state.listErrors && state.listErrors[type];
  if (!data && loading) {
    return '<div class="list-loading"><span class="list-loading-spinner"></span> Загружаем список</div>';
  }
  if (!data && error) {
    return '<div class="list-error"><span>' + escapeHtml(error) + '</span><button type="button" data-list-action="retry">Повторить</button></div>';
  }
  if (!data) return '<div class="list-loading"><span class="list-loading-spinner"></span> Загружаем список</div>';

  const ui = state.listUi || DEFAULT_UI;
  const numbers = listNumbers(type, data, ui.showCompleted);
  const details = ui.details || DEFAULT_UI.details;
  const completeCount = numbers.completed.length;
  const cards = numbers.visible.slice().sort((a, b) =>
    ui.sort === 'desc' ? Number(b) - Number(a) : Number(a) - Number(b)
  ).map(number => {
    const info = data.roomInfo && data.roomInfo[number] || {};
    const doneSet = new Set((type === 'arrivals' ? data.checkedRoomNumbers : data.completedNumbers || []).map(value => String(value)));
    const done = doneSet.has(number);
    const busy = isBusy(type, number);
    if (type === 'arrivals') {
      const entry = data.entries && data.entries[number] || {};
      return renderArrivalCard(number, info, entry, done, details, busy);
    }
    const onArrival = (data.arrivalRooms || []).map(String).includes(number);
    return renderDepartureCard(number, info, onArrival, done, details, busy);
  }).join('');

  let notice = '';
  if (state.listNotice && state.listNotice.message) {
    notice = '<div class="list-notice' + (state.listNotice.isError ? ' is-error' : '') + '">' +
      escapeHtml(state.listNotice.message) + '</div>';
  }
  const emptyText = numbers.pending.length === 0 && completeCount > 0
    ? 'Все номера выполнены'
    : 'Список пока пуст';

  return '<section class="list-tools">' +
    '<div class="list-summary"><div><strong>' + numbers.pending.length + '</strong><span>осталось</span>' +
      '<i></i><strong>' + completeCount + '</strong><span>выполнено</span></div>' +
      '<button type="button" class="list-settings-button' + (ui.settingsOpen ? ' is-active' : '') +
        '" data-list-action="settings">' + icon('sliders-horizontal', 17) + ' Настроить</button></div>' +
    '<div class="list-control-row">' +
      (completeCount ? '<button type="button" class="list-completed-toggle" data-list-action="toggle-completed">' +
        (ui.showCompleted ? 'Скрыть выполненные' : 'Показать выполненные · ' + completeCount) + '</button>' : '<span></span>') +
      '<label class="list-sort-control"><span>Сортировка</span><select data-list-sort aria-label="Сортировка номеров">' +
        '<option value="asc"' + (ui.sort === 'asc' ? ' selected' : '') + '>№ по возрастанию</option>' +
        '<option value="desc"' + (ui.sort === 'desc' ? ' selected' : '') + '>№ по убыванию</option>' +
        '<option value="smart" disabled>Умная · позже</option>' +
      '</select></label></div>' +
    renderSettings(ui) +
    '<div class="list-add-row"><input id="listRoomNumber" type="text" inputmode="numeric" pattern="[0-9]{1,4}" maxlength="4" placeholder="Номер комнаты" aria-label="Номер комнаты">' +
      '<button type="button" data-list-action="add"' + (isBusy(type, 'add') ? ' disabled' : '') + '>' +
        icon('plus', 17) + ' Добавить</button></div>' +
    notice + '</section>' +
    (loading ? '<div class="list-refreshing">Обновляем список…</div>' : '') +
    (numbers.visible.length
      ? '<div class="list-room-stack">' + cards + '</div>'
      : '<section class="list-placeholder"><span class="list-placeholder-icon">' + icon('clipboard-check', 24) +
        '</span><strong>' + emptyText + '</strong></section>');
}

export function renderLists(state) {
  const active = TYPES.find(item => item.id === state.listType) || TYPES[0];
  return '<div class="screen screen-lists">' + pageHeader({ title: 'Списки' }) +
    '<div class="segmented-tabs" role="tablist" aria-label="Тип списка">' +
    TYPES.map(item => '<button type="button" role="tab" data-list-type="' + item.id + '" aria-selected="' + (item.id === active.id) +
      '" class="segment-tab' + (item.id === active.id ? ' is-selected' : '') + '">' + item.label + '</button>').join('') +
    '</div>' + renderListBody(state, active.id) + '</div>';
}

async function addRoom() {
  const state = getState();
  const type = state.listType;
  if (type !== 'arrivals' && type !== 'departures') return;
  const input = document.getElementById('listRoomNumber');
  const number = String(input && input.value || '').trim();
  if (!/^\d{1,4}$/.test(number)) {
    setNotice('Введите номер комнаты от 1 до 4 цифр.', true);
    return;
  }
  if (isBusy(type, 'add')) return;

  updateBusy(type, 'add', true);
  setNotice('');
  try {
    if (type === 'arrivals') {
      await api.post('arrivals/session/rooms', { numbers: [number] });
      await loadList(type);
    } else {
      const result = await api.patch('departures/miniapp-list/room', { number, action: 'add' });
      updateListData(type, result.list);
    }
    setNotice('Номер ' + number + ' добавлен.');
  } catch (error) {
    setNotice(error.message || 'Не удалось добавить номер.', true);
  } finally {
    updateBusy(type, 'add', false);
  }
}

async function removeRoom(number) {
  const type = getState().listType;
  if (type !== 'arrivals' && type !== 'departures') return;
  if (isBusy(type, number)) return;
  updateBusy(type, number, true);
  setNotice('');
  try {
    if (type === 'arrivals') {
      await api.delete('arrivals/session/room', { body: { number } });
      await loadList(type);
    } else {
      const result = await api.patch('departures/miniapp-list/room', { number, action: 'remove' });
      updateListData(type, result.list);
    }
    setNotice('Номер ' + number + ' убран из списка.');
  } catch (error) {
    setNotice(error.message || 'Не удалось убрать номер.', true);
  } finally {
    updateBusy(type, number, false);
  }
}

async function toggleArrival(number) {
  const type = 'departures';
  if (isBusy(type, number)) return;
  const data = getState().listData && getState().listData[type];
  const enabled = !((data && data.arrivalRooms || []).map(String).includes(number));
  updateBusy(type, number, true);
  setNotice('');
  try {
    const result = await api.patch('departures/miniapp-list/room', { number, action: 'arrival', enabled });
    updateListData(type, result.list);
  } catch (error) {
    setNotice(error.message || 'Не удалось изменить отметку «На заезд».', true);
  } finally {
    updateBusy(type, number, false);
  }
}

async function updateArrivalField(number, field, value) {
  if (isBusy('arrivals', number)) return;
  updateBusy('arrivals', number, true);
  setNotice('');
  try {
    const result = await api.patch('arrivals/miniapp-list/room', { number, field, value });
    updateListData('arrivals', result.list);
  } catch (error) {
    setNotice(error.message || 'Не удалось сохранить отметку номера.', true);
    void loadList('arrivals');
  } finally {
    updateBusy('arrivals', number, false);
  }
}

export function handleListClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return false;

  const tab = target.closest('[data-list-type]');
  if (tab) {
    event.preventDefault();
    const type = tab.dataset.listType;
    setNotice('');
    setState({ listType: type });
    void loadList(type);
    return true;
  }

  const control = target.closest('[data-list-action]');
  if (!control) return false;
  event.preventDefault();
  const action = control.dataset.listAction;
  const number = String(control.dataset.number || '');
  if (action === 'add') void addRoom();
  else if (action === 'remove' && number) void removeRoom(number);
  else if (action === 'toggle-arrival' && number) void toggleArrival(number);
  else if (action === 'toggle-completed') updateUi({ showCompleted: !(getState().listUi || DEFAULT_UI).showCompleted });
  else if (action === 'settings') updateUi({ settingsOpen: !(getState().listUi || DEFAULT_UI).settingsOpen });
  else if (action === 'retry') void loadList(getState().listType);
  return true;
}

export function handleListChange(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return false;

  const field = target.closest('[data-list-field]');
  if (field) {
    const number = String(field.dataset.number || '');
    const name = String(field.dataset.listField || '');
    if (number && name) {
      const value = field.type === 'checkbox' ? field.checked : String(field.value || '');
      void updateArrivalField(number, name, value);
    }
    return true;
  }

  const sort = target.closest('[data-list-sort]');
  if (sort) {
    const value = sort.value === 'desc' ? 'desc' : 'asc';
    updateUi({ sort: value });
    return true;
  }

  const preference = target.closest('[data-list-pref]');
  if (preference) {
    const key = preference.dataset.listPref;
    if (key === 'roomStatus' || key === 'products' || key === 'roomMeta') {
      const ui = getState().listUi || DEFAULT_UI;
      updateUi({ details: { ...ui.details, [key]: preference.checked } });
    }
    return true;
  }

  return false;
}
