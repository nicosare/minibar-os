import { api } from '../core/api.js';

const CATEGORIES = ['Дверца', 'Напитки', 'Алкоголь', 'Соки'];
const STATUS_CYCLE = ['pending', 'replenished', 'in_place', 'out', 'not_replenished'];
const STATUS_LABEL = {
  pending: 'Не отмечено',
  replenished: 'Пополнено',
  in_place: 'На месте',
  out: 'Выложили',
  not_replenished: 'Не пополнено'
};
const STATUS_CLASS = {
  pending: 'is-pending',
  replenished: 'is-replenished',
  in_place: 'is-in-place',
  out: 'is-out',
  not_replenished: 'is-not-replenished'
};
const MODES = [
  { key: 'dnd', label: 'DND' },
  { key: 'all_in_place', label: 'Всё на месте' },
  { key: 'all_out', label: 'Всё выложили' },
  { key: 'empty', label: 'Опустошён' }
];
const MODE_LABEL = {
  dnd: 'DND',
  all_in_place: 'Всё на месте',
  all_out: 'Всё выложили',
  empty: 'Опустошён',
  not_checked: 'Не проверен'
};

let rooms = [];
let drafts = [];
let completed = [];
let loaded = false;
let loading = false;
let loadError = '';
let notice = '';
let noticeIsError = false;
let mounted = false;
let lastLoadedAt = 0;
let rolloverTimer = null;
let focusBound = false;
let localEdits = new Set();
let factory = {
  roomId: null,
  input: '',
  counts: {},
  editId: null,
  mode: null,
  notes: '',
  sort: 'asc'
};
let roomHistory = {
  roomId: null,
  loading: false,
  items: [],
  error: ''
};

const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[character]));

function roomById(id) {
  return rooms.find(room => Number(room.id) === Number(id)) || null;
}

function localDayKey(value) {
  const date = value instanceof Date ? value : new Date(value || '');
  if (!Number.isFinite(date.getTime())) return '';
  return String(date.getFullYear()).padStart(4, '0') + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');
}

function isToday(value) {
  const key = localDayKey(value);
  return Boolean(key) && key === localDayKey(new Date());
}

function formatTime(value) {
  const date = new Date(value || '');
  return Number.isFinite(date.getTime())
    ? date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : '';
}

function formatDateTime(value) {
  const date = new Date(value || '');
  if (!Number.isFinite(date.getTime())) return 'Дата неизвестна';
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) +
    ' · ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function normalizeCheck(check) {
  const room = check.room || roomById(check.roomId);
  return {
    id: Number(check.id),
    roomId: Number(check.roomId),
    number: room ? String(room.number) : '—',
    date: check.checkDate || check.createdAt,
    mode: check.gihRoomStatus || null,
    notes: check.notes || '',
    noteDraft: check.notes || '',
    noteOpen: false,
    gihItems: (check.gihItems || []).map(item => {
      const hasSnapshot = item.productName !== null && item.productName !== undefined;
      const product = item.product || {};
      return {
        id: Number(item.id),
        productId: Number(item.productId),
        name: hasSnapshot ? item.productName : (product.name || 'Продукт'),
        emoji: hasSnapshot ? item.productEmoji : (product.emoji || null),
        bgColor: hasSnapshot ? item.productBgColor : (product.bgColor || 'slate'),
        itemStatus: item.itemStatus || 'pending'
      };
    })
  };
}

function productsDirty(draft) {
  return (draft.gihItems || []).some(item => item.itemStatus !== 'pending');
}

function canSave(draft) {
  return Boolean(draft.mode) ||
    ((draft.gihItems || []).length > 0 && draft.gihItems.every(item => item.itemStatus !== 'pending'));
}

function assignedModeStatus(mode) {
  if (mode === 'all_in_place') return 'in_place';
  if (mode === 'all_out') return 'out';
  return null;
}

function setNotice(message, isError = false) {
  notice = message || '';
  noticeIsError = Boolean(isError);
  renderWorkspace();
}

function renderNotice() {
  if (!notice) return '';
  return '<div class="gih-notice' + (noticeIsError ? ' is-error' : '') + '">' + escapeHtml(notice) + '</div>';
}

function normalizeCategory(category) {
  return category || 'Напитки';
}

function productEmoji(product) {
  return product.emoji || (product.name ? String(product.name).slice(0, 1) : '•');
}

