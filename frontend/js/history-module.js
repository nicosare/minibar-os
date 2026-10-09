// МОДУЛЬ ИСТОРИИ ОПЕРАЦИЙ (HISTORY)
App.historyModule = (() => {
  'use strict';

  const apiBase = () => String(window.API_BASE || '/api').replace(/\/$/, '');
  const { escapeHtml } = window.AppUtils;

  const STORAGE = {
    view: 'minibar-history-view',
    dailyFilter: 'minibar-history-daily-filter',
    sort: 'minibar-history-sort'
  };

  function readPreference(key, fallback) {
    try { return localStorage.getItem(key) || fallback; } catch (_) { return fallback; }
  }

  function savePreference(key, value) {
    try { localStorage.setItem(key, value); } catch (_) {}
  }

  function atMidnight(value) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  const today = atMidnight(new Date());
  const allowedViews = ['daily', 'gih'];
  const state = {
    view: allowedViews.includes(readPreference(STORAGE.view, 'daily'))
      ? readPreference(STORAGE.view, 'daily') : 'daily',
    dailyFilter: readPreference(STORAGE.dailyFilter, 'all') === 'emptied' ? 'emptied' : 'all',
    sort: readPreference(STORAGE.sort, 'room') === 'time' ? 'time' : 'room',
    selectedDate: new Date(today),
    records: [],
    total: 0,
    calendarEntries: [],
    calendarCounts: new Map(),
    loadedCalendarMonth: '',
    requestSequence: 0,
    calendarSequence: 0,
    initialized: false,
    searchTimer: null,
    calendarMonth: new Date(today.getFullYear(), today.getMonth(), 1),
    calendarOverlay: null
  };

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

  function isEmptyType(type) {
    return type === 'emptied' || type === 'vk_emptied';
  }

  function isVkOperation(check) {
    return check.type === 'vk_room' || check.type === 'vk_emptied';
  }

  function operationMeta(check) {
    if (isEmptyType(check.type)) {
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

  function currentRoomQuery() {
    const input = document.getElementById('history-search');
    return String(input ? input.value : '').replace(/\D/g, '').trim();
  }

  function formatDayKey(date) {
    if (!date || Number.isNaN(date.getTime())) return 'unknown';
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  }

  function dateFromKey(key) {
    const parts = String(key).split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function dayBounds(date) {
    const from = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const to = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    return { from: from.toISOString(), to: to.toISOString() };
  }

  function monthBounds(date) {
    const from = new Date(date.getFullYear(), date.getMonth(), 1);
    const to = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    return { from: from.toISOString(), to: to.toISOString() };
  }

  function calendarBounds(date) {
    const first = new Date(date.getFullYear(), date.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const from = new Date(date.getFullYear(), date.getMonth(), 1 - offset);
    const to = new Date(from);
    to.setDate(to.getDate() + 42);
    return { from: from.toISOString(), to: to.toISOString() };
  }

  function monthKey(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
  }

  function dateForCheck(check) {
    const raw = check.checkDate || check.check_date || check.createdAt;
    if (!raw) return null;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function getDateCount(date) {
    const key = formatDayKey(date);
    const counts = state.calendarCounts.get(key) || { daily: 0, emptied: 0, gih: 0 };
    if (state.view === 'gih') return counts.gih;
    return state.dailyFilter === 'emptied' ? counts.emptied : counts.daily;
  }

  function buildCalendarCounts() {
    const counts = new Map();
    state.calendarEntries.forEach(entry => {
      const date = new Date(entry.checkDate || entry.check_date);
      if (Number.isNaN(date.getTime())) return;
      const key = formatDayKey(date);
      if (!counts.has(key)) counts.set(key, { daily: 0, emptied: 0, gih: 0 });
      const day = counts.get(key);
      if (entry.type === 'gih') day.gih += 1;
      else {
        day.daily += 1;
        if (isEmptyType(entry.type)) day.emptied += 1;
      }
    });
    state.calendarCounts = counts;
  }

  function pluralizeRecords(count) {
    const mod100 = count % 100;
    const mod10 = count % 10;
    if (mod100 >= 11 && mod100 <= 14) return count + ' записей';
    if (mod10 === 1) return count + ' запись';
    if (mod10 >= 2 && mod10 <= 4) return count + ' записи';
    return count + ' записей';
  }

  function formattedDate(date, withWeekday) {
    const options = withWeekday
      ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
      : { day: 'numeric', month: 'long', year: 'numeric' };
    const label = date.toLocaleDateString('ru-RU', options);
    return label.charAt(0).toLocaleUpperCase('ru-RU') + label.slice(1);
  }

  function dateHeading(date) {
    if (!date) return 'Дата неизвестна';
    const key = formatDayKey(date);
    const now = atMidnight(new Date());
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (key === formatDayKey(now)) return 'Сегодня · ' + formattedDate(date, true);
    if (key === formatDayKey(yesterday)) return 'Вчера · ' + formattedDate(date, true);
    return formattedDate(date, true);
  }

  function updateDateControls() {
    const label = document.getElementById('history-current-date-label');
    const count = document.getElementById('history-date-count');
    const prev = document.getElementById('history-prev-day');
    const next = document.getElementById('history-next-day');
    const todayDate = atMidnight(new Date());
    const selectedKey = formatDayKey(state.selectedDate);
    const todayKey = formatDayKey(todayDate);
    const yesterdayDate = new Date(todayDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    let dateText = formattedDate(state.selectedDate, true);
    if (selectedKey === todayKey) dateText = 'Сегодня · ' + dateText;
    else if (selectedKey === formatDayKey(yesterdayDate)) dateText = 'Вчера · ' + dateText;
    if (label) label.textContent = dateText;
    if (count) count.textContent = pluralizeRecords(getDateCount(state.selectedDate));
    if (prev) prev.disabled = false;
    if (next) next.disabled = selectedKey === todayKey;
  }

  function updateControls() {
    const roomQuery = currentRoomQuery();
    document.querySelectorAll('[data-history-view]').forEach(button => {
      const active = button.dataset.historyView === state.view;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('[data-history-daily-filter]').forEach(button => {
      const active = button.dataset.historyDailyFilter === state.dailyFilter;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const dailyFilters = document.getElementById('history-daily-filters');
    if (dailyFilters) dailyFilters.classList.toggle('hidden', state.view !== 'daily');
    const dateRow = document.getElementById('history-date-row');
    if (dateRow) dateRow.classList.toggle('hidden', Boolean(roomQuery));
    const clearButton = document.getElementById('history-search-clear');
    if (clearButton) clearButton.classList.toggle('hidden', !roomQuery);
    const sortLabel = document.getElementById('history-sort-label');
    if (sortLabel) sortLabel.textContent = state.sort === 'time' ? 'По времени' : 'По номерам';
    const sortButton = document.getElementById('history-sort-toggle');
    if (sortButton) sortButton.setAttribute('aria-label', 'Сортировка: ' + (state.sort === 'time' ? 'по времени' : 'по номерам'));
    updateDateControls();
    if (window.lucide) window.lucide.createIcons();
  }

  async function fetchJson(path, params) {
    const response = await fetch(apiBase() + path + '?' + params.toString(), { cache: 'no-store' });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'HTTP ' + response.status);
    }
    return response.json();
  }

  async function loadHistory() {
    const listContainer = document.getElementById('history-list-container');
    if (!listContainer) return;

    const sequence = ++state.requestSequence;
    const room = currentRoomQuery();
    const params = new URLSearchParams();
    params.set('operation', state.view === 'gih' ? 'gih' : (state.dailyFilter === 'emptied' ? 'emptied' : 'daily'));
    if (room) {
      params.set('room', room);
    } else {
      const range = dayBounds(state.selectedDate);
      params.set('from', range.from);
      params.set('to', range.to);
    }

    listContainer.setAttribute('aria-busy', 'true');
    if (!state.records.length) {
      listContainer.innerHTML = '<div class="p-8 text-center text-slate-400"><i data-lucide="loader-2" class="w-5 h-5 inline animate-spin mr-2"></i>Загрузка истории...</div>';
      if (window.lucide) window.lucide.createIcons();
    }

    try {
      const data = await fetchJson('/checks/history', params);
      if (sequence !== state.requestSequence) return;

      state.records = Array.isArray(data.items) ? data.items : [];
      state.total = Number(data.total);
      if (!Number.isFinite(state.total)) state.total = state.records.length;
      updateControls();
      renderHistory();
    } catch (error) {
      if (sequence !== state.requestSequence) return;
      console.error('Ошибка загрузки истории:', error);
      listContainer.innerHTML = '<div class="p-8 text-center text-rose-500 text-sm">Не удалось загрузить историю. Проверьте соединение и попробуйте ещё раз.</div>';
    } finally {
      if (sequence === state.requestSequence) listContainer.removeAttribute('aria-busy');
    }
  }

  async function loadCalendar(force) {
    const targetMonth = monthKey(state.selectedDate);
    if (!force && state.loadedCalendarMonth === targetMonth) {
      updateDateControls();
      if (state.calendarOverlay && state.calendarOverlay.classList.contains('show')) renderCalendar();
      return;
    }

    const sequence = ++state.calendarSequence;
    const range = calendarBounds(state.selectedDate);
    const params = new URLSearchParams({ from: range.from, to: range.to });
    try {
      const data = await fetchJson('/checks/history/calendar', params);
      if (sequence !== state.calendarSequence) return;
      state.calendarEntries = Array.isArray(data.items) ? data.items : [];
      state.loadedCalendarMonth = targetMonth;
      buildCalendarCounts();
      updateDateControls();
      if (state.calendarOverlay && state.calendarOverlay.classList.contains('show')) renderCalendar();
    } catch (error) {
      if (sequence !== state.calendarSequence) return;
      console.error('Ошибка загрузки календаря Истории:', error);
      if (state.loadedCalendarMonth !== targetMonth) {
        state.calendarEntries = [];
        state.calendarCounts = new Map();
        state.loadedCalendarMonth = targetMonth;
      }
      updateDateControls();
      if (state.calendarOverlay && state.calendarOverlay.classList.contains('show')) renderCalendar();
    }
  }

  function roomNumber(check) {
    return check && check.room && check.room.number !== undefined && check.room.number !== null
      ? String(check.room.number) : '';
  }

  function compareRooms(a, b) {
    const aRoom = roomNumber(a);
    const bRoom = roomNumber(b);
    const aNum = Number(aRoom);
    const bNum = Number(bRoom);
    if (Number.isFinite(aNum) && Number.isFinite(bNum) && aRoom && bRoom && aNum !== bNum) return aNum - bNum;
    return aRoom.localeCompare(bRoom, 'ru', { numeric: true }) * (aRoom && bRoom ? 1 : 0);
  }

  function sortRecords(records, globalSearch) {
    return records.slice().sort((a, b) => {
      if (globalSearch) {
        const aDate = dateFromKey(formatDayKey(dateForCheck(a) || new Date(0)));
        const bDate = dateFromKey(formatDayKey(dateForCheck(b) || new Date(0)));
        const dateDiff = bDate.getTime() - aDate.getTime();
        if (dateDiff) return dateDiff;
      }
      if (state.sort === 'room') {
        const roomDiff = compareRooms(a, b);
        if (roomDiff) return roomDiff;
      }
      const aDate = dateForCheck(a);
      const bDate = dateForCheck(b);
      return (bDate ? bDate.getTime() : 0) - (aDate ? aDate.getTime() : 0);
    });
  }

  function renderRecordRow(check, index) {
    const date = dateForCheck(check);
    const time = date ? date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '—';
    const operation = operationMeta(check);
    const notes = displayNotes(check);
    const background = index % 2 === 0 ? 'bg-white' : 'bg-slate-50';
    return '<tr class="' + background + ' border-b border-slate-200 hover:bg-indigo-50/40 transition-colors">' +
      '<td class="p-4 pl-6 text-slate-500 align-top whitespace-nowrap"><div class="font-medium text-slate-900">' + time + '</div></td>' +
      '<td class="p-4 font-semibold text-slate-900 align-top whitespace-nowrap">' + (roomNumber(check) ? escapeHtml(roomNumber(check)) : '—') + '</td>' +
      '<td class="p-4 align-top"><span class="inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ' + operation.cls + '">' + operation.label + '</span></td>' +
      '<td class="p-4 align-top">' + renderProducts(check) + '</td>' +
      '<td class="p-4 pr-6 text-slate-600 max-w-sm align-top">' +
        (notes ? '<div class="leading-5 whitespace-normal break-words" title="' + escapeHtml(notes) + '">' + escapeHtml(notes).replace(/\n/g, '<br>') + '</div>' : '<span class="text-slate-400">—</span>') +
      '</td>' +
    '</tr>';
  }

  function renderHistory() {
    const container = document.getElementById('history-list-container');
    const countEl = document.getElementById('history-results-count');
    if (!container) return;
    const room = currentRoomQuery();
    const records = sortRecords(state.records, Boolean(room));
    if (countEl) {
      countEl.textContent = room ? 'Найдено: ' + state.total : 'Записей за день: ' + state.total;
    }

    if (!records.length) {
      const label = room
        ? 'По этому номеру ничего не найдено'
        : (state.view === 'gih' ? 'За выбранный день записей GIH нет' : (state.dailyFilter === 'emptied'
          ? 'За выбранный день опустошений нет' : 'За выбранный день проверок или опустошений нет'));
      container.innerHTML = '<div class="p-12 text-center text-slate-400">' +
        '<i data-lucide="history" class="w-12 h-12 mx-auto mb-3 opacity-50"></i><p>' + label + '</p></div>';
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    let bodyRows = '';
    if (room) {
      const groups = [];
      records.forEach(check => {
        const date = dateForCheck(check);
        const key = formatDayKey(date);
        let group = groups[groups.length - 1];
        if (!group || group.key !== key) {
          group = { key, date, items: [] };
          groups.push(group);
        }
        group.items.push(check);
      });
      bodyRows = groups.map(group =>
        '<tr class="bg-indigo-50 border-y border-indigo-100"><td colspan="5" class="px-6 py-3">' +
          '<div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-indigo-950">' +
            '<i data-lucide="calendar-days" class="w-4 h-4 text-indigo-500"></i>' +
            '<span class="font-bold">' + escapeHtml(dateHeading(group.date)) + '</span>' +
            '<span class="text-xs font-medium text-indigo-700/80">' + pluralizeRecords(group.items.length) + '</span>' +
          '</div></td></tr>' +
        group.items.map((check, i) => renderRecordRow(check, i)).join('')
      ).join('');
    } else {
      bodyRows = records.map((check, index) => renderRecordRow(check, index)).join('');
    }

    container.innerHTML =
      '<div class="overflow-x-auto">' +
        '<table class="w-full text-left border-collapse">' +
          '<thead><tr class="border-b-2 border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-100">' +
            '<th class="p-4 pl-6">Время</th><th class="p-4">Номер комнаты</th><th class="p-4">Тип операции</th><th class="p-4">Продукты</th><th class="p-4 pr-6">Заметки</th>' +
          '</tr></thead><tbody class="text-sm text-slate-700">' + bodyRows + '</tbody>' +
        '</table></div>';

    if (window.lucide) window.lucide.createIcons();
  }

  function todayKey() {
    return formatDayKey(atMidnight(new Date()));
  }

  function ensureCalendarDom() {
    if (state.calendarOverlay) return;
    const overlay = document.createElement('div');
    overlay.className = 'history-calendar-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML =
      '<div class="history-calendar" role="dialog" aria-modal="true" aria-label="Выбор даты Истории">' +
        '<div class="history-calendar-header">' +
          '<div><div class="history-calendar-eyebrow">История операций</div><div class="history-calendar-title" id="history-calendar-title"></div></div>' +
          '<button type="button" class="history-calendar-close" data-calendar-action="close" aria-label="Закрыть календарь"><i data-lucide="x"></i></button>' +
        '</div>' +
        '<div class="history-calendar-month-nav">' +
          '<button type="button" data-calendar-action="prev-year" aria-label="Предыдущий год"><i data-lucide="chevrons-left"></i></button>' +
          '<button type="button" data-calendar-action="prev-month" aria-label="Предыдущий месяц"><i data-lucide="chevron-left"></i></button>' +
          '<button type="button" data-calendar-action="next-month" aria-label="Следующий месяц"><i data-lucide="chevron-right"></i></button>' +
          '<button type="button" data-calendar-action="next-year" aria-label="Следующий год"><i data-lucide="chevrons-right"></i></button>' +
        '</div>' +
        '<div class="history-calendar-weekdays"><span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span></div>' +
        '<div class="history-calendar-days" id="history-calendar-days"></div>' +
        '<div class="history-calendar-footer"><button type="button" class="btn btn-primary" data-calendar-action="today">Сегодня</button><button type="button" class="btn btn-outline" data-calendar-action="close">Закрыть</button></div>' +
      '</div>';
    document.body.appendChild(overlay);
    state.calendarOverlay = overlay;

    overlay.addEventListener('click', event => {
      if (event.target === overlay) {
        hideCalendar();
        return;
      }
      const actionButton = event.target.closest('[data-calendar-action]');
      if (actionButton) {
        handleCalendarAction(actionButton.dataset.calendarAction);
        return;
      }
      const dayButton = event.target.closest('[data-calendar-date]');
      if (dayButton && !dayButton.disabled) {
        selectDate(dateFromKey(dayButton.dataset.calendarDate));
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && state.calendarOverlay && state.calendarOverlay.classList.contains('show')) hideCalendar();
    });
  }

  function showCalendar() {
    if (currentRoomQuery()) return;
    ensureCalendarDom();
    state.calendarMonth = new Date(state.selectedDate.getFullYear(), state.selectedDate.getMonth(), 1);
    state.calendarOverlay.classList.add('show');
    state.calendarOverlay.setAttribute('aria-hidden', 'false');
    renderCalendar();
    if (window.lucide) window.lucide.createIcons();
  }

  function hideCalendar() {
    if (!state.calendarOverlay) return;
    state.calendarOverlay.classList.remove('show');
    state.calendarOverlay.setAttribute('aria-hidden', 'true');
  }

  function handleCalendarAction(action) {
    if (action === 'close') {
      hideCalendar();
      return;
    }
    if (action === 'today') {
      selectDate(atMidnight(new Date()));
      return;
    }

    const month = state.calendarMonth.getMonth();
    const year = state.calendarMonth.getFullYear();
    if (action === 'prev-month') state.calendarMonth = new Date(year, month - 1, 1);
    else if (action === 'next-month') state.calendarMonth = new Date(year, month + 1, 1);
    else if (action === 'prev-year') state.calendarMonth = new Date(year - 1, month, 1);
    else if (action === 'next-year') state.calendarMonth = new Date(year + 1, month, 1);

    const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    if (state.calendarMonth > currentMonth) state.calendarMonth = currentMonth;
    renderCalendar();
  }

  function renderCalendar() {
    if (!state.calendarOverlay) return;
    const title = state.calendarOverlay.querySelector('#history-calendar-title');
    const daysContainer = state.calendarOverlay.querySelector('#history-calendar-days');
    if (!title || !daysContainer) return;

    const year = state.calendarMonth.getFullYear();
    const month = state.calendarMonth.getMonth();
    title.textContent = state.calendarMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    state.calendarOverlay.querySelectorAll('[data-calendar-action="next-month"], [data-calendar-action="next-year"]').forEach(button => {
      button.disabled = state.calendarMonth.getFullYear() === currentMonth.getFullYear() &&
        state.calendarMonth.getMonth() === currentMonth.getMonth();
    });

    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const today = atMidnight(new Date());
    const selectedKey = formatDayKey(state.selectedDate);
    const cells = [];
    for (let i = 0; i < 42; i += 1) {
      const date = new Date(year, month, 1 - offset + i);
      const key = formatDayKey(date);
      const isCurrentMonth = date.getMonth() === month;
      const isToday = key === formatDayKey(today);
      const isSelected = key === selectedKey;
      const disabled = atMidnight(date).getTime() > today.getTime();
      const count = getDateCount(date);
      const classes = ['history-calendar-day'];
      if (!isCurrentMonth) classes.push('other-month');
      if (isToday) classes.push('today');
      if (isSelected) classes.push('selected');
      if (disabled) classes.push('disabled');
      cells.push('<button type="button" class="' + classes.join(' ') + '" data-calendar-date="' + key + '"' +
        (disabled ? ' disabled aria-disabled="true"' : '') +
        (isSelected ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' +
        '<span class="history-calendar-number">' + date.getDate() + '</span>' +
        (count > 0 && !disabled ? '<span class="history-calendar-count">' + count + '</span>' : '') +
      '</button>');
    }
    daysContainer.innerHTML = cells.join('');
  }

  async function selectDate(date) {
    const normalized = atMidnight(date);
    if (normalized.getTime() > atMidnight(new Date()).getTime()) return;
    const beforeMonth = monthKey(state.selectedDate);
    state.selectedDate = normalized;
    hideCalendar();
    updateControls();
    const afterMonth = monthKey(state.selectedDate);
    await Promise.all([
      loadHistory(),
      beforeMonth === afterMonth ? Promise.resolve() : loadCalendar(true)
    ]);
    renderCalendar();
  }

  async function moveDay(delta) {
    const next = new Date(state.selectedDate);
    next.setDate(next.getDate() + delta);
    if (atMidnight(next).getTime() > atMidnight(new Date()).getTime()) return;
    await selectDate(next);
  }

  function switchView(view) {
    if (!allowedViews.includes(view) || state.view === view) return;
    state.view = view;
    savePreference(STORAGE.view, view);
    updateControls();
    if (state.calendarOverlay && state.calendarOverlay.classList.contains('show')) renderCalendar();
    loadHistory();
  }

  function switchDailyFilter(filter) {
    if (!['all', 'emptied'].includes(filter) || state.dailyFilter === filter) return;
    state.dailyFilter = filter;
    savePreference(STORAGE.dailyFilter, filter);
    updateControls();
    if (state.calendarOverlay && state.calendarOverlay.classList.contains('show')) renderCalendar();
    if (state.view === 'daily') loadHistory();
  }

  function toggleSort() {
    state.sort = state.sort === 'room' ? 'time' : 'room';
    savePreference(STORAGE.sort, state.sort);
    updateControls();
    renderHistory();
  }

  function setupListeners() {
    if (state.initialized) return;

    document.querySelectorAll('[data-history-view]').forEach(button => {
      button.addEventListener('click', () => switchView(button.dataset.historyView));
    });
    document.querySelectorAll('[data-history-daily-filter]').forEach(button => {
      button.addEventListener('click', () => switchDailyFilter(button.dataset.historyDailyFilter));
    });

    const search = document.getElementById('history-search');
    const clearButton = document.getElementById('history-search-clear');
    const prev = document.getElementById('history-prev-day');
    const next = document.getElementById('history-next-day');
    const dateButton = document.getElementById('history-current-date');
    const sortButton = document.getElementById('history-sort-toggle');

    search && search.addEventListener('input', () => {
      if (state.searchTimer) clearTimeout(state.searchTimer);
      updateControls();
      state.searchTimer = setTimeout(() => {
        state.searchTimer = null;
        loadHistory();
      }, 220);
    });
    clearButton && clearButton.addEventListener('click', () => {
      if (search) search.value = '';
      updateControls();
      loadHistory();
      if (search) search.focus();
    });
    prev && prev.addEventListener('click', () => moveDay(-1));
    next && next.addEventListener('click', () => moveDay(1));
    dateButton && dateButton.addEventListener('click', showCalendar);
    sortButton && sortButton.addEventListener('click', toggleSort);

    state.initialized = true;
  }

  async function init() {
    setupListeners();
    updateControls();
    await Promise.all([loadHistory(), loadCalendar(true)]);
  }

  async function refresh() {
    setupListeners();
    await Promise.all([loadHistory(), loadCalendar(true)]);
  }

  return { init, refresh };
})();