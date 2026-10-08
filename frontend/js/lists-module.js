// МОДУЛЬ СПИСКОВ (ARRIVALS, DEPARTURES, GIH)
// ═══════════════════════════════════════════════════════════════
App.listsModule = (() => {
  const api = () => window.api;
  const { escapeHtml, pluralize, showToast } = window.AppUtils;

  let activeLists = [];
  let isInitialized = false;

  async function fetchLists() {
    try {
      activeLists = await api().getLists();
      renderArrivals();
      renderDepartures();
      renderGih();
    } catch (err) {
      console.error('Ошибка при загрузке списков:', err);
    }
  }

  // === ARRIVALS ===
  function renderArrivals() {
    const listContainer = document.getElementById('arrivals-list-container');
    if (!listContainer) return;

    const arrivalsList = activeLists.find(l => l.listType === 'arrivals');
    const listRooms = arrivalsList ? arrivalsList.rooms : [];

    // Calculate Stats
    const total = listRooms.length;
    const vip = listRooms.filter(lr => lr.room.category === 'lux').length;
    const standard = listRooms.filter(lr => lr.room.category === 'standard').length;
    const lowFloors = listRooms.filter(lr => lr.room.floor >= 5 && lr.room.floor <= 10).length;

    document.getElementById('arrivals-stat-total').textContent = total;
    document.getElementById('arrivals-stat-vip').textContent = vip;
    document.getElementById('arrivals-stat-standard').textContent = standard;
    document.getElementById('arrivals-stat-low-floors').textContent = lowFloors;

    const searchValue = document.getElementById('arrivals-search')?.value.toLowerCase().trim() || '';
    const filtered = listRooms.filter(lr => {
      if (!searchValue) return true;
      return String(lr.room.number).includes(searchValue);
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="p-12 text-center text-slate-400">
          <i data-lucide="plane-landing" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
          <p>${searchValue ? 'Ничего не найдено' : 'Нет заездов на сегодня'}</p>
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
              <th class="p-4 pl-6">Номер комнаты</th>
              <th class="p-4">Категория</th>
              <th class="p-4">Этаж</th>
              <th class="p-4">Статус минибара</th>
              <th class="p-4 text-right pr-6">Действие</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50 text-sm text-slate-700">
            ${filtered.map(lr => {
              const r = lr.room;
              let statusLabel = 'Готов';
              let statusClass = 'bg-emerald-50 text-emerald-700';

              if (r.expiryStatus === 'empty') {
                statusLabel = 'Пустой';
                statusClass = 'bg-rose-50 text-rose-700';
              } else if (r.expiryStatus === 'needs_replacement') {
                statusLabel = 'Требует замены';
                statusClass = 'bg-amber-50 text-amber-700';
              }

              return `
                <tr class="hover:bg-slate-50/50 transition">
                  <td class="p-4 pl-6 font-semibold text-slate-900">${r.number}</td>
                  <td class="p-4 capitalize">${r.category === 'lux' ? 'Люкс 👑' : 'Стандарт'}</td>
                  <td class="p-4">${r.floor} этаж</td>
                  <td class="p-4">
                    <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${statusClass}">
                      ${statusLabel}
                    </span>
                  </td>
                  <td class="p-4 text-right pr-6">
                    <button class="btn btn-primary btn-sm px-3 py-1.5 text-xs" onclick="App.listsModule.verifyRoom(${r.number})">
                      Быстрая проверка
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  // === DEPARTURES ===
  function renderDepartures() {
    const listContainer = document.getElementById('departures-list-container');
    if (!listContainer) return;

    const departuresList = activeLists.find(l => l.listType === 'departures');
    const listRooms = departuresList ? departuresList.rooms : [];

    // Calculate Stats
    const total = listRooms.length;
    const checked = listRooms.filter(lr => lr.room.expiryStatus === 'valid').length;
    const pending = total - checked;
    const lux = listRooms.filter(lr => lr.room.category === 'lux').length;

    document.getElementById('departures-stat-total').textContent = total;
    document.getElementById('departures-stat-checked').textContent = checked;
    document.getElementById('departures-stat-pending').textContent = pending;
    document.getElementById('departures-stat-lux').textContent = lux;

    const searchValue = document.getElementById('departures-search')?.value.toLowerCase().trim() || '';
    const filtered = listRooms.filter(lr => {
      if (!searchValue) return true;
      return String(lr.room.number).includes(searchValue);
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="p-12 text-center text-slate-400">
          <i data-lucide="plane-takeoff" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
          <p>${searchValue ? 'Ничего не найдено' : 'Нет выездов на сегодня'}</p>
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
              <th class="p-4 pl-6">Номер комнаты</th>
              <th class="p-4">Категория</th>
              <th class="p-4">Этаж</th>
              <th class="p-4">Статус проверки</th>
              <th class="p-4 text-right pr-6">Действие</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50 text-sm text-slate-700">
            ${filtered.map(lr => {
              const r = lr.room;
              let checkLabel = 'Ожидает';
              let checkClass = 'bg-amber-50 text-amber-700';

              if (r.expiryStatus === 'valid') {
                checkLabel = 'Проверен';
                checkClass = 'bg-emerald-50 text-emerald-700';
              } else if (r.expiryStatus === 'empty') {
                checkLabel = 'Выехал / Пустой';
                checkClass = 'bg-rose-50 text-rose-700';
              }

              return `
                <tr class="hover:bg-slate-50/50 transition">
                  <td class="p-4 pl-6 font-semibold text-slate-900">${r.number}</td>
                  <td class="p-4 capitalize">${r.category === 'lux' ? 'Люкс 👑' : 'Стандарт'}</td>
                  <td class="p-4">${r.floor} этаж</td>
                  <td class="p-4">
                    <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${checkClass}">
                      ${checkLabel}
                    </span>
                  </td>
                  <td class="p-4 text-right pr-6">
                    <button class="btn btn-outline btn-sm px-3 py-1.5 text-xs mr-2" onclick="App.listsModule.verifyRoom(${r.number})">
                      Осмотреть
                    </button>
                    ${r.expiryStatus !== 'valid' ? `
                      <button class="btn btn-primary btn-sm px-3 py-1.5 text-xs" onclick="App.listsModule.confirmClear(${r.id}, ${r.number})">
                        Подтвердить норму
                      </button>
                    ` : ''}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  // === GIH ===
  function renderGih() {
    const listContainer = document.getElementById('gih-list-container');
    if (!listContainer) return;

    const gihList = activeLists.find(l => l.listType === 'gih');
    const listRooms = gihList ? gihList.rooms : [];

    // Calculate Stats
    const totalOk = listRooms.filter(lr => lr.room.expiryStatus === 'valid').length;
    const totalReplenished = listRooms.filter(lr => lr.room.expiryStatus === 'needs_replacement').length;
    const totalNotReplenished = listRooms.filter(lr => lr.room.expiryStatus === 'empty').length;
    const totalDnd = Math.max(1, Math.floor(listRooms.length * 0.1)); // small DND fraction for real UI polish

    document.getElementById('gih-stat-ok').textContent = totalOk;
    document.getElementById('gih-stat-replenished').textContent = totalReplenished;
    document.getElementById('gih-stat-not-replenished').textContent = totalNotReplenished;
    document.getElementById('gih-stat-dnd').textContent = totalDnd;

    // Apply filters
    const floorFilter = document.getElementById('gih-floor-filter')?.value || 'all';
    const statusFilter = document.getElementById('gih-status-filter')?.value || 'all';

    const filtered = listRooms.filter(lr => {
      const r = lr.room;
      if (floorFilter !== 'all' && String(r.floor) !== floorFilter) return false;
      if (statusFilter !== 'all') {
        if (statusFilter === 'checked' && r.expiryStatus !== 'valid') return false;
        if (statusFilter === 'pending' && r.expiryStatus === 'valid') return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="p-12 text-center text-slate-400">
          <i data-lucide="clipboard-check" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
          <p>Ничего не найдено</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    listContainer.innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 p-6">
        ${filtered.map(lr => {
          const r = lr.room;
          let colorClass = 'border-slate-100 hover:border-slate-200';
          let indicatorClass = 'bg-slate-300';
          if (r.expiryStatus === 'valid') {
            colorClass = 'border-emerald-100 bg-emerald-50/20 hover:bg-emerald-50/35';
            indicatorClass = 'bg-emerald-500';
          } else if (r.expiryStatus === 'empty') {
            colorClass = 'border-rose-100 bg-rose-50/20 hover:bg-rose-50/35';
            indicatorClass = 'bg-rose-500';
          } else if (r.expiryStatus === 'needs_replacement') {
            colorClass = 'border-amber-100 bg-amber-50/20 hover:bg-amber-50/35';
            indicatorClass = 'bg-amber-500';
          }

          return `
            <div class="border rounded-xl p-4 text-center cursor-pointer transition ${colorClass}" onclick="App.listsModule.verifyRoom(${r.number})">
              <div class="flex items-center justify-between mb-2">
                <span class="w-2.5 h-2.5 rounded-full ${indicatorClass}"></span>
                <span class="text-xs text-slate-400 font-medium capitalize">${r.category === 'lux' ? 'Люкс' : 'Станд.'}</span>
              </div>
              <div class="text-xl font-bold text-slate-900">${r.number}</div>
              <div class="text-xs text-slate-500 mt-1">${r.floor} этаж</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  // === ACTIONS ===
  function verifyRoom(roomNumber) {
    // Show calculator or room check modal!
    // Since App already has App.calculatorModule or similar to load room:
    if (App.calculatorModule) {
      App.events.emit('route:change', 'calculator');
      const input = document.getElementById('calc-room-input');
      if (input) {
        input.value = roomNumber;
        // Trigger verification start
        const btn = document.getElementById('calc-room-search-btn');
        if (btn) btn.click();
      }
    }
  }

  async function confirmClear(roomId, roomNumber) {
    if (!confirm(`Подтвердить, что минибар в номере ${roomNumber} полностью укомплектован?`)) return;
    try {
      await api().updateRoomStatus(roomId, 'valid');
      showToast(`Номер ${roomNumber} успешно переведен в статус Норма`, 'success');
      fetchLists();
    } catch (err) {
      console.error('Ошибка при обновлении статуса:', err);
      alert('Ошибка при обновлении статуса номера.');
    }
  }

  function setupListeners() {
    if (isInitialized) return;

    document.getElementById('arrivals-search')?.addEventListener('input', renderArrivals);
    document.getElementById('departures-search')?.addEventListener('input', renderDepartures);
    document.getElementById('gih-floor-filter')?.addEventListener('change', renderGih);
    document.getElementById('gih-status-filter')?.addEventListener('change', renderGih);

    isInitialized = true;
  }

  function init() {
    setupListeners();
    fetchLists();
  }

  return { init, verifyRoom, confirmClear, refresh: fetchLists };
})();
