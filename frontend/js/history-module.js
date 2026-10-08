// МОДУЛЬ ИСТОРИИ ОПЕРАЦИЙ (HISTORY)
// ═══════════════════════════════════════════════════════════════
App.historyModule = (() => {
  const api = () => window.api;
  const { escapeHtml, pluralize } = window.AppUtils;

  let checks = [];
  let isInitialized = false;

  async function loadHistory() {
    const listContainer = document.getElementById('history-list-container');
    if (!listContainer) return;

    try {
      checks = await api().getChecks(100);
      renderHistory();
    } catch (err) {
      console.error('Ошибка загрузки истории:', err);
      listContainer.innerHTML = '<div class="p-8 text-center text-rose-500 text-sm">Не удалось загрузить историю</div>';
    }
  }


  function renderHistory() {
    const listContainer = document.getElementById('history-list-container');
    if (!listContainer) return;

    const searchValue = document.getElementById('history-search')?.value.toLowerCase().trim() || '';

    const isVkOperation = check =>
      check.type === 'vk_room' || check.type === 'vk_emptied';

    const operationMeta = check => {
      if (check.type === 'emptied' || check.type === 'vk_emptied') {
        return {
          label: 'Опустошение',
          cls: 'bg-rose-50 text-rose-700 border-rose-100'
        };
      }

      if (check.type === 'gih') {
        return {
          label: 'GIH',
          cls: 'bg-violet-50 text-violet-700 border-violet-100'
        };
      }

      return {
        label: 'Проверка',
        cls: 'bg-indigo-50 text-indigo-700 border-indigo-100'
      };
    };

    const gihModes = {
      dnd: { label: 'DND', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
      all_in_place: { label: 'Всё на месте', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
      all_out: { label: 'Всё выложили', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
      empty: { label: 'Опустошён', cls: 'bg-rose-50 text-rose-700 border-rose-200' }
    };

    const gihStatuses = {
      replenished: { label: 'Пополнено', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      in_place: { label: 'На месте', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
      out: { label: 'Выложили', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
      not_replenished: { label: 'Не пополнено', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
      pending: { label: 'Не размечено', cls: 'bg-slate-100 text-slate-600 border-slate-200' }
    };

    const gihStatusOrder = ['replenished', 'in_place', 'out', 'not_replenished', 'pending'];

    const statusMeta = status => {
      if (gihStatuses[status]) return gihStatuses[status];

      if (status === 'consumed' || status === 'emptied' || status === 'needs_replenishment') {
        return {
          label: 'Потребление',
          cls: 'bg-rose-50 text-rose-700 border-rose-200'
        };
      }

      return gihStatuses.pending;
    };

    const displayNotes = check => {
      if (!isVkOperation(check)) return String(check.notes || '').trim();

      const raw = String(check.notes || '').trim();
      if (!raw) return '';

      const match = raw.match(/\\(([^)]*)\\)\\s*$/u);
      return match ? match[1].trim() : '';
    };

    const renderProducts = check => {
      if (check.type !== 'gih') {
        return '<span class="text-slate-400">—</span>';
      }

      if (check.gihRoomStatus) {
        const mode = gihModes[check.gihRoomStatus] || {
          label: check.gihRoomStatus,
          cls: 'bg-slate-100 text-slate-600 border-slate-200'
        };

        return '<span class="inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ' +
          mode.cls + '">' + escapeHtml(mode.label) + '</span>';
      }

      const groups = {};

      (check.gihItems || []).forEach(item => {
        const status = String(item.itemStatus || 'pending');
        const name = item.product ? item.product.name : 'Продукт';

        if (!groups[status]) groups[status] = {};
        groups[status][name] = (groups[status][name] || 0) + 1;
      });

      const existingStatuses = gihStatusOrder.filter(status => groups[status]);

      if (!existingStatuses.length) {
        return '<span class="text-slate-400">—</span>';
      }

      return '<div class="flex flex-col gap-1.5">' +
        existingStatuses.map(status => {
          const meta = statusMeta(status);
          const products = Object.entries(groups[status])
            .map(([name, qty]) =>
              qty > 1 ? escapeHtml(name) + ' ×' + qty : escapeHtml(name)
            )
            .join(', ');

          return '<div class="flex items-start gap-2">' +
            '<span class="inline-flex shrink-0 items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold ' +
            meta.cls + '">' + escapeHtml(meta.label) + '</span>' +
            '<span class="text-sm text-slate-700 leading-5">' + products + '</span>' +
          '</div>';
        }).join('') +
      '</div>';
    };

    const searchText = check => {
      const operation = operationMeta(check);
      const notes = displayNotes(check);
      const mode = check.gihRoomStatus
        ? (gihModes[check.gihRoomStatus]?.label || check.gihRoomStatus)
        : '';

      const products = (check.gihItems || []).map(item => {
        const status = statusMeta(item.itemStatus).label;
        const name = item.product ? item.product.name : 'Продукт';
        return name + ' ' + status;
      }).join(' ');

      return [
        check.room ? String(check.room.number) : '',
        operation.label,
        mode,
        notes,
        products
      ].join(' ').toLowerCase();
    };

    const filtered = checks.filter(check => {
      if (!searchValue) return true;
      return searchText(check).includes(searchValue);
    });

    if (filtered.length === 0) {
      listContainer.innerHTML =
        '<div class="p-12 text-center text-slate-400">' +
          '<i data-lucide="history" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>' +
          '<p>' + (searchValue ? 'Ничего не найдено' : 'Журнал операций пуст') + '</p>' +
        '</div>';

      if (window.lucide) lucide.createIcons();
      return;
    }

    const rows = filtered.map(check => {
      const date = new Date(check.checkDate || check.check_date || check.createdAt);
      const dateStr = date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const timeStr = date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });

      const operation = operationMeta(check);
      const notes = displayNotes(check);

      return '<tr class="hover:bg-slate-50/50 transition">' +
        '<td class="p-4 pl-6 text-slate-500">' +
          '<div class="font-medium text-slate-900">' + dateStr + '</div>' +
          '<div class="text-xs">' + timeStr + '</div>' +
        '</td>' +
        '<td class="p-4 font-semibold text-slate-900">' +
          (check.room ? check.room.number : '—') +
        '</td>' +
        '<td class="p-4">' +
          '<span class="inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ' +
          operation.cls + '">' + operation.label + '</span>' +
        '</td>' +
        '<td class="p-4 align-top">' + renderProducts(check) + '</td>' +
        '<td class="p-4 pr-6 text-slate-600 max-w-sm">' +
          (notes
            ? '<div class="leading-5" title="' + escapeHtml(notes) + '">' + escapeHtml(notes) + '</div>'
            : '<span class="text-slate-400">—</span>') +
        '</td>' +
      '</tr>';
    }).join('');

    listContainer.innerHTML =
      '<div class="overflow-x-auto">' +
        '<table class="w-full text-left border-collapse">' +
          '<thead>' +
            '<tr class="border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase bg-slate-50">' +
              '<th class="p-4 pl-6">Дата и время</th>' +
              '<th class="p-4">Номер комнаты</th>' +
              '<th class="p-4">Тип операции</th>' +
              '<th class="p-4">Продукты</th>' +
              '<th class="p-4 pr-6">Заметки</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody class="divide-y divide-slate-50 text-sm text-slate-700">' +
            rows +
          '</tbody>' +
        '</table>' +
      '</div>';

    if (window.lucide) lucide.createIcons();
  }

  function setupListeners() {
    if (isInitialized) return;
    document.getElementById('history-search')?.addEventListener('input', renderHistory);
    isInitialized = true;
  }

  function init() {
    setupListeners();
    loadHistory();
  }

  return { init, refresh: loadHistory };
})();