function renderProductRow(item) {
  const product = item.product || {};
  const productId = Number(item.productId || product.id);
  const count = Number(factory.counts[productId] || 0);
  const max = Math.max(1, Number.parseInt(item.qty, 10) || 1);
  const bg = String(product.bgColor || 'slate').toLowerCase();
  return '<div class="gih-product-row">' +
    '<button type="button" class="gih-product-main" data-gih-action="increment" data-product-id="' + productId +
      '" data-max="' + max + '"' + (count >= max ? ' disabled' : '') + '>' +
      '<span class="gih-product-emoji" data-color="' + escapeHtml(bg) + '">' + escapeHtml(productEmoji(product)) + '</span>' +
      '<span class="gih-product-copy"><strong>' + escapeHtml(product.name || 'Продукт') + '</strong>' +
        '<small>В шаблоне: ' + max + '</small></span>' +
      '<span class="gih-product-selected">' + count + '</span></button>' +
    '<span class="gih-stepper">' +
      '<button type="button" data-gih-action="decrement" data-product-id="' + productId + '"' +
        (count <= 0 ? ' disabled' : '') + ' aria-label="Уменьшить количество">−</button>' +
      '<b>' + count + '</b>' +
      '<button type="button" data-gih-action="increment" data-product-id="' + productId + '" data-max="' + max + '"' +
        (count >= max ? ' disabled' : '') + ' aria-label="Увеличить количество">+</button>' +
    '</span></div>';
}


function renderFactoryProducts(room) {
  if (!room) {
    const value = String(factory.input || '').trim();
    if (!value) return '<div class="gih-factory-empty">Введи номер комнаты, чтобы загрузить её шаблон наполнения.</div>';
    return '<div class="gih-factory-empty is-error">Номер комнаты не найден.</div>';
  }

  const sourceItems = room.template && Array.isArray(room.template.items) ? room.template.items : [];
  const groupedItems = new Map();
  sourceItems.forEach(item => {
    const product = item.product || {};
    const productId = Number(item.productId || product.id);
    if (!productId) return;
    const key = String(productId);
    if (!groupedItems.has(key)) {
      groupedItems.set(key, { ...item, productId, product, qty: 0 });
    }
    const grouped = groupedItems.get(key);
    grouped.qty += Math.max(1, Number.parseInt(item.qty, 10) || 1);
  });
  const templateItems = [...groupedItems.values()];
  if (!templateItems.length) {
    return '<div class="gih-factory-empty">Для номера ' + escapeHtml(room.number) +
      ' не настроен шаблон наполнения.</div>';
  }

  const grouped = new Map();
  templateItems.forEach(item => {
    const category = normalizeCategory(item.product && item.product.category);
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push(item);
  });
  const categories = [
    ...CATEGORIES.filter(category => grouped.has(category)),
    ...[...grouped.keys()].filter(category => !CATEGORIES.includes(category)).sort()
  ];
  return '<details class="gih-products-dropdown"><summary><span>Все продукты</span><strong>' + templateItems.length + '</strong></summary>' +
    '<div class="gih-products-dropdown-body">' + categories.map(category =>
      '<section class="gih-product-category"><h4>' + escapeHtml(category) + '</h4>' +
      grouped.get(category).map(renderProductRow).join('') + '</section>'
    ).join('') + '</div></details>';
}


function historySummary(item) {
  if (item.type === 'gih') {
    return 'GIH · ' + (MODE_LABEL[item.gihRoomStatus] || 'Проверка');
  }
  if (item.type === 'emptied' || item.type === 'vk_emptied') return 'Опустошение';
  if (item.type === 'deadline') return 'Сроки';
  return 'Проверка';
}

function renderRoomHistory() {
  if (!factory.roomId) return '';
  if (roomHistory.roomId !== Number(factory.roomId)) return '';
  if (roomHistory.loading) return '<div class="gih-room-history">Загружаем историю номера…</div>';
  if (roomHistory.error) return '<div class="gih-room-history">История номера недоступна.</div>';
  if (!roomHistory.items.length) return '<div class="gih-room-history">Истории по этому номеру пока нет.</div>';
  return '<div class="gih-room-history"><div class="gih-room-history-title">Последние операции</div>' +
    roomHistory.items.slice(0, 3).map(item =>
      '<div class="gih-room-history-item"><span>' + escapeHtml(formatDateTime(item.checkDate || item.createdAt)) +
      '</span><strong>' + escapeHtml(historySummary(item)) + '</strong></div>'
    ).join('') + '</div>';
}

