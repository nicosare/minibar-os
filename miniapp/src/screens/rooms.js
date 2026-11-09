import { api } from '../core/api.js';
import { pageHeader } from '../components/chrome.js';
import { icon, renderIcons } from '../components/icons.js';

let rooms = [];
let arrivalList = null;
let departureList = null;
let activeRefills = [];
let loading = false;
let loaded = false;
let loadError = '';
let searchQuery = '';
let activeFilter = 'all';
let selectedRoom = null;
let selectedStatuses = [];
let actionMode = '';
let actionBusy = false;
let actionError = '';
let deadlineCounts = {};
let refillCounts = {};

const STATUS = {
  neutral: { label: 'Не проверен', tone: 'neutral' },
  valid: { label: 'В порядке', tone: 'valid' },
  empty: { label: 'Пустой', tone: 'empty' },
  needs_replacement: { label: 'Требует замены', tone: 'needs' }
};
const CATEGORIES = { lux: 'Люкс', standard: 'Стандарт' };
const ACTION_LABELS = {
  deadlines: 'Сроки',
  refill: 'Пополнение',
  markers: 'Метки',
  status: 'Статус'
};
const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

function statusInfo(status) {
  return STATUS[status] || STATUS.neutral;
}
function roomProducts(room) {
  const items = room?.template?.items || room?.templateItems || [];
  return items.map(item => {
    const product = item.product || item;
    if (product.isActive === false) return null;
    return {
      id: Number(item.productId || product.id),
      name: product.name || item.name || 'Продукт',
      emoji: product.emoji || item.emoji || '',
      volume: product.volume ?? item.volume ?? null,
      unit: product.unit || item.unit || 'шт',
      qty: Math.max(1, Number(item.qty || item.maxQty || 1))
    };
  }).filter(item => item && item.id > 0);
}
function statusCounts(items = rooms) {
  return {
    all: items.length,
    neutral: items.filter(room => (room.expiryStatus || 'neutral') === 'neutral').length,
    valid: items.filter(room => room.expiryStatus === 'valid').length,
    empty: items.filter(room => room.expiryStatus === 'empty').length,
    needs_replacement: items.filter(room => room.expiryStatus === 'needs_replacement').length
  };
}
function filteredRooms() {
  const query = searchQuery.trim().toLowerCase();
  return rooms.filter(room => {
    const matchesQuery = !query ||
      String(room.number).includes(query) ||
      String(room.floor || '').includes(query) ||
      String(CATEGORIES[room.category] || room.category || '').toLowerCase().includes(query);
    const matchesFilter = activeFilter === 'all' ||
      (room.expiryStatus || 'neutral') === activeFilter;
    return matchesQuery && matchesFilter;
  }).sort((a,b) =>
    Number(a.floor || 0) - Number(b.floor || 0) ||
    Number(a.number) - Number(b.number));
}
function formatDateTime(value) {
  if (!value) return 'Не проводилась';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Не проводилась';
  return date.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
function renderRoomCard(room) {
  const status = statusInfo(room.expiryStatus);
  const category = CATEGORIES[room.category] || room.category || 'Без категории';
  return '<button type="button" class="rooms-directory-card status-' + status.tone +
    '" data-room-open="' + Number(room.id) + '">' +
    '<span class="rooms-directory-number">' + escapeHtml(room.number) + '</span>' +
    '<span class="rooms-directory-copy"><strong>' + escapeHtml(category) + '</strong>' +
      '<small>' + escapeHtml(room.floor ? 'Этаж ' + room.floor : 'Этаж не указан') + '</small></span>' +
    '<span class="rooms-directory-status">' + escapeHtml(status.label) + '</span>' +
    '<span class="rooms-directory-arrow">' + icon('chevron-right',16) + '</span>' +
  '</button>';
}
function renderRoomGroups() {
  const host = document.getElementById('roomsDirectoryContent');
  if (!host) return;
  if (loading && !loaded) {
    host.innerHTML = '<div class="rooms-directory-state"><span class="rooms-loading-spinner"></span><strong>Загружаем номера…</strong></div>';
    return;
  }
  if (loadError && !loaded) {
    host.innerHTML = '<div class="rooms-directory-state is-error"><strong>Не удалось загрузить номера</strong><span>' +
      escapeHtml(loadError) + '</span><button type="button" data-rooms-retry>Повторить</button></div>';
    return;
  }
  const visible = filteredRooms();
  if (!visible.length) {
    host.innerHTML = '<div class="rooms-directory-state"><span class="rooms-directory-state-icon">' +
      icon('search-x',23) + '</span><strong>' + (rooms.length ? 'Ничего не найдено' : 'Номеров пока нет') +
      '</strong><span>' + (rooms.length ? 'Измени запрос или фильтр.' : 'Добавь номера в системе, чтобы они появились здесь.') + '</span></div>';
    return;
  }
  const floors = [...new Set(visible.map(room => Number(room.floor || 0)))].sort((a,b)=>a-b);
  host.innerHTML = floors.map(floor => {
    const floorRooms = visible.filter(room => Number(room.floor || 0) === floor);
    return '<section class="rooms-floor-section"><header class="rooms-floor-heading">' +
      '<span class="rooms-floor-number">' + (floor || '—') + '</span><div><strong>' +
      (floor ? 'Этаж ' + floor : 'Без этажа') + '</strong><small>' + floorRooms.length + ' ' +
      (floorRooms.length === 1 ? 'номер' : floorRooms.length < 5 ? 'номера' : 'номеров') + '</small></div></header>' +
      '<div class="rooms-directory-grid">' + floorRooms.map(renderRoomCard).join('') + '</div></section>';
  }).join('');
  renderIcons();
}
function renderFilters() {
  const counts = statusCounts();
  const host = document.getElementById('roomsFilterRow');
  if (!host) return;
  const filters = [
    ['all','Все',counts.all],
    ['neutral','Не проверен',counts.neutral],
    ['valid','В порядке',counts.valid],
    ['empty','Пустой',counts.empty],
    ['needs_replacement','Замена',counts.needs_replacement]
  ];
  host.innerHTML = filters.map(([key,label,count]) =>
    '<button type="button" class="rooms-filter-chip' + (activeFilter === key ? ' is-active' : '') +
    '" data-room-filter="' + key + '">' + label + '<span>' + count + '</span></button>'
  ).join('');
}
function renderStats() {
  const counts = statusCounts();
  const all = document.getElementById('roomsCountTotal');
  const needs = document.getElementById('roomsCountNeeds');
  const empty = document.getElementById('roomsCountEmpty');
  if (all) all.textContent = counts.all;
  if (needs) needs.textContent = counts.needs_replacement;
  if (empty) empty.textContent = counts.empty;
}
function inArrivalList(number) {
  return (arrivalList?.roomNumbers || []).map(String).includes(String(number));
}
function inDepartureList(number) {
  const value = String(number);
  return [
    ...(departureList?.roomNumbers || []),
    ...(departureList?.completedNumbers || [])
  ].map(String).includes(value);
}
function isCheckedToday(number) {
  return (departureList?.checkedToday || []).some(item => String(item?.number || '') === String(number));
}
function currentArrivalEntry(number) {
  return arrivalList?.entries?.[String(number)] || {};
}
function refillForRoom(room) {
  return activeRefills.find(item => Number(item.roomId) === Number(room?.id)) || null;
}
function actionButton(mode, glyph, title, subtitle, tone) {
  return '<button type="button" class="rooms-detail-action' + (tone ? ' is-' + tone : '') +
    '" data-room-action="' + mode + '"><span class="rooms-detail-action-icon">' + icon(glyph,19) +
    '</span><span><strong>' + title + '</strong><small>' + subtitle + '</small></span>' +
    '<span class="rooms-detail-action-arrow">' + icon('chevron-right',15) + '</span></button>';
}
function renderHome(room) {
  const status = statusInfo(room.expiryStatus);
  const refill = refillForRoom(room);
  const arr = inArrivalList(room.number);
  const dep = inDepartureList(room.number);
  const depChecked = isCheckedToday(room.number);
  const depDone = (departureList?.completedNumbers || []).map(String).includes(String(room.number));
  const arrivalLabel = arr ? 'Уже в списке' : 'Добавить в Заезды';
  const departureLabel = depDone ? 'Выполнен сегодня'
    : dep ? 'Уже в списке'
    : depChecked ? 'Проверен сегодня'
    : 'Добавить в Выезды';
  const lastCheck = room.lastDailyCheck;
  const refillLabel = refill?.items?.length ? 'Есть заявка на пополнение' : 'Открыть пополнение';
  return '<div class="rooms-detail-home">' +
    '<section class="rooms-detail-status-card status-' + status.tone + '">' +
      '<span>Текущий статус</span><strong>' + escapeHtml(status.label) + '</strong>' +
    '</section>' +
    '<section class="rooms-last-check"><span class="rooms-last-check-icon">' + icon('calendar-check',17) + '</span>' +
      '<div><small>Последняя ежедневная проверка</small><strong>' +
        escapeHtml(formatDateTime(lastCheck?.checkDate)) + '</strong></div>' +
    '</section>' +
    '<div class="rooms-detail-action-grid">' +
      actionButton('deadlines','calendar-clock','Сроки',room.expiryStatus === 'needs_replacement' ? 'Есть отметки к замене' : 'Проверить сроки') +
      actionButton('refill','package-plus','Пополнение',refillLabel,refill?.items?.length ? 'warning' : '') +
      actionButton('markers','tags','Метки',arr ? 'VIP, время и другие отметки' : 'Управление метками') +
      actionButton('status','activity','Статус','Изменить состояние номера') +
    '</div>' +
    '<section class="rooms-list-membership"><div class="rooms-list-membership-heading">Списки</div>' +
      '<div class="rooms-list-membership-row">' +
        '<button type="button" data-room-action="add-arrivals" class="' + (arr ? 'is-added' : '') + '"' + (arr ? ' disabled' : '') + '>' +
          icon(arr ? 'check' : 'plus',15) + ' ' + arrivalLabel + '</button>' +
        '<button type="button" data-room-action="add-departures" class="' + (dep || depChecked ? 'is-added' : '') + '"' + (dep || depChecked ? ' disabled' : '') + '>' +
          icon(dep ? 'check' : 'plus',15) + ' ' + departureLabel + '</button>' +
      '</div></section>' +
    (room.notes ? '<p class="rooms-detail-note">' + escapeHtml(room.notes) + '</p>' : '') +
  '</div>';
}
function actionHeader(mode) {
  return '<div class="rooms-action-heading"><button type="button" data-room-action="back" aria-label="Назад">' +
    icon('chevron-left',17) + '</button><div><strong>К карточке номера</strong><small>Номер ' +
    escapeHtml(selectedRoom?.number || '') + '</small></div></div>';
}
function actionFeedback() {
  return actionError
    ? '<div class="rooms-action-feedback is-error">' + escapeHtml(actionError) + '</div>'
    : '';
}
function renderDeadlineAction() {
  const products = roomProducts(selectedRoom);
  const rows = products.map(product => {
    const value = Math.max(0, Number(deadlineCounts[product.id]) || 0);
    return '<div class="rooms-action-product"><span class="rooms-action-product-icon">' +
      escapeHtml(product.emoji || '•') + '</span><span class="rooms-action-product-copy"><strong>' +
      escapeHtml(product.name) + '</strong><small>Максимум ' + product.qty + ' ' + escapeHtml(product.unit) + '</small></span>' +
      '<div class="rooms-action-stepper"><button type="button" data-room-step="deadline" data-product-id="' + product.id +
        '" data-delta="-1" aria-label="Уменьшить">−</button><strong>' + value + '</strong><button type="button" data-room-step="deadline" data-product-id="' +
        product.id + '" data-delta="1" aria-label="Увеличить"' + (value >= product.qty ? ' disabled' : '') + '>+</button></div></div>';
  }).join('');
  return actionHeader('deadlines') +
    '<p class="rooms-action-hint">Отметь только те позиции, которые нужно заменить по срокам. Нулевые значения сохраняться не будут.</p>' +
    (rows ? '<div class="rooms-action-products">' + rows + '</div>' :
      '<div class="rooms-detail-empty">Для номера не задана комплектация.</div>') +
    actionFeedback();
}
function renderRefillAction() {
  const products = roomProducts(selectedRoom);
  const rows = products.map(product => {
    const value = Math.max(0, Number(refillCounts[product.id]) || 0);
    return '<div class="rooms-action-product"><span class="rooms-action-product-icon">' +
      escapeHtml(product.emoji || '•') + '</span><span class="rooms-action-product-copy"><strong>' +
      escapeHtml(product.name) + '</strong><small>В комплектации: ' + product.qty + ' ' + escapeHtml(product.unit) + '</small></span>' +
      '<div class="rooms-action-stepper"><button type="button" data-room-step="refill" data-product-id="' + product.id +
        '" data-delta="-1" aria-label="Уменьшить"' + (value <= 0 ? ' disabled' : '') + '>−</button><strong>' + value +
        '</strong><button type="button" data-room-step="refill" data-product-id="' + product.id +
        '" data-delta="1" aria-label="Увеличить"' + (value >= product.qty ? ' disabled' : '') + '>+</button></div></div>';
  }).join('');
  const current = refillForRoom(selectedRoom);
  return actionHeader('refill') +
    '<p class="rooms-action-hint">Укажи, сколько единиц каждого продукта нужно пополнить. Список обновится после сохранения.</p>' +
    (current ? '<div class="rooms-action-current">' + icon('clock',14) + ' Для номера уже есть незакрытая заявка</div>' : '') +
    (rows ? '<div class="rooms-action-products">' + rows + '</div>' :
      '<div class="rooms-detail-empty">Для номера не задана комплектация.</div>') +
    actionFeedback();
}
function renderMarkersAction() {
  const number = String(selectedRoom?.number || '');
  const entry = currentArrivalEntry(number);
  const inArr = inArrivalList(number);
  const inDep = (departureList?.roomNumbers || []).map(String).includes(number);
  const checkbox = (field,label) =>
    '<label class="rooms-marker-toggle"><input type="checkbox" data-room-marker-field="' + field + '"' +
    (entry[field] ? ' checked' : '') + '><span>' + label + '</span></label>';
  return actionHeader('markers') +
    (!inArr ? '<div class="rooms-markers-empty"><strong>Номер не добавлен в «Заезды»</strong><span>Сначала добавь его в список, чтобы редактировать метки и время.</span>' +
      '<button type="button" data-room-action="add-arrivals">' + icon('plus',15) + ' Добавить в Заезды</button></div>' :
      '<div class="rooms-marker-grid">' +
        checkbox('vip','VIP') + checkbox('empty','Опустошить') + checkbox('ready','Можно делать') +
      '</div>' +
      '<div class="rooms-marker-fields"><label><span>Время</span><input type="time" data-room-marker-field="time" value="' + escapeHtml(entry.time || '') + '"></label>' +
        '<label><span>Комментарий</span><input type="text" maxlength="500" data-room-marker-field="comment" value="' +
          escapeHtml(entry.comment || '') + '" placeholder="Добавить комментарий"></label></div>') +
    (inDep ? '<button type="button" class="rooms-departure-marker' + ((departureList?.arrivalRooms || []).map(String).includes(number) ? ' is-active' : '') +
      '" data-room-action="toggle-departure-arrival">' +
      icon('plane-landing',16) + (((departureList?.arrivalRooms || []).map(String).includes(number)) ? ' Снять метку «На заезд»' : ' Отметить «На заезд»') + '</button>' : '') +
    actionFeedback();
}
function renderStatusAction() {
  const status = selectedRoom?.expiryStatus || 'neutral';
  const options = [
    ['valid','В порядке','check-circle-2'],
    ['empty','Пустой','package-open'],
    ['neutral','Сбросить статус','rotate-ccw']
  ];
  return actionHeader('status') +
    '<p class="rooms-action-hint">Выбери текущее состояние номера. Изменение сохранится в истории.</p>' +
    '<div class="rooms-status-options">' + options.map(([value,label,glyph]) =>
      '<button type="button" data-room-action="status-' + value + '"' + (status === value ? ' class="is-active"' : '') + '>' +
      icon(glyph,17) + '<span>' + label + '</span>' + (status === value ? icon('check',15) : '') + '</button>'
    ).join('') + '</div>' + actionFeedback();
}
function renderActionContent() {
  if (actionMode === 'deadlines') return renderDeadlineAction();
  if (actionMode === 'refill') return renderRefillAction();
  if (actionMode === 'markers') return renderMarkersAction();
  if (actionMode === 'status') return renderStatusAction();
  return '';
}
function renderRoomDetails(room) {
  const backdrop = document.getElementById('roomDetailModal');
  if (!backdrop) return;
  const category = CATEGORIES[room.category] || room.category || 'Без категории';
  const inAction = Boolean(actionMode);
  const title = inAction ? ACTION_LABELS[actionMode] : 'НОМЕР';
  backdrop.innerHTML =
    '<div class="rooms-detail-sheet" role="document">' +
      '<header class="rooms-detail-header"><div><span>' + title + '</span><h2>' + escapeHtml(room.number) +
      '</h2><p>' + escapeHtml([room.floor ? 'Этаж ' + room.floor : '', category].filter(Boolean).join(' · ')) +
      '</p></div><button type="button" data-room-detail-close aria-label="Закрыть">' + icon('x',20) + '</button></header>' +
      '<div class="rooms-detail-scroll">' + (inAction ? renderActionContent() : renderHome(room)) + '</div>' +
      (inAction ? '<footer class="rooms-detail-footer">' +
        (actionBusy ? '<span class="rooms-action-saving">Сохраняем…</span>' :
          actionMode === 'deadlines' ? '<button type="button" data-room-action="save-deadlines">Сохранить сроки</button>' :
          actionMode === 'refill' ? '<button type="button" data-room-action="save-refill">Сохранить пополнение</button>' :
          actionMode === 'markers' && inArrivalList(room.number) ? '<button type="button" data-room-action="save-markers">Сохранить метки</button>' : '') +
      '</footer>' : '') +
    '</div>';
  backdrop.classList.remove('hidden');
  backdrop.setAttribute('aria-hidden','false');
  document.body.classList.add('rooms-modal-open');
  renderIcons();
}
function beginAction(mode) {
  if (!selectedRoom || actionBusy) return;
  actionMode = mode;
  actionError = '';
  if (mode === 'deadlines') {
    const statusMap = new Map(selectedStatuses.map(item => [Number(item.productId), item]));
    deadlineCounts = Object.fromEntries(roomProducts(selectedRoom).map(product => [
      product.id, Math.min(product.qty, Math.max(0, Number(statusMap.get(product.id)?.qtyToReplace) || 0))
    ]));
  } else if (mode === 'refill') {
    const request = refillForRoom(selectedRoom);
    refillCounts = {};
    (request?.items || []).forEach(item => {
      refillCounts[Number(item.productId)] = Number(item.qty) || 0;
    });
  }
  renderRoomDetails(selectedRoom);
}
async function loadRoomLists() {
  const [arrivals, departures, refills] = await Promise.allSettled([
    api.get('arrivals/miniapp-list'),
    api.get('departures/miniapp-list'),
    api.get('refills/active')
  ]);
  if (arrivals.status === 'fulfilled') arrivalList = arrivals.value;
  if (departures.status === 'fulfilled') departureList = departures.value;
  if (refills.status === 'fulfilled') activeRefills = (refills.value?.requests || []).filter(item => item?.status === 'pending');
}
async function refreshRoomIndex() {
  const [roomResult] = await Promise.allSettled([api.get('rooms')]);
  if (roomResult.status === 'fulfilled') {
    rooms = Array.isArray(roomResult.value) ? roomResult.value : roomResult.value?.rooms || [];
    rooms.sort((a,b) => Number(a.floor || 0) - Number(b.floor || 0) || Number(a.number) - Number(b.number));
  }
  await loadRoomLists();
  renderStats();
  renderFilters();
  renderRoomGroups();
  if (selectedRoom) {
    const refreshed = rooms.find(item => Number(item.id) === Number(selectedRoom.id));
    if (refreshed) selectedRoom = { ...selectedRoom, ...refreshed };
  }
}
async function openRoomDetails(id) {
  const backdrop = document.getElementById('roomDetailModal');
  if (!backdrop) return;
  const room = rooms.find(item => Number(item.id) === Number(id));
  if (!room) return;
  actionMode = '';
  backdrop.innerHTML = '<div class="rooms-detail-sheet rooms-detail-loading"><span class="rooms-loading-spinner"></span><strong>Загружаем номер…</strong></div>';
  backdrop.classList.remove('hidden');
  backdrop.setAttribute('aria-hidden','false');
  document.body.classList.add('rooms-modal-open');
  try {
    const [detail, statuses] = await Promise.all([
      api.get('rooms/' + Number(id)),
      api.get('rooms/' + Number(id) + '/product-statuses')
    ]);
    selectedRoom = { ...(detail || room), lastDailyCheck: room.lastDailyCheck || null };
    selectedStatuses = Array.isArray(statuses) ? statuses : [];
    await loadRoomLists();
    renderRoomDetails(selectedRoom);
  } catch (error) {
    backdrop.innerHTML = '<div class="rooms-detail-sheet rooms-detail-loading is-error"><strong>Не удалось загрузить номер</strong><span>' +
      escapeHtml(error.message || 'Ошибка запроса') + '</span><button type="button" data-room-detail-close>Закрыть</button></div>';
  }
}
function closeRoomDetails() {
  const backdrop = document.getElementById('roomDetailModal');
  if (!backdrop) return;
  backdrop.classList.add('hidden');
  backdrop.setAttribute('aria-hidden','true');
  document.body.classList.remove('rooms-modal-open');
  selectedRoom = null;
  selectedStatuses = [];
  actionMode = '';
  actionBusy = false;
  actionError = '';
}
async function loadRooms() {
  loading = true;
  loadError = '';
  renderRoomGroups();
  try {
    const [roomResult] = await Promise.all([api.get('rooms')]);
    rooms = Array.isArray(roomResult) ? roomResult : roomResult?.rooms || [];
    rooms.sort((a,b) =>
      Number(a.floor || 0) - Number(b.floor || 0) ||
      Number(a.number) - Number(b.number));
    loaded = true;
    await loadRoomLists();
  } catch (error) {
    loadError = error.message || 'Ошибка загрузки';
  } finally {
    loading = false;
    renderStats();
    renderFilters();
    renderRoomGroups();
  }
}
async function addRoomToList(type) {
  if (!selectedRoom || actionBusy) return;
  const number = String(selectedRoom.number);
  actionBusy = true;
  actionError = '';
  renderRoomDetails(selectedRoom);
  try {
    if (type === 'arrivals') {
      await api.post('arrivals/session/rooms', { numbers: [number] });
    } else {
      const result = await api.patch('departures/miniapp-list/room', { number, action: 'add' });
      if (result?.list) departureList = result.list;
    }
    await loadRoomLists();
    await refreshRoomIndex();
    if (actionMode) renderRoomDetails(selectedRoom);
  } catch (error) {
    actionError = error.message || 'Не удалось добавить номер в список';
    renderRoomDetails(selectedRoom);
  } finally {
    actionBusy = false;
    if (selectedRoom) renderRoomDetails(selectedRoom);
  }
}
async function saveRoomDeadlines() {
  if (!selectedRoom || actionBusy) return;
  const items = Object.entries(deadlineCounts).map(([productId, qty]) => ({
    productId: Number(productId), qtyToReplace: Number(qty), expiryStatus: 'needs_replacement'
  })).filter(item => item.productId > 0 && item.qtyToReplace > 0);
  actionBusy = true;
  actionError = '';
  renderRoomDetails(selectedRoom);
  try {
    const result = await api.put('rooms/' + Number(selectedRoom.id) + '/product-statuses', {
      items, roomStatus: items.length ? 'needs_replacement' : 'neutral'
    });
    selectedStatuses = Array.isArray(result.statuses) ? result.statuses : [];
    actionMode = '';
    await refreshRoomIndex();
  } catch (error) {
    actionError = error.message || 'Не удалось сохранить сроки';
  } finally {
    actionBusy = false;
    if (selectedRoom) renderRoomDetails(selectedRoom);
  }
}
async function saveRoomRefill() {
  if (!selectedRoom || actionBusy) return;
  const items = Object.entries(refillCounts).map(([productId, qty]) => ({
    productId: Number(productId), qty: Number(qty)
  })).filter(item => item.productId > 0 && item.qty > 0);
  const current = refillForRoom(selectedRoom);
  if (!items.length && !current) {
    actionError = 'Отметь продукты или укажи потребность в пополнении.';
    renderRoomDetails(selectedRoom);
    return;
  }
  actionBusy = true;
  actionError = '';
  renderRoomDetails(selectedRoom);
  try {
    await api.post('refills', {
      roomId: Number(selectedRoom.id),
      allProducts: false,
      expectedRequestId: current ? Number(current.id) : null,
      items
    });
    actionMode = '';
    await refreshRoomIndex();
  } catch (error) {
    actionError = error.message || 'Не удалось сохранить пополнение';
  } finally {
    actionBusy = false;
    if (selectedRoom) renderRoomDetails(selectedRoom);
  }
}
async function saveRoomMarkers() {
  if (!selectedRoom || actionBusy) return;
  if (!inArrivalList(selectedRoom.number)) {
    actionError = 'Добавь номер в Заезды, чтобы редактировать метки.';
    renderRoomDetails(selectedRoom);
    return;
  }
  const host = document.getElementById('roomDetailModal');
  const values = {};
  host?.querySelectorAll('[data-room-marker-field]').forEach(field => {
    values[field.dataset.roomMarkerField] = field.type === 'checkbox' ? field.checked : String(field.value || '');
  });
  actionBusy = true;
  actionError = '';
  renderRoomDetails(selectedRoom);
  try {
    for (const [field, value] of Object.entries(values)) {
      const saved = await api.patch('arrivals/miniapp-list/room', {
        number: String(selectedRoom.number), field, value
      });
      if (saved?.list) arrivalList = saved.list;
    }
    const latest = await api.get('arrivals/miniapp-list');
    arrivalList = latest;
    actionMode = '';
    await refreshRoomIndex();
  } catch (error) {
    actionError = error.message || 'Не удалось сохранить метки';
  } finally {
    actionBusy = false;
    if (selectedRoom) renderRoomDetails(selectedRoom);
  }
}
async function setRoomStatus(status) {
  if (!selectedRoom || actionBusy) return;
  actionBusy = true;
  actionError = '';
  renderRoomDetails(selectedRoom);
  try {
    await api.delete('rooms/' + Number(selectedRoom.id) + '/product-statuses', {
      body: { roomStatus: status }
    });
    selectedStatuses = [];
    actionMode = '';
    await refreshRoomIndex();
  } catch (error) {
    actionError = error.message || 'Не удалось изменить статус';
  } finally {
    actionBusy = false;
    if (selectedRoom) renderRoomDetails(selectedRoom);
  }
}
async function toggleDepartureArrival() {
  if (!selectedRoom || actionBusy ||
      !(departureList?.roomNumbers || []).map(String).includes(String(selectedRoom.number))) return;
  const number = String(selectedRoom.number);
  const enabled = !(departureList?.arrivalRooms || []).map(String).includes(number);
  actionBusy = true;
  actionError = '';
  renderRoomDetails(selectedRoom);
  try {
    const result = await api.patch('departures/miniapp-list/room', {
      number, action: 'arrival', enabled
    });
    departureList = result.list || departureList;
    actionError = '';
  } catch (error) {
    actionError = error.message || 'Не удалось изменить метку «На заезд»';
  } finally {
    actionBusy = false;
    if (selectedRoom) renderRoomDetails(selectedRoom);
  }
}
export function renderRooms() {
  return '<div class="screen screen-rooms">' + pageHeader({ title: 'Номера' }) +
    '<section class="rooms-directory-summary">' +
      '<div><span>Всего номеров</span><strong id="roomsCountTotal">—</strong></div>' +
      '<div><span>Пустые</span><strong id="roomsCountEmpty">—</strong></div>' +
      '<div><span>Требуют замены</span><strong id="roomsCountNeeds">—</strong></div>' +
    '</section>' +
    '<label class="rooms-directory-search"><span>' + icon('search',17) + '</span><input id="roomsSearch" type="search" value="' + escapeHtml(searchQuery) + '" placeholder="Номер, этаж или категория" autocomplete="off"></label>' +
    '<div class="rooms-filter-row" id="roomsFilterRow"></div>' +
    '<div id="roomsDirectoryContent" class="rooms-directory-content"></div>' +
    '<div id="roomDetailModal" class="rooms-detail-backdrop hidden" aria-hidden="true"></div>' +
    '</div>';
}
export function roomsDidRender() {
  renderStats();
  renderFilters();
  renderRoomGroups();
  if (!loaded && !loading) void loadRooms();
}
export function roomsWillUnmount() {
  closeRoomDetails();
  loaded = false;
}
export function handleRoomsInput(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target || target.id !== 'roomsSearch') return false;
  searchQuery = target.value || '';
  renderRoomGroups();
  return true;
}
export function handleRoomsChange(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return false;
  return Boolean(target.closest('[data-room-marker-field]'));
}
export function handleRoomsClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return false;
  if (target.closest('[data-rooms-retry]')) {
    loaded = false;
    void loadRooms();
    return true;
  }
  const filter = target.closest('[data-room-filter]');
  if (filter) {
    activeFilter = filter.dataset.roomFilter || 'all';
    renderFilters();
    renderRoomGroups();
    return true;
  }
  const room = target.closest('[data-room-open]');
  if (room) {
    void openRoomDetails(room.dataset.roomOpen);
    return true;
  }
  const step = target.closest('[data-room-step]');
  if (step) {
    if (actionBusy) return true;
    const id = Number(step.dataset.productId);
    const delta = Number(step.dataset.delta) || 0;
    const kind = step.dataset.roomStep;
    const product = roomProducts(selectedRoom).find(item => item.id === id);
    if (!product) return true;
    const values = kind === 'deadline' ? deadlineCounts : refillCounts;
    values[id] = Math.max(0, Math.min(product.qty, (Number(values[id]) || 0) + delta));
    renderRoomDetails(selectedRoom);
    return true;
  }
  const action = target.closest('[data-room-action]');
  if (action) {
    const name = action.dataset.roomAction;
    if (name === 'back') {
      actionMode = '';
      actionError = '';
      renderRoomDetails(selectedRoom);
    } else if (name === 'deadlines' || name === 'refill' || name === 'markers' || name === 'status') {
      beginAction(name);
    } else if (name === 'save-deadlines') void saveRoomDeadlines();
    else if (name === 'save-refill') void saveRoomRefill();
    else if (name === 'save-markers') void saveRoomMarkers();
    else if (name === 'status-valid') void setRoomStatus('valid');
    else if (name === 'status-empty') void setRoomStatus('empty');
    else if (name === 'status-neutral') void setRoomStatus('neutral');
    else if (name === 'add-arrivals') void addRoomToList('arrivals');
    else if (name === 'add-departures') void addRoomToList('departures');
    else if (name === 'toggle-departure-arrival') void toggleDepartureArrival();
    return true;
  }
  if (target.closest('[data-room-detail-close]') || target.id === 'roomDetailModal') {
    closeRoomDetails();
    return true;
  }
  return false;
}
