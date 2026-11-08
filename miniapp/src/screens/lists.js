import { api } from '../core/api.js';
import { getState, setState } from '../core/store.js';
import { pageHeader } from '../components/chrome.js';
import { icon } from '../components/icons.js';
import { initializeCamera } from './camera.js';

const TYPES = [
  { id: 'arrivals', label: 'Заезды' },
  { id: 'departures', label: 'Выезды' },
  { id: 'gih', label: 'GIH' },
  { id: 'empty', label: 'Пустые' }
];

const PREFERENCES_KEY = 'minibar-os-miniapp-list-preferences-v2';
const DEFAULT_UI = {
  showCompleted: false,
  sort: 'asc',
  format: 'standard',
  settingsOpen: false,
  details: { deadlines: true, refill: true, roomMeta: false }
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
    const oldDetails = stored.details || {};
    return {
      ...DEFAULT_UI,
      ...stored,
      format: stored.format === 'compact' ? 'compact' : 'standard',
      settingsOpen: false,
      details: {
        deadlines: oldDetails.deadlines ?? oldDetails.roomStatus ?? true,
        refill: oldDetails.refill ?? true,
        roomMeta: oldDetails.roomMeta ?? false
      }
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
      format: ui.format,
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
    const [listResult, refillResult] = await Promise.allSettled([
      api.get(path),
      api.get('refills/active')
    ]);
    if (sequence !== requestSequence[type]) return;
    if (listResult.status === 'rejected') throw listResult.reason;

    const refills = refillResult.status === 'fulfilled' && Array.isArray(refillResult.value?.requests)
      ? refillResult.value.requests.filter(request => request && request.status === 'pending')
      : [];
    setState(current => ({
      listData: { ...(current.listData || {}), [type]: listResult.value },
      listRefills: refills,
      listRefillError: refillResult.status === 'rejected'
        ? (refillResult.reason?.message || 'Не удалось загрузить данные пополнения')
        : '',
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
    ? (data.checkedRoomNumbers || [])
    : (data.completedNumbers || [])).map(value => String(value)));
  const source = (data.roomNumbers || []).map(value => String(value));
  const pending = source.filter(number => !completedSet.has(number));
  const completed = type === 'arrivals'
    ? source.filter(number => completedSet.has(number))
    : (data.completedNumbers || []).map(value => String(value));
  return {
    pending,
    completed,
    visible: [...new Set([...pending, ...(showCompleted ? completed : [])])]
  };
}

function roomMeta(info, details) {
  if (!details.roomMeta) return '';
  const values = [];
  if (info.floor !== undefined && info.floor !== null) values.push('Этаж ' + info.floor);
  if (info.category) values.push(info.category === 'lux' ? 'Люкс' : info.category === 'standard' ? 'Стандарт' : info.category);
  return values.length ? '<span class="list-room-meta">' + values.map(escapeHtml).join(' · ') + '</span>' : '';
}

function deadlineText(info) {
  const products = Array.isArray(info.productStatuses) ? info.productStatuses : [];
  const needed = products.filter(item => item &&
    (item.expiryStatus === 'needs_replacement' || Number(item.qtyToReplace) > 0));
  if (info.expiryStatus === 'empty') return 'Пустой';
  if (needed.length) {
    return needed.map(item => {
      const quantity = Number(item.qtyToReplace) > 0 ? ' ×' + Number(item.qtyToReplace) : '';
      return String(item.name || 'Продукт') + quantity;
    }).join(', ');
  }
  if (info.expiryStatus === 'needs_replacement') return 'Требует замены';
  return '';
}

function refillForRoom(state, roomId) {
  return (state.listRefills || []).find(request => Number(request.roomId) === Number(roomId)) || null;
}

function refillText(request) {
  if (!request || !Array.isArray(request.items) || !request.items.length) return '';
  return request.items.map(item => {
    const qty = Number(item.qty) > 0 ? ' ×' + Number(item.qty) : '';
    return String(item.name || 'Продукт') + qty;
  }).join(', ');
}

function standardChip(text, tone) {
  return '<span class="list-room-chip ' + tone + '">' + escapeHtml(text) + '</span>';
}

function marker(label, tone) {
  const glyph = tone === 'is-vip' ? 'crown' : tone === 'is-empty' ? 'package-x' : tone === 'is-ready' ? 'check-circle-2' : tone === 'is-muted' ? 'circle-minus' : tone === 'is-deadline' ? 'timer' : tone === 'is-refill' ? 'package-plus' : tone === 'is-arrival' ? 'plane-landing' : 'message-square';
  return '<span class="list-marker-icon ' + tone + '" title="' + escapeHtml(label) + '" aria-label="' + escapeHtml(label) + '">' + icon(glyph,14) + '</span>';
}

function renderArrivalMarkers(entry, done, info, state, details) {
  const marks = [];
  if (entry.vip) marks.push(marker('VIP', 'is-vip'));
  if (entry.empty) marks.push('<span class="list-marker-word is-empty">Опустошить</span>');
  if (entry.ready) marks.push(marker('Можно делать', 'is-ready'));
  else marks.push(marker('Пока нельзя', 'is-muted'));
  const deadlines = details.deadlines ? deadlineText(info) : '';
  if (deadlines) marks.push(marker('Сроки: ' + deadlines, 'is-deadline'));
  const refill = details.refill ? refillText(refillForRoom(state, info.id)) : '';
  if (refill) marks.push(marker('Требует пополнения: ' + refill, 'is-refill'));
  if (info.expiryStatus === 'empty') marks.push(marker('Пустой', 'is-empty'));\n  if (done) marks.push(marker('Выполнен', 'is-muted'));
  return marks.join('');
}

function renderDepartureMarkers(onArrival, done, info, state, details) {
  const marks = [];
  if (onArrival) marks.push(marker('На заезд', 'is-arrival'));
  const deadlines = details.deadlines ? deadlineText(info) : '';
  if (deadlines) marks.push(marker('Сроки: ' + deadlines, 'is-deadline'));
  const refill = details.refill ? refillText(refillForRoom(state, info.id)) : '';
  if (refill) marks.push(marker('Требует пополнения: ' + refill, 'is-refill'));
  if (done) marks.push(marker('Выполнен', 'is-muted'));
  return marks.join('');
}

function renderArrivalLabels(entry, done, info, state, details) {
  const marks = [];
  if (entry.vip) marks.push(standardChip('VIP', 'is-vip'));
  if (entry.empty) marks.push(standardChip('Опустошить', 'is-empty-action'));
  if (entry.time) marks.push(standardChip(entry.time, 'is-time'));
  if (entry.comment) marks.push(standardChip('Комментарий', 'is-comment'));
  marks.push(entry.ready
    ? standardChip('Можно делать', 'is-ready')
    : standardChip('Пока нельзя', 'is-not-ready'));
  if (done) marks.push(standardChip('Выполнен', 'is-completed'));
  const deadlines = details.deadlines ? deadlineText(info) : '';
  if (deadlines) marks.push(standardChip('Сроки: ' + deadlines, 'is-deadline'));
  const refill = details.refill ? refillText(refillForRoom(state, info.id)) : '';
  if (refill) marks.push(standardChip('Требует пополнения: ' + refill, 'is-refill'));
  return marks.join('');
}

function renderDepartureLabels(onArrival, done, info, state, details) {
  const marks = [];
  if (onArrival) marks.push(standardChip('На заезд', 'is-arrival'));
  if (done) marks.push(standardChip('Выполнен', 'is-completed'));
  const deadlines = details.deadlines ? deadlineText(info) : '';
  if (deadlines) marks.push(standardChip('Сроки: ' + deadlines, 'is-deadline'));
  const refill = details.refill ? refillText(refillForRoom(state, info.id)) : '';
  if (refill) marks.push(standardChip('Требует пополнения: ' + refill, 'is-refill'));
  return marks.join('');
}

function renderDeadlineDetails(info, details) {
  if (!details.deadlines) return '';
  const description = deadlineText(info);
  return description
    ? '<div class="list-detail-line"><strong>Сроки:</strong> <span>' + escapeHtml(description) + '</span></div>'
    : '';
}

function renderRefillDetails(state, info) {
  const request = refillForRoom(state, info.id);
  const templateItems = Array.isArray(info.templateItems) && info.templateItems.length
    ? info.templateItems
    : (Array.isArray(request?.templateItems) ? request.templateItems : []);
  const busy = isBusy('refill', String(info.id));
  if (busy) return '<div class="list-detail-line"><span class="list-inline-spinner"></span>Сохраняем пополнение…</div>';
  const selected = new Map((request?.items || []).map(item => [Number(item.productId), Number(item.qty) || 0]));
  const items = templateItems.map(item => {
    const id = Number(item.productId);
    const maxQty = Math.max(1, Number(item.qty) || 1);
    const value = Math.max(0, Math.min(maxQty, selected.get(id) || 0));
    const meta = [item.volume != null ? item.volume : '', item.unit || 'шт'].filter(Boolean).join(' ');
    return '<label class="list-refill-product"><span class="list-refill-product-copy">' +
      '<strong>' + escapeHtml(item.emoji ? item.emoji + ' ' + item.name : item.name) + '</strong>' +
      '<small>' + escapeHtml(meta + ' · максимум ' + maxQty) + '</small></span>' +
      '<input type="number" inputmode="numeric" min="0" max="' + maxQty + '" step="1" value="' + value +
      '" data-refill-qty data-product-id="' + id + '" aria-label="' + escapeHtml(item.name + ', количество к пополнению') + '"></label>';
  }).join('');
  const summary = refillText(request);
  return '<section class="list-refill-editor"><div class="list-editor-heading"><strong>Пополнение</strong>' +
    (summary ? '<span class="list-refill-current">Сейчас: ' + escapeHtml(summary) + '</span>' : '') + '</div>' +
    (items
      ? '<div class="list-refill-products">' + items + '</div>' 
      : '<div class="list-editor-empty">Для номера не задан шаблон продуктов.</div>') +
    (items ? '<button type="button" class="list-primary-action" data-list-action="save-refill"' +
      (isBusy('refill', String(info.id)) ? ' disabled' : '') +
      '>' + icon('save', 15) + ' Сохранить пополнение</button>' : '') +
    '<small class="list-editor-hint">Укажи количество отсутствующих продуктов. Ноль — не требуется.</small></section>';
}

function renderArrivalDetails(number, info, entry, done, state, busy, details) {
  const disabled = busy || done ? ' disabled' : '';
  return '<div class="list-room-expanded">' +
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
    '</div>' +
    renderDeadlineDetails(info, details) +
    '' +
    '<div class="list-card-footer"><span class="list-saving-label">' + (busy ? 'Сохраняем…' : '') + '</span>' +
      '<button type="button" class="list-danger-action" data-list-action="remove" data-number="' + escapeHtml(number) +
      '"' + (busy ? ' disabled' : '') + '>' + icon('x', 15) + ' Убрать номер</button></div></div>';
}

function renderDepartureDetails(number, info, onArrival, done, state, busy, details) {
  return '<div class="list-room-expanded">' +
    '<div class="list-departure-actions">' +
      '<button type="button" class="list-arrival-toggle' + (onArrival ? ' is-active' : '') +
        '" data-list-action="toggle-arrival" data-number="' + escapeHtml(number) + '" aria-pressed="' + String(onArrival) +
        '"' + (busy || done ? ' disabled' : '') + '>' + icon('arrow-right-circle', 16) +
        (onArrival ? 'Снять «На заезд»' : 'Отметить «На заезд»') + '</button>' +
      (done ? '<span class="list-done-label">' + icon('check-circle-2', 15) + ' Выполнен</span>' : '') +
    '</div>' +
    renderDeadlineDetails(info, details) +
    renderRefillDetails(state, info) +
    '<div class="list-card-footer"><span class="list-saving-label">' + (busy ? 'Сохраняем…' : '') + '</span>' +
      '<button type="button" class="list-danger-action" data-list-action="remove" data-number="' + escapeHtml(number) +
      '"' + (busy ? ' disabled' : '') + '>' + icon('x', 15) + ' Убрать номер</button></div></div>';
}

function renderArrivalCard(number, info, entry, done, state, busy, ui) {
  const compact = ui.format === 'compact';
  const empty = info.expiryStatus === 'empty';
  const roomNumber = '<span class="list-room-number list-room-open" data-open-camera="' + escapeHtml(number) + '">' + escapeHtml(number) + '</span>' + (empty ? '<span class="list-empty-badge">Пустой</span>' : '');
  const summary = compact
    ? roomNumber +
      (info.expiryStatus === 'empty' ? '<span class="list-empty-tag">Пустой</span>' : '') +
      (entry.time ? '<span class="list-summary-time">' + icon('clock',13) + ' ' + escapeHtml(entry.time) + '</span>' : '') +
      (entry.comment ? '<span class="list-summary-comment">' + icon('message-square',13) + ' ' + escapeHtml(entry.comment) + '</span>' : '') +
      '<span class="list-summary-dots">' + renderArrivalMarkers(entry, done, info, state, ui.details) + '</span>'
    : '<div class="list-standard-summary">' +
      '<div class="list-room-identity">' + roomNumber +
        roomMeta(info, ui.details) + '</div>' +
      '<div class="list-room-chips">' + renderArrivalLabels(entry, done, info, state, ui.details) + '</div></div>';
  return '<details class="list-room-card' + (compact ? ' is-compact' : ' is-standard') +
    (done ? ' is-completed' : '') + (busy ? ' is-saving' : '') + '" data-room-number="' + escapeHtml(number) + '">' +
    '<summary class="list-room-summary">' + summary + '<span class="list-expand-icon">' + icon('chevron-down', 17) + '</span></summary>' +
    renderArrivalDetails(number, info, entry, done, state, busy, ui.details) + '</details>';
}

function renderDepartureCard(number, info, onArrival, done, state, busy, ui) {
  const compact = ui.format === 'compact';
  const summary = compact
    ? '<strong class="list-room-number">' + escapeHtml(number) + '</strong>' +
      '<span class="list-summary-dots">' + renderDepartureMarkers(onArrival, done, info, state, ui.details) + '</span>'
    : '<div class="list-standard-summary">' +
      '<div class="list-room-identity"><button type="button" class="list-room-number" data-open-camera-room="' + escapeHtml(number) + '">' + escapeHtml(number) + '</button>' +
        roomMeta(info, ui.details) + '</div>' +
      '<div class="list-room-chips">' + renderDepartureLabels(onArrival, done, info, state, ui.details) + '</div></div>';
  return '<details class="list-room-card' + (compact ? ' is-compact' : ' is-standard') +
    (done ? ' is-completed' : '') + (busy ? ' is-saving' : '') + '" data-room-number="' + escapeHtml(number) + '">' +
    '<summary class="list-room-summary">' + summary + '<span class="list-expand-icon">' + icon('chevron-down', 17) + '</span></summary>' +
    renderDepartureDetails(number, info, onArrival, done, state, busy, ui.details) + '</details>';
}

function renderSettings(ui) {
  if (!ui.settingsOpen) return '';
  return '<section class="list-settings-panel"><div class="list-settings-title">Отображение</div>' +
    '<label class="list-settings-row"><span>Формат карточек</span><select data-list-format aria-label="Формат карточек">' +
      '<option value="standard"' + (ui.format === 'standard' ? ' selected' : '') + '>Стандартный</option>' +
      '<option value="compact"' + (ui.format === 'compact' ? ' selected' : '') + '>Упрощённый</option>' +
    '</select></label>' +
    '<label class="list-settings-option"><input type="checkbox" data-list-pref="deadlines"' +
      (ui.details.deadlines ? ' checked' : '') + '><span>Показывать сведения «Сроки»</span></label>' +
    '<label class="list-settings-option"><input type="checkbox" data-list-pref="refill"' +
      (ui.details.refill ? ' checked' : '') + '><span>Показывать пополнение</span></label>' +
    '<label class="list-settings-option"><input type="checkbox" data-list-pref="roomMeta"' +
      (ui.details.roomMeta ? ' checked' : '') + '><span>Показывать этаж и категорию</span></label>' +
    '</section>';
}

function renderListBody(state, type) {
  if (type !== 'arrivals' && type !== 'departures') {
    const title = type === 'gih' ? 'GIH' : 'Пустые';
    return '<section class="list-placeholder"><span class="list-placeholder-icon">' +
      icon(type === 'gih' ? 'clipboard-check' : 'door-open', 24) +
      '</span><strong>' + title + '</strong><span>Этот список подключим отдельным этапом.</span></section>';
  }

  const data = state.listData && state.listData[type];
  const loading = Boolean(state.listLoading && state.listLoading[type]);
  const error = state.listErrors && state.listErrors[type];
  if (!data && loading) return '<div class="list-loading"><span class="list-loading-spinner"></span> Загружаем список</div>';
  if (!data && error) return '<div class="list-error"><span>' + escapeHtml(error) +
    '</span><button type="button" data-list-action="retry">Повторить</button></div>';
  if (!data) return '<div class="list-loading"><span class="list-loading-spinner"></span> Загружаем список</div>';

  const ui = state.listUi || DEFAULT_UI;
  const numbers = listNumbers(type, data, ui.showCompleted);
  const completeCount = numbers.completed.length;
  const doneSet = new Set((type === 'arrivals' ? (data.checkedRoomNumbers || []) : (data.completedNumbers || [])).map(String));
  const cards = numbers.visible.slice().sort((a, b) =>
    ui.sort === 'desc' ? Number(b) - Number(a) : Number(a) - Number(b)
  ).map(number => {
    const info = data.roomInfo && data.roomInfo[number] || {};
    const done = doneSet.has(number);
    const busy = isBusy(type, number);
    if (type === 'arrivals') {
      const entry = data.entries && data.entries[number] || {};
      return renderArrivalCard(number, info, entry, done, state, busy, ui);
    }
    const onArrival = (data.arrivalRooms || []).map(String).includes(number);
    return renderDepartureCard(number, info, onArrival, done, state, busy, ui);
  }).join('');

  let notice = '';
  if (state.listNotice && state.listNotice.message) {
    notice = '<div class="list-notice' + (state.listNotice.isError ? ' is-error' : '') + '">' +
      escapeHtml(state.listNotice.message) + '</div>';
  }
  if (state.listRefillError) {
    notice += '<div class="list-notice is-error">Пополнения: ' + escapeHtml(state.listRefillError) + '</div>';
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

async function saveRefill(card) {
  const number = String(card?.dataset.roomNumber || '');
  const type = getState().listType;
  const data = getState().listData && getState().listData[type];
  const info = data?.roomInfo?.[number];
  if (!info || !Number(info.id)) {
    setNotice('Не удалось определить номер для пополнения.', true);
    return;
  }
  const busyKey = String(info.id);
  if (isBusy('refill', busyKey)) return;
  const current = refillForRoom(getState(), info.id);
  const items = [...card.querySelectorAll('[data-refill-qty]')].map(input => ({
    productId: Number(input.dataset.productId),
    qty: Math.max(0, Math.min(Number(input.max) || 1, Number.parseInt(input.value, 10) || 0))
  })).filter(item => item.productId > 0 && item.qty > 0);
  if (!items.length && !current) {
    setNotice('Выбери хотя бы один отсутствующий продукт и укажи количество.', true);
    return;
  }
  updateBusy('refill', busyKey, true);
  setNotice('');
  try {
    const response = await api.post('refills', {
      roomId: Number(info.id),
      allProducts: false,
      items,
      expectedRequestId: current ? Number(current.id) : null
    });
    const request = response.request;
    const listRefills = (getState().listRefills || []).filter(item => Number(item.roomId) !== Number(info.id));
    if (request && request.status === 'pending') listRefills.push(request);
    setState({ listRefills });
    setNotice(request?.status === 'pending' ? 'Пополнение номера ' + number + ' сохранено.' : 'Пополнение номера ' + number + ' отменено.');
  } catch (error) {
    setNotice(error.message || 'Не удалось сохранить пополнение.', true);
    void loadList(type);
  } finally {
    updateBusy('refill', busyKey, false);
  }
}

export function handleListClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return false;

  const tab = target.closest('[data-list-type][role="tab"]');
  if (tab) {
    event.preventDefault();
    const type = tab.dataset.listType;
    setNotice('');
    setState({ listType: type });
    void loadList(type);
    return true;
  }

  const openRoom = target.closest('[data-open-camera]');
  if (openRoom) {
    event.preventDefault();
    event.stopPropagation();
    void initializeCamera(openRoom.dataset.openCamera, getState().listType);
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
  else if (action === 'save-refill') void saveRefill(control.closest('[data-room-number]'));
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

  const format = target.closest('[data-list-format]');
  if (format) {
    updateUi({ format: format.value === 'compact' ? 'compact' : 'standard' });
    return true;
  }

  const preference = target.closest('[data-list-pref]');
  if (preference) {
    const key = preference.dataset.listPref;
    if (key === 'deadlines' || key === 'refill' || key === 'roomMeta') {
      const ui = getState().listUi || DEFAULT_UI;
      updateUi({ details: { ...ui.details, [key]: preference.checked } });
    }
    return true;
  }

  return false;
}
