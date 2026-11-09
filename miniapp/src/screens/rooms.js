import { api } from '../core/api.js';
import { pageHeader } from '../components/chrome.js';
import { icon, renderIcons } from '../components/icons.js';

let rooms = [];
let loading = false;
let loaded = false;
let loadError = '';
let searchQuery = '';
let activeFilter = 'all';
let selectedRoom = null;
let selectedStatuses = [];

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

function statusInfo(status) {
  return STATUS[status] || STATUS.neutral;
}
function roomProducts(room) {
  const items = room?.template?.items || [];
  return items.filter(item => item.product && item.product.isActive !== false);
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
function renderRoomCard(room) {
  const status = statusInfo(room.expiryStatus);
  const products = roomProducts(room);
  const category = CATEGORIES[room.category] || room.category || 'Без категории';
  return '<button type="button" class="rooms-directory-card status-' + status.tone +
    '" data-room-open="' + Number(room.id) + '">' +
    '<span class="rooms-directory-number">' + escapeHtml(room.number) + '</span>' +
    '<span class="rooms-directory-copy"><strong>' + escapeHtml(category) + '</strong>' +
      '<small>' + products.length + ' позиций в комплектации</small></span>' +
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
function renderRoomDetails(room, statuses) {
  const backdrop = document.getElementById('roomDetailModal');
  if (!backdrop) return;
  const status = statusInfo(room.expiryStatus);
  const category = CATEGORIES[room.category] || room.category || 'Без категории';
  const products = roomProducts(room);
  const statusMap = new Map((statuses || []).map(item => [Number(item.productId), item]));
  const productsHtml = products.length
    ? products.map(item => {
        const product = item.product;
        const mark = statusMap.get(Number(product.id));
        return '<div class="rooms-detail-product"><span class="rooms-detail-emoji">' +
          escapeHtml(product.emoji || product.name?.charAt(0) || '•') + '</span>' +
          '<span class="rooms-detail-product-copy"><strong>' + escapeHtml(product.name) + '</strong><small>' +
          escapeHtml([product.volume != null ? product.volume : '', product.unit || 'шт'].filter(Boolean).join(' ')) +
          '</small></span><span class="rooms-detail-qty">' + Number(item.qty || 1) + ' шт.</span>' +
          (mark && Number(mark.qtyToReplace) > 0
            ? '<span class="rooms-detail-replace">Заменить: ' + Number(mark.qtyToReplace) + '</span>' : '') +
        '</div>';
      }).join('')
    : '<div class="rooms-detail-empty">Шаблон наполнения не задан.</div>';
  const statusHtml = (statuses || []).filter(item => Number(item.qtyToReplace) > 0).map(item =>
    '<div class="rooms-detail-status-row"><span>' + escapeHtml(item.product?.name || 'Продукт') +
    '</span><strong>' + Number(item.qtyToReplace) + ' шт.</strong></div>'
  ).join('');
  backdrop.innerHTML =
    '<div class="rooms-detail-sheet" role="document">' +
      '<header class="rooms-detail-header"><div><span>НОМЕР</span><h2>' + escapeHtml(room.number) +
      '</h2><p>' + escapeHtml([room.floor ? 'Этаж ' + room.floor : '', category].filter(Boolean).join(' · ')) +
      '</p></div><button type="button" data-room-detail-close aria-label="Закрыть">' + icon('x',20) + '</button></header>' +
      '<div class="rooms-detail-scroll">' +
        '<section class="rooms-detail-status-card status-' + status.tone + '"><span>Состояние сроков</span><strong>' +
          escapeHtml(status.label) + '</strong></section>' +
        (statusHtml ? '<section class="rooms-detail-section"><h3>Требуют замены</h3>' + statusHtml + '</section>' : '') +
        '<section class="rooms-detail-section"><h3>Комплектация <small>' + products.length + '</small></h3>' +
          '<div class="rooms-detail-products">' + productsHtml + '</div></section>' +
      '</div>' +
      '<footer class="rooms-detail-footer"><button type="button" data-room-detail-close>Готово</button></footer>' +
    '</div>';
  backdrop.classList.remove('hidden');
  backdrop.setAttribute('aria-hidden','false');
  document.body.classList.add('rooms-modal-open');
  renderIcons();
}
async function openRoomDetails(id) {
  const backdrop = document.getElementById('roomDetailModal');
  if (!backdrop) return;
  const room = rooms.find(item => Number(item.id) === Number(id));
  if (!room) return;
  backdrop.innerHTML = '<div class="rooms-detail-sheet rooms-detail-loading"><span class="rooms-loading-spinner"></span><strong>Загружаем номер…</strong></div>';
  backdrop.classList.remove('hidden');
  backdrop.setAttribute('aria-hidden','false');
  document.body.classList.add('rooms-modal-open');
  try {
    const [detail, statuses] = await Promise.all([
      api.get('rooms/' + Number(id)),
      api.get('rooms/' + Number(id) + '/product-statuses')
    ]);
    selectedRoom = detail || room;
    selectedStatuses = Array.isArray(statuses) ? statuses : [];
    renderRoomDetails(selectedRoom, selectedStatuses);
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
}
async function loadRooms() {
  loading = true;
  loadError = '';
  renderRoomGroups();
  try {
    const response = await api.get('rooms');
    rooms = Array.isArray(response) ? response : response?.rooms || [];
    rooms.sort((a,b) =>
      Number(a.floor || 0) - Number(b.floor || 0) ||
      Number(a.number) - Number(b.number));
    loaded = true;
  } catch (error) {
    loadError = error.message || 'Ошибка загрузки';
  } finally {
    loading = false;
    renderStats();
    renderFilters();
    renderRoomGroups();
  }
}
export function renderRooms() {
  return '<div class="screen screen-rooms">' + pageHeader({ title: 'Номера' }) +
    '<section class="rooms-directory-summary">' +
      '<div><span>Всего номеров</span><strong id="roomsCountTotal">—</strong></div>' +
      '<div><span>Пустые</span><strong id="roomsCountEmpty">—</strong></div>' +
      '<div><span>Требуют замены</span><strong id="roomsCountNeeds">—</strong></div>' +
    '</section>' +
    '<label class="rooms-directory-search"><span>' + icon('search',17) + '</span><input id="roomsSearch" type="search" placeholder="Номер, этаж или категория" autocomplete="off"></label>' +
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
}
export function handleRoomsInput(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target || target.id !== 'roomsSearch') return false;
  searchQuery = target.value || '';
  renderRoomGroups();
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
  if (target.closest('[data-room-detail-close]') || target.id === 'roomDetailModal') {
    closeRoomDetails();
    return true;
  }
  return false;
}