function renderFactory() {
  const room = factory.roomId ? roomById(factory.roomId) : null;
  const total = Object.values(factory.counts).reduce((sum, count) => sum + (Number(count) || 0), 0);
  const editing = Boolean(factory.editId);
  return '<section class="gih-panel gih-factory">' +
    '<div class="gih-panel-heading"><div><span class="gih-kicker">' +
      (editing ? 'РЕДАКТИРОВАНИЕ' : 'НОВАЯ ПРОВЕРКА') +
      '</span><h3>' + (editing ? 'Изменить черновик' : 'Собрать мини-бар') + '</h3></div>' +
      (editing ? '<button type="button" class="gih-text-button" data-gih-action="cancel-edit">Отмена</button>' : '') +
    '</div>' +
    '<label class="gih-room-input"><span>Номер комнаты</span><input type="text" inputmode="numeric" autocomplete="off" maxlength="4" ' +
      'data-gih-input="room" list="gih-room-options" value="' + escapeHtml(factory.input) + '" placeholder="Например, 204"></label>' +
    '<datalist id="gih-room-options">' + rooms.slice().sort((a, b) => (factory.sort === 'desc' ? Number(b.number) - Number(a.number) : Number(a.number) - Number(b.number))).map(item => '<option value="' + escapeHtml(item.number) + '"></option>').join('') + '</datalist>' +
    '<label class="gih-room-sort"><span>Порядок номеров</span><select data-gih-sort><option value="asc"' + (factory.sort !== 'desc' ? ' selected' : '') + '>По возрастанию</option><option value="desc"' + (factory.sort === 'desc' ? ' selected' : '') + '>По убыванию</option></select></label>' +
    (room ? '<div class="gih-selected-room"><span class="gih-room-dot"></span> Номер ' +
      escapeHtml(room.number) + (room.floor ? ' · этаж ' + escapeHtml(room.floor) : '') + '</div>' : '') +
    '<div class="gih-factory-products">' + renderFactoryProducts(room) + '</div>' +
    renderRoomHistory() +
    (editing && factory.mode ? '<div class="gih-edit-mode-note">Режим проверки: <strong>' +
      escapeHtml(MODE_LABEL[factory.mode] || factory.mode) + '</strong></div>' : '') +
    (editing && factory.notes ? '<div class="gih-edit-mode-note">Комментарий сохранится вместе с черновиком.</div>' : '') +
    '<div class="gih-factory-footer"><span>Выбрано: <strong>' + total + '</strong></span>' +
      '<button type="button" data-gih-action="create" ' + (!room || total <= 0 ? 'disabled' : '') + '>' +
        (editing ? 'Сохранить изменения' : 'Создать черновик') + '</button></div>' +
  '</section>';
}

function renderStatusPill(item, disabled, mode) {
  const status = assignedModeStatus(mode) || item.itemStatus || 'pending';
  return '<button type="button" class="gih-status-pill ' + (STATUS_CLASS[status] || STATUS_CLASS.pending) +
    '" data-gih-action="cycle-status" data-item-id="' + item.id + '"' +
    (disabled ? ' disabled' : '') + ' title="' + escapeHtml(STATUS_LABEL[status]) + '">' +
    '<span class="gih-status-emoji">' + escapeHtml(item.emoji || item.name.slice(0, 1)) + '</span>' +
    '<span class="gih-status-name">' + escapeHtml(item.name) + '</span>' +
    '<span class="gih-status-label">' + escapeHtml(STATUS_LABEL[status]) + '</span></button>';
}

function renderModes(draft) {
  const dirty = productsDirty(draft);
  return '<div class="gih-modes">' + MODES.map(mode =>
    '<button type="button" class="gih-mode-button' + (draft.mode === mode.key ? ' is-active mode-' + mode.key : '') + '"' +
      ' data-gih-action="set-mode" data-mode="' + mode.key + '"' +
      (dirty ? ' disabled' : '') + '>' + escapeHtml(mode.label) + '</button>'
  ).join('') + '</div>';
}

function renderNoteEditor(draft) {
  if (!draft.noteOpen) {
    return '<button type="button" class="gih-note-toggle" data-gih-action="toggle-note" data-id="' + draft.id + '">' +
      (draft.notes ? escapeHtml(draft.notes) : 'Добавить комментарий') + '</button>';
  }
  return '<div class="gih-note-editor"><textarea rows="2" maxlength="500" data-gih-note="' + draft.id + '" ' +
    'placeholder="Комментарий к номеру">' + escapeHtml(draft.noteDraft || draft.notes || '') + '</textarea>' +
    '<div><button type="button" data-gih-action="cancel-note" data-id="' + draft.id + '">Отмена</button>' +
    '<button type="button" class="is-primary" data-gih-action="save-note" data-id="' + draft.id + '">Сохранить комментарий</button></div></div>';
}

