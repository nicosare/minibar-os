import { api } from '../core/api.js';
import { setState } from '../core/store.js';
import { pageHeader } from '../components/chrome.js';
import { icon, renderIcons } from '../components/icons.js';
import { renderSharedRoomActionModals, openSharedRoomActionModal } from './camera.js';

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
let actionDraft = {};

const STATUS = {
  neutral: { label: 'Не проверен', tone: 'neutral' },
  valid: { label: 'В порядке', tone: 'valid' },
  empty: { label: 'Пустой', tone: 'empty' },
  needs_replacement: { label: 'Требует замены', tone: 'needs' }
};
const CATEGORIES = { lux: 'Люкс', standard: 'Стандарт' };
const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const statusInfo = status => STATUS[status] || STATUS.neutral;

function roomProducts(room) {
  const source = room?.template?.items || room?.templateItems || [];
  return source.map(item => {
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
function isInArrivalList(number) {
  return (arrivalList?.roomNumbers || []).map(String).includes(String(number));
}
function isInDepartureList(number) {
  return (departureList?.roomNumbers || []).map(String).includes(String(number));
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
function formatCheckDate(value) {
  if (!value) return 'Ежедневной проверки ещё не было';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Ежедневной проверки ещё не было';
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startCheck = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startToday.getTime() - startCheck.getTime()) / 86400000);
  const relative = dayDiff === 0 ? 'Сегодня'
    : dayDiff === 1 ? 'Вчера'
    : dayDiff === 2 ? 'Позавчера'
    : date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return relative + ' · ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}
function checkDate(room) {
  return room?.lastDailyCheck?.checkDate || null;
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
function renderRoomCard(room) {
  const status = statusInfo(room.expiryStatus);
  const category = CATEGORIES[room.category] || room.category || 'Без категории';
  return '<button type="button" class="rooms-directory-card status-' + status.tone +
    '" data-room-open="' + Number(room.id) + '">' +
    '<span class="rooms-directory-number">' + escapeHtml(room.number) + '</span>' +
    '<span class="rooms-directory-copy"><strong>' + escapeHtml(category) + '</strong>' +
      '<small>' + escapeHtml(room.floor ? 'Этаж ' + room.floor : 'Этаж не указан') + '</small></span>' +
    '<span class="rooms-directory-status">' + escapeHtml(status.label) + '</span>' +
    '<span class="rooms-directory-check">' + escapeHtml(formatCheckDate(checkDate(room))) + '</span>' +
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
    '" data-room-filter="' + key + '">' + label +
    (key === 'empty' ? '<span>' + count + '</span>' : '') + '</button>'
  ).join('');
}
function renderStats() {
  const empty = document.getElementById('roomsCountEmpty');
  const arrivals = document.getElementById('roomsCountArrivals');
  const departures = document.getElementById('roomsCountDepartures');
  if (empty) empty.textContent = statusCounts().empty;
  if (arrivals) arrivals.textContent = arrivalList?.assignedCount ?? arrivalList?.roomNumbers?.length ?? '—';
  if (departures) departures.textContent = departureList?.assignedCount ?? departureList?.roomNumbers?.length ?? '—';
}
function actionButton(mode, glyph, title, subtitle, tone = '') {
  return '<button type="button" class="rooms-detail-action' + (tone ? ' is-' + tone : '') +
    '" data-room-action="' + mode + '"><span class="rooms-detail-action-icon">' + icon(glyph,19) +
    '</span><span><strong>' + title + '</strong><small>' + subtitle + '</small></span>' +
    '<span class="rooms-detail-action-arrow">' + icon('chevron-right',15) + '</span></button>';
}
function renderListButton(type, number, checkedToday) {
  const isInList = type === 'arrivals' ? isInArrivalList(number) : isInDepartureList(number);
  const title = checkedToday ? 'Проверен сегодня'
    : isInList ? (type === 'arrivals' ? 'В Заездах' : 'В Выездах')
    : (type === 'arrivals' ? 'Добавить в Заезды' : 'Добавить в Выезды');
  const disabled = checkedToday || isInList;
  const glyph = checkedToday || isInList ? 'check' : 'plus';
  return '<button type="button" data-room-action="add-' + type + '" class="rooms-list-button' +
    (disabled ? ' is-disabled' : '') + '"' + (disabled ? ' disabled' : '') + '>' +
    icon(glyph,15) + '<span>' + title + '</span></button>';
}
function renderHome(room) {
  const number = String(room.number);
  const status = statusInfo(room.expiryStatus);
  const checkedToday = isCheckedToday(number);
  const inArr = isInArrivalList(number);
  const inDep = isInDepartureList(number);
  const refill = refillForRoom(room);
  const showMarkers = inArr || inDep;
  const lastCheck = formatCheckDate(checkDate(room));
  return '<div class="rooms-detail-home">' +
    '<div class="rooms-detail-overview">' +
      '<span class="rooms-detail-status-badge status-' + status.tone + '">' + escapeHtml(status.label) + '</span>' +
      '<span class="rooms-detail-check"><span>' + icon('calendar-check',14) + '</span><span><small>Последняя ежедневная проверка</small><strong>' +
        escapeHtml(lastCheck) + '</strong></span></span>' +
    '</div>' +
    '<div class="rooms-detail-action-grid">' +
      actionButton('deadlines','calendar-clock','Сроки',room.expiryStatus === 'needs_replacement' ? 'Есть отметки к замене' : 'Состояние сроков') +
      actionButton('refill','package-plus','Пополнение',refill?.items?.length ? 'Есть активная заявка' : 'Открыть список пополнения',refill?.items?.length ? 'warning' : '') +
      (showMarkers ? actionButton('markers','tags','Метки','Отметки списков и время') : '') +
    '</div>' +
    '<section class="rooms-list-membership">' +
      renderListButton('arrivals',number,checkedToday) +
      '<button type="button" class="rooms-photo-button" data-room-action="open-camera">' +
        icon('camera',20) + '<span>Фото</span>' +
      '</button>' +
      renderListButton('departures',number,checkedToday) +
    '</section>' +
    (room.notes ? '<p class="rooms-detail-note">' + escapeHtml(room.notes) + '</p>' : '') +
  '</div>';
}
function actionHeader(title) {
  return '<div class="rooms-action-heading"><button type="button" data-room-action="back" aria-label="Назад">' +
    icon('chevron-left',17) + '</button><div><strong>' + escapeHtml(title) +
    '</strong><small>Номер ' + escapeHtml(selectedRoom?.number || '') + '</small></div></div>';
}
function actionFeedback() {
  return actionError ? '<div class="rooms-action-feedback is-error">' + escapeHtml(actionError) + '</div>' : '';
}
function entryControls(entry = {}, includeComment = true) {
  const checkbox = (field,label) =>
    '<label class="rooms-marker-toggle"><input type="checkbox" data-room-marker-field="' + field + '"' +
    (entry[field] ? ' checked' : '') + '><span>' + label + '</span></label>';
  return '<div class="rooms-marker-grid">' +
      checkbox('vip','VIP') + checkbox('empty','Опустошить') + checkbox('ready','Можно делать') +
    '</div>' +
    '<div class="rooms-marker-fields">' +
      '<label><span>Время</span><input type="time" data-room-marker-field="time" value="' + escapeHtml(entry.time || '') + '"></label>' +
      (includeComment ? '<label><span>Комментарий</span><input type="text" maxlength="500" data-room-marker-field="comment" value="' +
        escapeHtml(entry.comment || '') + '" placeholder="Добавить комментарий"></label>' : '') +
    '</div>';
}
function renderAddArrivals() {
  return actionHeader('Метки перед добавлением') +
    '<p class="rooms-action-hint">Сначала отметь нужные параметры номера. После этого он появится в списке «Заезды» уже с этими метками.</p>' +
    entryControls(actionDraft) + actionFeedback();
}
function renderAddDepartures() {
  return actionHeader('Метка перед добавлением') +
    '<p class="rooms-action-hint">Укажи, нужно ли отметить номер как заезд. После сохранения он появится в списке «Выезды».</p>' +
    '<label class="rooms-marker-toggle rooms-single-marker"><input type="checkbox" data-room-marker-field="arrival"' +
      (actionDraft.arrival ? ' checked' : '') + '><span>На заезд</span></label>' + actionFeedback();
}
function renderMarkersAction() {
  const number = String(selectedRoom?.number || '');
  const inArr = isInArrivalList(number);
  const inDep = isInDepartureList(number);
  return actionHeader('Метки') +
    (inArr ? '<section class="rooms-marker-section"><h3>Заезды</h3>' + entryControls(actionDraft) + '</section>' : '') +
    (inDep ? '<section class="rooms-marker-section"><h3>Выезды</h3><label class="rooms-marker-toggle rooms-single-marker">' +
      '<input type="checkbox" data-room-marker-field="arrival"' + (actionDraft.arrival ? ' checked' : '') +
      '><span>На заезд</span></label></section>' : '') +
    actionFeedback();
}
function renderActionContent() {
  if (actionMode === 'add-arrivals') return renderAddArrivals();
  if (actionMode === 'add-departures') return renderAddDepartures();
  if (actionMode === 'markers') return renderMarkersAction();
  return '';
}
function renderRoomDetails(room) {
  const backdrop = document.getElementById('roomDetailModal');
  if (!backdrop) return;
  const category = CATEGORIES[room.category] || room.category || 'Без категории';
  const title = actionMode
    ? (actionMode === 'add-arrivals' ? 'Добавить в Заезды'
      : actionMode === 'add-departures' ? 'Добавить в Выезды' : 'Метки')
    : 'НОМЕР';
  const actionFooter = actionMode
    ? '<footer class="rooms-detail-footer">' +
      (actionBusy ? '<span class="rooms-action-saving">Сохраняем…</span>' :
        '<button type="button" data-room-action="save-action">' +
          (actionMode === 'add-arrivals' ? 'Добавить в Заезды'
            : actionMode === 'add-departures' ? 'Добавить в Выезды' : 'Сохранить метки') +
        '</button>') +
      '</footer>'
    : '';
  backdrop.innerHTML =
    '<div class="rooms-detail-sheet" role="document">' +
      '<header class="rooms-detail-header"><div><span>' + title + '</span><h2>' + escapeHtml(room.number) +
      '</h2><p>' + escapeHtml([room.floor ? 'Этаж ' + room.floor : '', category].filter(Boolean).join(' · ')) +
      '</p></div><button type="button" data-room-detail-close aria-label="Закрыть">' + icon('x',20) + '</button></header>' +
      '<div class="rooms-detail-scroll">' + (actionMode ? renderActionContent() : renderHome(room)) + '</div>' +
      actionFooter +
    '</div>';
  backdrop.classList.remove('hidden');
  backdrop.setAttribute('aria-hidden','false');
  document.body.classList.add('rooms-modal-open');
  renderIcons();
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
    const latest = rooms.find(item => Number(item.id) === Number(selectedRoom.id));
    if (latest) selectedRoom = { ...selectedRoom, ...latest };
  }
}
async function refreshSelectedRoomFromServer(number) {
  await refreshRoomIndex();
  if (!selectedRoom || String(selectedRoom.number) !== String(number)) return;
  const [detail, statuses] = await Promise.all([
    api.get('rooms/' + Number(selectedRoom.id)),
    api.get('rooms/' + Number(selectedRoom.id) + '/product-statuses')
  ]);
  const indexRoom = rooms.find(item => String(item.number) === String(number)) || {};
  selectedRoom = { ...detail, lastDailyCheck: indexRoom.lastDailyCheck || null };
  selectedStatuses = Array.isArray(statuses) ? statuses : [];
  renderRoomDetails(selectedRoom);
}
async function openRoomDetails(id) {
  const backdrop = document.getElementById('roomDetailModal');
  if (!backdrop) return;
  const room = rooms.find(item => Number(item.id) === Number(id));
  if (!room) return;
  actionMode = '';
  actionError = '';
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
    renderStats();
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
  actionDraft = {};
}
function resetActionDraft(mode) {
  actionMode = mode;
  actionBusy = false;
  actionError = '';
  if (mode === 'add-arrivals') {
    actionDraft = { vip:false, empty:false, ready:false, time:'', comment:'' };
  } else if (mode === 'add-departures') {
    actionDraft = { arrival:false };
  } else if (mode === 'markers') {
    const number = String(selectedRoom?.number || '');
    const entry = currentArrivalEntry(number);
    const onArrival = (departureList?.arrivalRooms || []).map(String).includes(number);
    actionDraft = {
      vip: entry.vip === true,
      empty: entry.empty === true,
      ready: entry.ready === true,
      time: entry.time || '',
      comment: entry.comment || '',
      arrival: onArrival
    };
  }
  renderRoomDetails(selectedRoom);
}
async function loadRooms() {
  loading = true;
  loadError = '';
  renderRoomGroups();
  try {
    const roomResult = await api.get('rooms');
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
async function addRoomToArrivals() {
  if (!selectedRoom || actionBusy) return;
  const number = String(selectedRoom.number);
  if (isCheckedToday(number)) {
    actionError = 'Номер уже проверен сегодня и не может быть добавлен повторно.';
    renderRoomDetails(selectedRoom);
    return;
  }
  actionBusy = true;
  actionError = '';
  renderRoomDetails(selectedRoom);
  try {
    await api.post('arrivals/session/rooms', {
      numbers: [number],
      entries: { [number]: { ...actionDraft } }
    });
    await refreshRoomIndex();
    actionMode = '';
    actionDraft = {};
    renderRoomDetails(selectedRoom);
  } catch (error) {
    actionError = error.message || 'Не удалось добавить номер в Заезды';
    renderRoomDetails(selectedRoom);
  } finally {
    actionBusy = false;
    if (selectedRoom) renderRoomDetails(selectedRoom);
  }
}
async function addRoomToDepartures() {
  if (!selectedRoom || actionBusy) return;
  const number = String(selectedRoom.number);
  if (isCheckedToday(number)) {
    actionError = 'Номер уже проверен сегодня и не может быть добавлен повторно.';
    renderRoomDetails(selectedRoom);
    return;
  }
  actionBusy = true;
  actionError = '';
  renderRoomDetails(selectedRoom);
  try {
    await api.patch('departures/miniapp-list/room', {
      number, action:'add', arrival: actionDraft.arrival === true
    });
    await refreshRoomIndex();
    actionMode = '';
    actionDraft = {};
    renderRoomDetails(selectedRoom);
  } catch (error) {
    actionError = error.message || 'Не удалось добавить номер в Выезды';
    renderRoomDetails(selectedRoom);
  } finally {
    actionBusy = false;
    if (selectedRoom) renderRoomDetails(selectedRoom);
  }
}
async function saveRoomMarkers() {
  if (!selectedRoom || actionBusy) return;
  const number = String(selectedRoom.number);
  const inArr = isInArrivalList(number);
  const inDep = isInDepartureList(number);
  actionBusy = true;
  actionError = '';
  renderRoomDetails(selectedRoom);
  try {
    if (inArr) {
      for (const field of ['vip','empty','ready','time','comment']) {
        const value = actionDraft[field] ?? (field === 'time' || field === 'comment' ? '' : false);
        const saved = await api.patch('arrivals/miniapp-list/room', { number, field, value });
        if (saved?.list) arrivalList = saved.list;
      }
    }
    if (inDep) {
      const result = await api.patch('departures/miniapp-list/room', {
        number, action:'arrival', enabled: actionDraft.arrival === true
      });
      if (result?.list) departureList = result.list;
    }
    await refreshRoomIndex();
    actionMode = '';
    actionDraft = {};
  } catch (error) {
    actionError = error.message || 'Не удалось сохранить метки';
  } finally {
    actionBusy = false;
    if (selectedRoom) renderRoomDetails(selectedRoom);
  }
}
function openCameraForRoom() {
  if (!selectedRoom) return;
  setState({
    screen:'camera',
    moreItem:null,
    cameraSourceListType:'room-single',
    cameraSelectedRoomNumber:String(selectedRoom.number)
  });
}
function beginRoomAction(mode) {
  if (!selectedRoom || actionBusy) return;
  if (mode === 'deadlines' || mode === 'refill') {
    void openSharedRoomActionModal(
      selectedRoom.number,
      mode,
      selectedRoom,
      refillForRoom(selectedRoom),
      refreshSelectedRoomFromServer
    );
    return;
  }
  resetActionDraft(mode);
}
export function renderRooms() {
  return '<div class="screen screen-rooms">' + pageHeader({ title: 'Номера' }) +
    '<section class="rooms-directory-summary rooms-directory-summary-work">' +
      '<div><span>Пустые</span><strong id="roomsCountEmpty">—</strong></div>' +
      '<div><span>В Заездах</span><strong id="roomsCountArrivals">—</strong></div>' +
      '<div><span>В Выездах</span><strong id="roomsCountDepartures">—</strong></div>' +
    '</section>' +
    '<label class="rooms-directory-search"><span>' + icon('search',17) + '</span><input id="roomsSearch" type="search" value="' + escapeHtml(searchQuery) + '" placeholder="Номер, этаж или категория" autocomplete="off"></label>' +
    '<div class="rooms-filter-row" id="roomsFilterRow"></div>' +
    '<div id="roomsDirectoryContent" class="rooms-directory-content"></div>' +
    '<div id="roomDetailModal" class="rooms-detail-backdrop hidden" aria-hidden="true"></div>' +
    renderSharedRoomActionModals() +
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
  const field = target.closest('[data-room-marker-field]');
  if (!field) return false;
  const name = String(field.dataset.roomMarkerField || '');
  if (!name) return false;
  actionDraft[name] = field.type === 'checkbox' ? field.checked : String(field.value || '');
  return true;
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
  const action = target.closest('[data-room-action]');
  if (action) {
    const name = action.dataset.roomAction;
    if (name === 'back') {
      actionMode = '';
      actionDraft = {};
      actionError = '';
      renderRoomDetails(selectedRoom);
    } else if (name === 'deadlines' || name === 'refill' || name === 'markers') {
      beginRoomAction(name);
    } else if (name === 'add-arrivals' && !isCheckedToday(selectedRoom?.number) && !isInArrivalList(selectedRoom?.number)) {
      beginRoomAction('add-arrivals');
    } else if (name === 'add-departures' && !isCheckedToday(selectedRoom?.number) && !isInDepartureList(selectedRoom?.number)) {
      beginRoomAction('add-departures');
    } else if (name === 'open-camera') {
      openCameraForRoom();
    } else if (name === 'save-action') {
      if (actionMode === 'add-arrivals') void addRoomToArrivals();
      else if (actionMode === 'add-departures') void addRoomToDepartures();
      else if (actionMode === 'markers') void saveRoomMarkers();
    }
    return true;
  }
  if (target.closest('[data-room-detail-close]') || target.id === 'roomDetailModal') {
    closeRoomDetails();
    return true;
  }
  return false;
}
