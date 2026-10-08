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

    const filtered = checks.filter(c => {
      const roomNum = c.room ? String(c.room.number) : '';
      const inspector = String(c.inspectorName || 'Анна').toLowerCase();
      const notes = String(c.notes || '').toLowerCase();
      
      if (!searchValue) return true;
      return roomNum.includes(searchValue) || inspector.includes(searchValue) || notes.includes(searchValue);
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="p-12 text-center text-slate-400">
          <i data-lucide="history" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
          <p>${searchValue ? 'Ничего не найдено' : 'Журнал операций пуст'}</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    listContainer.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase bg-slate-50">
              <th class="p-4 pl-6">Дата и время</th>
              <th class="p-4">Номер комнаты</th>
              <th class="p-4">Тип операции</th>
              <th class="p-4">Исполнитель</th>
              <th class="p-4">Заметки</th>
              <th class="p-4 pr-6">Продукты</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50 text-sm text-slate-700">
            ${filtered.map(c => {
              const date = new Date(c.checkDate || c.check_date || c.createdAt);
              const dateStr = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
              const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

              let typeLabel = 'Проверка';
              let typeClass = 'bg-indigo-50 text-indigo-700';
              if (c.type === 'emptied') {
                typeLabel = 'Опустошение';
                typeClass = 'bg-rose-50 text-rose-700';
              } else if (c.type === 'gih') {
                typeLabel = 'GIH проверка';
                typeClass = 'bg-emerald-50 text-emerald-700';
              }

              const itemsStr = c.gihItems && c.gihItems.length > 0
                ? c.gihItems.map(item => {
                    const prodName = item.product ? item.product.name : 'Продукт';
                    let statusLabel = 'Норма';
                    if (item.itemStatus === 'consumed' || item.itemStatus === 'emptied' || item.itemStatus === 'needs_replenishment') {
                      statusLabel = 'Потребление';
                    }
                    return `<span class="inline-block bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded mr-1 mb-1">${escapeHtml(prodName)}: ${statusLabel}</span>`;
                  }).join('')
                : '<span class="text-slate-400">—</span>';

              return `
                <tr class="hover:bg-slate-50/50 transition">
                  <td class="p-4 pl-6 text-slate-500">
                    <div class="font-medium text-slate-900">${dateStr}</div>
                    <div class="text-xs">${timeStr}</div>
                  </td>
                  <td class="p-4 font-semibold text-slate-900">${c.room ? c.room.number : '—'}</td>
                  <td class="p-4">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeClass}">
                      ${typeLabel}
                    </span>
                  </td>
                  <td class="p-4 text-slate-600">${escapeHtml(c.inspectorName || 'Анна')}</td>
                  <td class="p-4 text-slate-500 italic max-w-xs truncate" title="${escapeHtml(c.notes || '')}">
                    ${escapeHtml(c.notes || '—')}
                  </td>
                  <td class="p-4 pr-6">${itemsStr}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
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