function renderDraft(draft) {
  const statuses = (draft.gihItems || []).length
    ? draft.gihItems.map(item => renderStatusPill(item, Boolean(draft.mode), draft.mode)).join('')
    : '<div class="gih-empty-products">В записи нет продуктов.</div>';
  return '<article class="gih-record-card" data-gih-id="' + draft.id + '">' +
    '<div class="gih-record-heading"><div><strong class="gih-record-room">' + escapeHtml(draft.number) + '</strong>' +
      '<span class="gih-record-time">' + escapeHtml(formatTime(draft.date)) + '</span></div>' +
      '<div class="gih-record-actions">' +
        '<button type="button" data-gih-action="edit" data-id="' + draft.id + '" aria-label="Редактировать черновик">Изменить</button>' +
        '<button type="button" data-gih-action="delete" data-id="' + draft.id + '" aria-label="Удалить черновик">Удалить</button>' +
      '</div></div>' +
    '<div class="gih-status-list">' + statuses + '</div>' +
    renderModes(draft) +
    renderNoteEditor(draft) +
    '<div class="gih-status-legend"><span><i class="is-replenished"></i>Пополнено</span>' +
      '<span><i class="is-in-place"></i>На месте</span><span><i class="is-out"></i>Выложили</span>' +
      '<span><i class="is-not-replenished"></i>Не пополнено</span></div>' +
    (canSave(draft) ? '<div class="gih-record-footer"><button type="button" data-gih-action="save" data-id="' +
      draft.id + '">Сохранить проверку</button></div>' : '') +
  '</article>';
}

function formatDoneItems(items, mode) {
  const groups = {};
  (items || []).forEach(item => {
    const status = assignedModeStatus(mode) || item.itemStatus || 'pending';
    groups[status] = groups[status] || {};
    groups[status][item.name] = (groups[status][item.name] || 0) + 1;
  });
  const order = ['replenished', 'in_place', 'out', 'not_replenished', 'pending'];
  return order.filter(status => groups[status]).map(status => {
    const products = Object.entries(groups[status]).map(([name, qty]) =>
      escapeHtml(name) + (qty > 1 ? ' ×' + qty : '')
    ).join(', ');
    return '<div class="gih-done-line ' + (STATUS_CLASS[status] || '') + '">' +
      '<strong>' + escapeHtml(STATUS_LABEL[status] || status) + '</strong><span>' + products + '</span></div>';
  }).join('');
}

function renderCompleted(record) {
  const assigned = assignedModeStatus(record.mode);
  const modeLabel = record.mode && !assigned ? MODE_LABEL[record.mode] : '';
  const productCounts = {};
  (record.gihItems || []).forEach(item => {
    productCounts[item.name] = (productCounts[item.name] || 0) + 1;
  });
  const productSummary = Object.entries(productCounts).map(([name, qty]) =>
    escapeHtml(name) + (qty > 1 ? ' ×' + qty : '')
  ).join(', ');
  const productContent = modeLabel
    ? (productSummary ? '<div class="gih-mode-product-summary">' + productSummary + '</div>' : '<span>Нет данных о позициях</span>')
    : (formatDoneItems(record.gihItems, record.mode) || '<span>Нет данных о позициях</span>');
  return '<article class="gih-record-card gih-completed-card">' +
    '<div class="gih-record-heading"><div><strong class="gih-record-room">' + escapeHtml(record.number) + '</strong>' +
      '<span class="gih-record-time">' + escapeHtml(formatTime(record.date)) + '</span></div>' +
      '<button type="button" class="gih-delete-completed" data-gih-action="delete" data-id="' + record.id + '">Удалить</button></div>' +
    (modeLabel ? '<div class="gih-completed-mode">' + escapeHtml(modeLabel) + '</div>' : '') +
    '<div class="gih-done-products">' + productContent + '</div>' +
    (record.notes ? '<div class="gih-done-note">' + escapeHtml(record.notes) + '</div>' : '') +
  '</article>';
}

function normalizeRoomType(room) {
  const values = [room && room.category, room && room.roomCategory, room && room.roomType, room && room.type]
    .filter(value => value != null && String(value).trim() !== '')
    .map(value => String(value).trim().toLocaleLowerCase('ru-RU'));
  const suitePattern = /люкс|suite|lux|deluxe|апартамент|apartment|junior|полулюкс|президентск|presidential|^l$|^lx$/iu;
  return values.some(value => suitePattern.test(value)) ? 'suite' : 'standard';
}

function registerBasketTemplate(templateByType, type, items) {
  if (!Array.isArray(items) || !items.length) return;
  const recipe = new Map();
  for (const item of items) {
    const productId = Number(item.productId || (item.product && item.product.id)) || 0;
    const key = String(productId);
    const qty = Math.max(0, Number(item.qty) || 0);
    if (key === '0' || !qty) continue;
    recipe.set(key, (recipe.get(key) || 0) + qty);
  }
  if (!recipe.size) return;
  const signature = [...recipe.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, qty]) => key + '=' + qty).join('|');
  const recipes = templateByType.get(type) || new Map();
  if (!recipes.has(signature)) recipes.set(signature, recipe);
  templateByType.set(type, recipes);
}

