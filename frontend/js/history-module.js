// МОДУЛЬ ИСТОРИИ ОПЕРАЦИЙ (HISTORY)
App.historyModule = (() => {
  const apiBase = () => String(window.API_BASE || '/api').replace(/\/$/, '');
  const { escapeHtml } = window.AppUtils;

  const PAGE_SIZE = 25;
  let checks = [];
  let currentPage = 1;
  let pageCount = 1;
  let totalCount = 0;
  let requestSequence = 0;
  let isInitialized = false;

  const GIH_MODES = {
    dnd: { label: 'DND', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
    all_in_place: { label: 'Всё на месте', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
    all_out: { label: 'Всё выложили', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    empty: { label: 'Опустошён', cls: 'bg-rose-50 text-rose-700 border-rose-200' }
  };

  const GIH_STATUSES = {
    replenished: { label: 'Пополнено', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    in_place: { label: 'На месте', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
    out: { label: 'Выложили', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    not_replenished: { label: 'Не пополнено', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    pending: { label: 'Не размечено', cls: 'bg-slate-100 text-slate-600 border-slate-200' }
  };

  const GIH_STATUS_ORDER = ['replenished', 'in_place', 'out', 'not_replenished', 'pending'];

  function isVkOperation(check) {
    return check.type === 'vk_room' || check.type === 'vk_emptied';
  }

  function operationMeta(check) {
    if (check.type === 'emptied' || check.type === 'vk_emptied') {
      return { label: 'Опустошение', cls: 'bg-rose-50 text-rose-700 border-rose-100' };
    }
    if (check.type === 'gih') {
      return { label: 'GIH', cls: 'bg-violet-50 text-violet-700 border-violet-100' };
    }
    return { label: 'Проверка', cls: 'bg-indigo-50 text-indigo-700 border-indigo-100' };
  }

  function statusMeta(status) {
    if (GIH_STATUSES[status]) return GIH_STATUSES[status];
    if (status === 'consumed' || status === 'emptied' || status === 'needs_replenishment') {
      return { label: 'Потребление', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    return GIH_STATUSES.pending;
  }

  function modeMeta(mode) {
    return GIH_MODES[mode] || {
      label: String(mode || ''),
      cls: 'bg-slate-100 text-slate-600 border-slate-200'
    };
  }

  function getProductList(check) {
    const counts = new Map();
    (check.gihItems || []).forEach(item => {
      const name = item.product ? item.product.name : 'Продукт';
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, qty]) =>
      qty > 1 ? name + ' ×' + qty : name
    );
  }

  function displayNotes(check) {
    let note = String(check.notes || '').trim();

    if (isVkOperation(check)) {
      const parenthetical = note.match(/\(([^)]*)\)\s*$/u);
      if (parenthetical) {
        note = parenthetical[1].trim();
      } else if (/^(?:\d{3,4}[\s,;:/|+_-]*)+(?:опустош\p{L}*)?$/iu.test(note)) {
        // Старые записи сохраняли исходное служебное сообщение целиком.
        note = '';
      }
    }

    const parts = [];
    if (note) parts.push(note);

    if (check.type === 'gih' && check.gihRoomStatus) {
      const products = getProductList(check);
      if (products.length) parts.push('Продукты: ' + products.join(', '));
    }

    return parts.join('\n');
  }

  function renderProducts(check) {
    if (check.type !== 'gih') return '<span class="text-slate-400">—</span>';

    if (check.gihRoomStatus) {
      const mode = modeMeta(check.gihRoomStatus);
      return '<span class="inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ' +
        mode.cls + '">' + escapeHtml(mode.label) + '</span>';
    }

    const groups = new Map();
    (check.gihItems || []).forEach(item => {
      const status = String(item.itemStatus || 'pending');
      const name = item.product ? item.product.name : 'Продукт';
      if (!groups.has(status)) groups.set(status, new Map());
      const products = groups.get(status);
      products.set(name, (products.get(name) || 0) + 1);
    });

    const statuses = GIH_STATUS_ORDER.filter(status => groups.has(status));
    if (!statuses.length) return '<span class="text-slate-400">—</span>';

    return '<div class="flex flex-col gap-1.5">' +
      statuses.map(status => {
        const meta = statusMeta(status);
        const products = Array.from(groups.get(status).entries()).map(([name, qty]) =>
          qty > 1 ? escapeHtml(name) + ' ×' + qty : escapeHtml(name)
        ).join(', ');
        return '<div class="flex items-start gap-2">' +
          '<span class="inline-flex shrink-0 items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold ' +
            meta.cls + '">' + escapeHtml(meta.label) + '</span>' +
          '<span class="text-sm text-slate-700 leading-5">' + products + '</span>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  function currentFilters() {
    const search = document.getElementById('history-search');
    const type = document.getElementById('history-type-filter');
    return {
      room: String(search ? search.value : '').replace(/\D/g, '').trim(),
      operation: String(type ? type.value : 'all')
    };
  }

  async function loadHistory() {
    const listContainer = document.getElementById('history-list-container');
    if (!listContainer) return;

    const sequence = ++requestSequence;
    const filters = currentFilters();
    const params = new URLSearchParams({
      page: String(currentPage),
      pageSize: String(PAGE_SIZE),
      operation: filters.operation
    });
    if (filters.room) params.set('room', filters.room);

    listContainer.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch(apiBase() + '/checks/history?' + params.toString(), {
        cache: 'no-store'
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'HTTP ' + response.status);
      }

      const data = await response.json();
      if (sequence !== requestSequence) return;

      checks = Array.isArray(data.items) ? data.items : [];
      totalCount = Number(data.total) || 0;
      pageCount = Math.max(1, Number(data.pageCount) || Math.ceil(totalCount / PAGE_SIZE));
      currentPage = Math.min(Math.max(1, Number(data.page) || currentPage), pageCount);
      renderHistory();
    } catch (err) {
      if (sequence !== requestSequence) return;
      console.error('Ошибка загрузки истории:', err);
      listContainer.innerHTML = '<div class="p-8 text-center text-rose-500 text-sm">Не удалось загрузить историю</div>';
    } finally {
      if (sequence === requestSequence) listContainer.removeAttribute('aria-busy');
    }
  }

  function formatDayKey(date) {
    if (!date || Number.isNaN(date.getTime())) return 'unknown';
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  }

  function formatDayHeading(date) {
    if (!date) return 'Дата неизвестна';

    const label = date.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const capitalized = label.charAt(0).toLocaleUpperCase('ru-RU') + label.slice(1);

    const today = new Date();
    const todayKey = formatDayKey(today);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = formatDayKey(yesterday);
    const key = formatDayKey(date);

    if (key === todayKey) return 'Сегодня · ' + capitalized;
    if (key === yesterdayKey) return 'Вчера · ' + capitalized;
    return capitalized;
  }

  function operationCountLabel(count) {
    return 'Операций: ' + count;
  }

  function renderPagination() {
    const start = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(currentPage * PAGE_SIZE, totalCount);

    return '<div class="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">' +
      '<span class="text-xs text-slate-500 whitespace-nowrap">Записи ' + start + '–' + end + ' из ' + totalCount + '</span>' +
      '<div class="flex items-center gap-2">' +
        '<button type="button" data-history-page="prev" class="btn btn-outline" ' +
          (currentPage <= 1 ? 'disabled aria-disabled="true" ' : '') +
          '><i data-lucide="chevron-left" class="w-4 h-4"></i> Назад</button>' +
        '<span class="min-w-max px-1 text-sm text-slate-600">Стр. ' + currentPage + '/' + pageCount + '</span>' +
        '<button type="button" data-history-page="next" class="btn btn-outline" ' +
          (currentPage >= pageCount ? 'disabled aria-disabled="true" ' : '') +
          '>Далее <i data-lucide="chevron-right" class="w-4 h-4"></i></button>' +
      '</div>' +
    '</div>';
  }

  function renderHistory() {
    const listContainer = document.getElementById('history-list-container');
    const paginationContainer = document.getElementById('history-pagination-top');
    if (!listContainer) return;

    if (paginationContainer) paginationContainer.innerHTML = renderPagination();

    if (checks.length === 0) {
      const filters = currentFilters();
      const hasFilter = Boolean(filters.room) || filters.operation !== 'all';
      listContainer.innerHTML =
        '<div class="p-12 text-center text-slate-400">' +
          '<i data-lucide="history" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>' +
          '<p>' + (hasFilter ? 'По заданным условиям ничего не найдено' : 'Журнал операций пуст') + '</p>' +
        '</div>';
      if (window.lucide) lucide.createIcons();
      return;
    }

    const groups = [];
    checks.forEach(check => {
      const rawDate = check.checkDate || check.check_date || check.createdAt;
      const parsedDate = rawDate ? new Date(rawDate) : null;
      const date = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;
      const key = formatDayKey(date);
      let group = groups[groups.length - 1];

      if (!group || group.key !== key) {
        group = { key, date, items: [] };
        groups.push(group);
      }
      group.items.push({ check, date });
    });

    const rows = groups.map(group => {
      const heading = '<tr class="bg-indigo-50 border-y border-indigo-100">' +
        '<td colspan="5" class="px-6 py-3">' +
          '<div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-indigo-950">' +
            '<i data-lucide="calendar-days" class="w-4 h-4 text-indigo-500"></i>' +
            '<span class="font-bold">' + escapeHtml(formatDayHeading(group.date)) + '</span>' +
            '<span class="text-xs font-medium text-indigo-700/80">' + operationCountLabel(group.items.length) + '</span>' +
          '</div>' +
        '</td>' +
      '</tr>';

      const dayRows = group.items.map((entry, index) => {
        const check = entry.check;
        const date = entry.date;
        const timeStr = date ? date.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit'
        }) : '—';
        const operation = operationMeta(check);
        const notes = displayNotes(check);
        const rowBackground = index % 2 === 0 ? 'bg-white' : 'bg-slate-50';

        return '<tr class="' + rowBackground + ' border-b-2 border-slate-200 hover:bg-indigo-50/40 transition-colors">' +
          '<td class="p-4 pl-6 text-slate-500 align-top whitespace-nowrap">' +
            '<div class="font-medium text-slate-900">' + timeStr + '</div>' +
          '</td>' +
          '<td class="p-4 font-semibold text-slate-900 align-top">' +
            (check.room ? escapeHtml(check.room.number) : '—') +
          '</td>' +
          '<td class="p-4 align-top">' +
            '<span class="inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ' +
              operation.cls + '">' + operation.label + '</span>' +
          '</td>' +
          '<td class="p-4 align-top">' + renderProducts(check) + '</td>' +
          '<td class="p-4 pr-6 text-slate-600 max-w-sm align-top">' +
            (notes
              ? '<div class="leading-5 whitespace-normal break-words" title="' + escapeHtml(notes) + '">' +
                  escapeHtml(notes).replace(/\n/g, '<br>') +
                '</div>'
              : '<span class="text-slate-400">—</span>') +
          '</td>' +
        '</tr>';
      }).join('');

      return heading + dayRows;
    }).join('');

    listContainer.innerHTML =
      '<div class="overflow-x-auto">' +
        '<table class="w-full text-left border-collapse">' +
          '<thead>' +
            '<tr class="border-b-2 border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-100">' +
              '<th class="p-4 pl-6">Время</th>' +
              '<th class="p-4">Номер комнаты</th>' +
              '<th class="p-4">Тип операции</th>' +
              '<th class="p-4">Продукты</th>' +
              '<th class="p-4 pr-6">Заметки</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody class="text-sm text-slate-700">' + rows + '</tbody>' +
        '</table>' +
      '</div>';

    if (window.lucide) lucide.createIcons();
  }

  function setupListeners() {
    if (isInitialized) return;

    const search = document.getElementById('history-search');
    const typeFilter = document.getElementById('history-type-filter');
    const paginationContainer = document.getElementById('history-pagination-top');

    search?.addEventListener('input', () => {
      currentPage = 1;
      loadHistory();
    });

    typeFilter?.addEventListener('change', () => {
      currentPage = 1;
      loadHistory();
    });

    paginationContainer?.addEventListener('click', event => {
      const button = event.target.closest('[data-history-page]');
      if (!button || button.disabled) return;

      if (button.dataset.historyPage === 'prev' && currentPage > 1) {
        currentPage -= 1;
        loadHistory();
      } else if (button.dataset.historyPage === 'next' && currentPage < pageCount) {
        currentPage += 1;
        loadHistory();
      }
    });

    isInitialized = true;
  }

  function init() {
    setupListeners();
    loadHistory();
  }

  return { init, refresh: loadHistory };
})();