function finalizeBasketProductTotals(groupedProducts, templateByType) {
  const basketCounts = { standard: 0, suite: 0 };
  for (const type of ['standard', 'suite']) {
    const recipes = templateByType.get(type);
    if (!recipes || !recipes.size) continue;
    const orderedRecipes = [...recipes.values()].sort((a, b) => b.size - a.size);
    for (const recipe of orderedRecipes) {
      const possible = Math.min(...[...recipe.entries()].map(([key, qty]) => {
        const product = groupedProducts.get(key);
        return product ? Math.floor(product.qty / qty) : 0;
      }));
      if (!Number.isFinite(possible) || possible <= 0) continue;
      basketCounts[type] += possible;
      for (const [key, qty] of recipe) {
        const product = groupedProducts.get(key);
        if (product) product.qty -= qty * possible;
      }
    }
  }

  const result = [];
  for (const type of ['standard', 'suite']) {
    const qty = basketCounts[type];
    if (qty > 0) result.push({
      name: type === 'suite' ? 'Корзинка люкс' : 'Корзинка стандарт',
      qty,
      basket: true,
      bgColor: 'yellow'
    });
  }
  [...groupedProducts.values()].filter(product => product.qty > 0)
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'))
    .forEach(product => result.push({ ...product, basket: false }));
  return result;
}

function renderGihProductSummary() {
  const latestDraftByRoom = new Map();
  for (const draft of drafts) {
    const number = String(draft.number);
    const current = latestDraftByRoom.get(number);
    if (!current || new Date(draft.date || 0).getTime() > new Date(current.date || 0).getTime()) {
      latestDraftByRoom.set(number, draft);
    }
  }

  const groupedProducts = new Map();
  const templateByType = new Map();
  for (const draft of latestDraftByRoom.values()) {
    const room = roomById(draft.roomId) || rooms.find(item => String(item.number) === String(draft.number));
    registerBasketTemplate(templateByType, normalizeRoomType(room), room && room.template && room.template.items || []);
    for (const item of draft.gihItems || []) {
      const name = String(item.name || 'Продукт');
      const productId = Number(item.productId) || 0;
      const key = productId > 0 ? String(productId) : 'name:' + name.toLocaleLowerCase('ru-RU');
      if (!groupedProducts.has(key)) {
        groupedProducts.set(key, {
          productId: productId || null,
          name,
          emoji: item.emoji || name.charAt(0).toUpperCase(),
          bgColor: item.bgColor || 'slate',
          qty: 0
        });
      }
      groupedProducts.get(key).qty += 1;
    }
  }

  const products = finalizeBasketProductTotals(groupedProducts, templateByType);
  const heading = '<div class="gih-section-heading"><h3>Продукты GIH</h3><span>' +
    latestDraftByRoom.size + ' номеров</span></div>';
  if (!products.length) {
    return '<section class="gih-record-section gih-products-section">' + heading +
      '<div class="gih-section-empty"><strong>Пока нет продуктов</strong><span>Создай черновики GIH, чтобы собрать общий список.</span></div></section>';
  }

  const basketIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 10 2 10h12l2-10H4Z"/><path d="m8 10 4-6 4 6M8 14v3M12 14v3M16 14v3"/></svg>';
  const productRows = products.map(product => {
    const basket = Boolean(product.basket);
    const icon = basket ? basketIcon : escapeHtml(product.emoji || String(product.name || '?').charAt(0));
    return '<div class="gih-list-product' + (basket ? ' is-basket' : '') + '">' +
      '<span class="gih-list-product-icon' + (basket ? ' is-basket' : '') + '">' + icon + '</span>' +
      '<span class="gih-list-product-name">' + escapeHtml(product.name) + '</span>' +
      '<strong class="gih-list-product-qty">' + product.qty + ' шт.</strong></div>';
  }).join('');
  return '<section class="gih-record-section gih-products-section">' + heading +
    '<div class="gih-list-products">' + productRows + '</div></section>';
}

function workspaceContent() {
  if (loading && !loaded) {
    return '<div class="gih-loading"><span class="list-loading-spinner"></span> Загружаем GIH</div>';
  }
  if (loadError && !loaded) {
    return '<div class="gih-loading gih-load-error"><strong>' + escapeHtml(loadError) +
      '</strong><button type="button" data-gih-action="retry">Повторить</button></div>';
  }
  const total = drafts.length + completed.length;
  return '<div class="gih-summary"><div><strong>' + drafts.length + '</strong><span>черновики</span></div>' +
    '<div><strong>' + completed.length + '</strong><span>сохранено сегодня</span></div></div>' +
    renderNotice() +
    '<div id="gih-factory-root">' + renderFactory() + '</div>' +
    renderGihProductSummary() +
    '<section class="gih-record-section"><div class="gih-section-heading"><h3>Активные проверки</h3>' +
      '<span>' + drafts.length + '</span></div>' +
      (drafts.length ? drafts.map(renderDraft).join('') :
        '<div class="gih-section-empty">' + (total ? 'Активных черновиков нет.' : 'Пока нет проверок за сегодня.') + '</div>') +
    '</section>' +
    (completed.length ? '<section class="gih-record-section"><div class="gih-section-heading"><h3>Сохранённые</h3>' +
      '<span>' + completed.length + '</span></div>' + completed.map(renderCompleted).join('') + '</section>' : '');
}

function renderWorkspace() {
  const root = document.getElementById('gih-workspace');
  if (root) root.innerHTML = workspaceContent();
}

function renderFactoryPreservingFocus() {
  const input = document.querySelector('[data-gih-input="room"]');
  const keepFocus = Boolean(input && document.activeElement === input);
  const start = input ? input.selectionStart : 0;
  const end = input ? input.selectionEnd : 0;
  const root = document.getElementById('gih-factory-root');
  if (!root) {
    renderWorkspace();
    return;
  }
  root.innerHTML = renderFactory();
  if (keepFocus) {
    const next = document.querySelector('[data-gih-input="room"]');
    if (next) {
      next.focus();
      try { next.setSelectionRange(start, end); } catch (_) {}
    }
  }
}

async function loadRoomHistory(roomId) {
  const id = Number(roomId);
  roomHistory = { roomId: id, loading: true, items: [], error: '' };
  renderFactoryPreservingFocus();
  try {
    const response = await api.get('checks/history?operation=room&roomId=' + encodeURIComponent(id));
    if (Number(factory.roomId) !== id) return;
    const items = Array.isArray(response) ? response : (Array.isArray(response && response.items) ? response.items : []);
    roomHistory = { roomId: id, loading: false, items: items.slice(0, 3), error: '' };
  } catch (_) {
    roomHistory = { roomId: id, loading: false, items: [], error: 'История недоступна' };
  }
  renderFactoryPreservingFocus();
}

async function loadGih() {
  if (loading) return;
  loading = true;
  loadError = '';
  const previousDrafts = new Map(drafts.map(draft => [draft.id, draft]));
  renderWorkspace();
  try {
    const results = await Promise.all([api.get('rooms'), api.get('checks?type=gih&_t=' + Date.now())]);
    rooms = Array.isArray(results[0]) ? results[0] : (results[0] && results[0].rooms) || [];
    rooms.sort((a, b) => Number(a.number) - Number(b.number));
    let all = Array.isArray(results[1]) ? results[1] : [];

    const today = localDayKey(new Date());
    const oldDrafts = all.filter(check => {
      if ((check.status || 'draft') !== 'draft') return false;
      const created = localDayKey(check.createdAt || check.checkDate);
      return Boolean(created) && created < today;
    });
    let archived = false;
    for (const check of oldDrafts) {
      try {
        await api.put('checks/' + Number(check.id), {
          status: 'done',
          gihRoomStatus: 'not_checked',
          notes: check.notes || null
        });
        archived = true;
        localEdits.delete(Number(check.id));
      } catch (error) {
        console.error('Не удалось перенести старый черновик GIH в историю:', check.id, error);
      }
    }
    if (archived) {
      const refreshed = await api.get('checks?type=gih&_t=' + Date.now());
      all = Array.isArray(refreshed) ? refreshed : all;
    }

    const nextDrafts = all.filter(check =>
      (check.status || 'draft') === 'draft' && isToday(check.createdAt || check.checkDate)
    ).map(normalizeCheck);
    const nextCompleted = all.filter(check =>
      (check.status || 'draft') === 'done' &&
      check.gihRoomStatus !== 'not_checked' &&
      isToday(check.checkDate || check.createdAt)
    ).map(normalizeCheck);

    const nextById = new Map(nextDrafts.map(draft => [draft.id, draft]));
    for (const id of [...localEdits]) {
      const remote = nextById.get(id);
      const local = previousDrafts.get(id);
      if (!remote || !local) {
        localEdits.delete(id);
        continue;
      }
      nextById.set(id, {
        ...remote,
        ...local,
        id: remote.id,
        roomId: remote.roomId,
        number: remote.number,
        date: remote.date
      });
    }
    drafts = nextDrafts.map(draft => nextById.get(draft.id) || draft);
    completed = nextCompleted;
    loaded = true;
    lastLoadedAt = Date.now();

    const typed = String(factory.input || '').trim();
    const exact = typed ? rooms.find(room => String(room.number) === typed) : null;
    if (!factory.roomId && exact) {
      factory.roomId = Number(exact.id);
      factory.counts = {};
      void loadRoomHistory(factory.roomId);
    }
    loadError = '';
    renderWorkspace();
  } catch (error) {
    loadError = error.message || 'Не удалось загрузить GIH.';
    if (loaded) {
      notice = loadError;
      noticeIsError = true;
    }
    renderWorkspace();
  } finally {
    loading = false;
    renderWorkspace();
  }
}

async function createFactory() {
  const room = roomById(factory.roomId);
  if (!room) return;
  const items = Object.entries(factory.counts)
    .map(([productId, qty]) => ({ productId: Number(productId), qty: Number(qty) }))
    .filter(item => item.productId > 0 && item.qty > 0);
  if (!items.length) {
    setNotice('Добавь хотя бы одну позицию.', true);
    return;
  }

  const submit = document.querySelector('[data-gih-action="create"]');
  if (submit) submit.disabled = true;
  try {
    if (factory.editId) {
      await api.put('checks/' + Number(factory.editId), {
        roomId: Number(factory.roomId),
        gihItems: items,
        status: 'draft',
        gihRoomStatus: factory.mode || null,
        notes: String(factory.notes || '').trim() || null
      });
      localEdits.delete(Number(factory.editId));
      notice = 'Черновик обновлён.';
    } else {
      await api.post('checks', {
        roomId: Number(factory.roomId),
        type: 'gih',
        status: 'draft',
        gihItems: items
      });
      notice = 'Черновик создан.';
    }
    noticeIsError = false;
    const savedRoomId = factory.roomId;
    factory = { roomId: null, input: '', counts: {}, editId: null, mode: null, notes: '' };
    roomHistory = { roomId: null, loading: false, items: [], error: '' };
    await loadGih();
    if (savedRoomId) {
      // The next record starts clean; history is fetched only after a room is selected again.
      roomHistory = { roomId: null, loading: false, items: [], error: '' };
    }
    renderWorkspace();
  } catch (error) {
    notice = error.message || 'Не удалось сохранить запись.';
    noticeIsError = true;
    renderWorkspace();
  } finally {
    const button = document.querySelector('[data-gih-action="create"]');
    if (button) button.disabled = false;
  }
}

function openDraftForEdit(id) {
  const draft = drafts.find(item => item.id === Number(id));
  if (!draft) return;
  const counts = {};
  draft.gihItems.forEach(item => {
    counts[item.productId] = (counts[item.productId] || 0) + 1;
  });
  factory = {
    editId: draft.id,
    roomId: draft.roomId,
    input: String(draft.number),
    counts,
    mode: draft.mode,
    notes: draft.notes || ''
  };
  roomHistory = { roomId: null, loading: false, items: [], error: '' };
  renderWorkspace();
  void loadRoomHistory(factory.roomId);
  const main = document.getElementById('appMain');
  if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
}

async function saveDraft(id) {
  const draft = drafts.find(item => item.id === Number(id));
  if (!draft || !canSave(draft)) return;
  const assigned = assignedModeStatus(draft.mode);
  const pills = assigned
    ? draft.gihItems.map(item => ({ id: item.id, itemStatus: assigned }))
    : (draft.mode ? [] : draft.gihItems.map(item => ({ id: item.id, itemStatus: item.itemStatus })));

  try {
    await api.put('checks/' + draft.id, {
      status: 'done',
      gihRoomStatus: draft.mode || null,
      notes: String(draft.notes || '').trim() || null,
      pills
    });
    localEdits.delete(draft.id);
    notice = 'Проверка номера ' + draft.number + ' сохранена.';
    noticeIsError = false;
    await loadGih();
    renderWorkspace();
  } catch (error) {
    notice = error.message || 'Не удалось сохранить проверку.';
    noticeIsError = true;
    renderWorkspace();
  }
}

async function saveNote(id) {
  const draft = drafts.find(item => item.id === Number(id));
  if (!draft) return;
  const next = String(draft.noteDraft || '').trim();
  draft.notes = next;
  draft.noteOpen = false;
  localEdits.add(draft.id);
  renderWorkspace();
  try {
    await api.put('checks/' + draft.id, { notes: next || null });
    localEdits.delete(draft.id);
    notice = 'Комментарий сохранён.';
    noticeIsError = false;
  } catch (error) {
    notice = error.message || 'Комментарий не удалось сохранить.';
    noticeIsError = true;
  }
  renderWorkspace();
}

async function deleteRecord(id) {
  const draft = drafts.find(item => item.id === Number(id));
  const record = draft || completed.find(item => item.id === Number(id));
  if (!record || !window.confirm('Удалить запись GIH для номера ' + record.number + '?')) return;
  try {
    await api.delete('checks/' + Number(id));
    localEdits.delete(Number(id));
    notice = 'Запись удалена.';
    noticeIsError = false;
    await loadGih();
  } catch (error) {
    notice = error.message || 'Не удалось удалить запись.';
    noticeIsError = true;
  }
  renderWorkspace();
}

function updateRoomFromInput(input) {
  const value = String(input.value || '').trim();
  factory.input = value;
  const room = value ? rooms.find(item => String(item.number) === value) : null;
  const nextId = room ? Number(room.id) : null;
  if (Number(factory.roomId) !== Number(nextId)) {
    factory.roomId = nextId;
    factory.counts = {};
    roomHistory = { roomId: nextId, loading: false, items: [], error: '' };
    renderFactoryPreservingFocus();
    if (nextId) void loadRoomHistory(nextId);
  }
}

export function renderGih() {
  return '<div id="gih-workspace" class="gih-workspace">' + workspaceContent() + '</div>';
}

function scheduleDayRollover() {
  if (rolloverTimer) window.clearTimeout(rolloverTimer);
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  rolloverTimer = window.setTimeout(() => {
    rolloverTimer = null;
    if (mounted) void loadGih();
    if (mounted) scheduleDayRollover();
  }, Math.max(1000, nextMidnight.getTime() - now.getTime()));
}

export function gihDidRender() {
  mounted = true;
  if (!rolloverTimer) scheduleDayRollover();
  if (!focusBound) {
    focusBound = true;
    window.addEventListener('focus', () => {
      if (mounted && Date.now() - lastLoadedAt > 15000) void loadGih();
    });
    document.addEventListener('visibilitychange', () => {
      if (mounted && !document.hidden && Date.now() - lastLoadedAt > 15000) void loadGih();
    });
  }
  if (!loaded && !loading) void loadGih();
  else if (Date.now() - lastLoadedAt > 30000 && !loading) void loadGih();
}

export function gihWillUnmount() {
  mounted = false;
  if (rolloverTimer) window.clearTimeout(rolloverTimer);
  rolloverTimer = null;
}

export function handleGihInput(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return false;
  if (target.dataset.gihInput === 'room') {
    updateRoomFromInput(target);
    return true;
  }
  if (target.matches('[data-gih-note]')) {
    const draft = drafts.find(item => item.id === Number(target.dataset.gihNote));
    if (draft) draft.noteDraft = target.value;
    return true;
  }
  return false;
}

export function handleGihClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return false;
  const button = target.closest('[data-gih-action]');
  if (!button) return false;
  const action = button.dataset.gihAction;
  const id = Number(button.dataset.id);

  if (action === 'retry') {
    loaded = false;
    loadError = '';
    void loadGih();
  } else if (action === 'increment' || action === 'decrement') {
    const productId = Number(button.dataset.productId);
    const max = Math.max(1, Number.parseInt(button.dataset.max, 10) || 1);
    const current = Number(factory.counts[productId] || 0);
    const next = action === 'increment' ? Math.min(max, current + 1) : Math.max(0, current - 1);
    factory.counts[productId] = next;
    renderFactoryPreservingFocus();
  } else if (action === 'create') {
    void createFactory();
  } else if (action === 'cancel-edit') {
    factory = { roomId: null, input: '', counts: {}, editId: null, mode: null, notes: '' };
    roomHistory = { roomId: null, loading: false, items: [], error: '' };
    renderWorkspace();
  } else if (action === 'cycle-status') {
    const draft = drafts.find(item => item.id === Number(button.closest('[data-gih-id]')?.dataset.gihId));
    const itemId = Number(button.dataset.itemId);
    const item = draft && draft.gihItems.find(row => row.id === itemId);
    if (draft && item && !draft.mode) {
      const index = STATUS_CYCLE.indexOf(item.itemStatus);
      item.itemStatus = STATUS_CYCLE[(index + 1) % STATUS_CYCLE.length];
      localEdits.add(draft.id);
      renderWorkspace();
    }
  } else if (action === 'set-mode') {
    const draft = drafts.find(item => item.id === Number(button.closest('[data-gih-id]')?.dataset.gihId));
    if (draft && !productsDirty(draft)) {
      const mode = button.dataset.mode;
      draft.mode = draft.mode === mode ? null : mode;
      localEdits.add(draft.id);
      renderWorkspace();
    }
  } else if (action === 'save') {
    void saveDraft(id);
  } else if (action === 'edit') {
    openDraftForEdit(id);
  } else if (action === 'delete') {
    void deleteRecord(id);
  } else if (action === 'toggle-note') {
    const draft = drafts.find(item => item.id === id);
    if (draft) {
      draft.noteOpen = true;
      draft.noteDraft = draft.notes || '';
      renderWorkspace();
    }
  } else if (action === 'cancel-note') {
    const draft = drafts.find(item => item.id === id);
    if (draft) {
      draft.noteOpen = false;
      draft.noteDraft = draft.notes || '';
      renderWorkspace();
    }
  } else if (action === 'save-note') {
    void saveNote(id);
  }
  return true;
}

export function handleGihChange(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return false;
  if (target.matches('[data-gih-sort]')) {
    factory.sort = target.value === 'desc' ? 'desc' : 'asc';
    renderFactoryPreservingFocus();
    return true;
  }
  if (!target.matches('[data-gih-note]')) return false;
  const draft = drafts.find(item => item.id === Number(target.dataset.gihNote));
  if (draft) draft.noteDraft = target.value;
  return true;
}
