// МОДУЛЬ СРОКИ ГОДНОСТИ
// ═══════════════════════════════════════════════════════════════
App.deadlinesModule = (() => {
  let rooms = [];
  let currentRoom = null;
  let productSelections = {};
  let modalProductos = [];
  let isInitialized = false;
  let monthManageProducts = [];

  let _cachedTargetsData = null;
  let _cachedTargetsTime = 0;
  const TARGETS_CACHE_MS = 500;

  const api = () => window.api;
  const { escapeHtml } = window.AppUtils;

  const colorMap = {
    amber: 'bg-amber-50', red: 'bg-red-50', blue: 'bg-blue-50',
    yellow: 'bg-yellow-50', purple: 'bg-purple-50', emerald: 'bg-emerald-50',
    rose: 'bg-rose-50', orange: 'bg-orange-50', slate: 'bg-slate-100'
  };
  const categories = ['Дверца', 'Напитки', 'Алкоголь', 'Соки'];
  const statusLabels = {
    'neutral': 'Не проверен',
    'valid': 'В порядке',
    'empty': 'Пустой',
    'needs_replacement': 'Требует замены'
  };

  function invalidateTargetsCache() {
    _cachedTargetsData = null;
    _cachedTargetsTime = 0;
  }

  // ── Мобильная структура: плашка статистики + шторка деталей ──
  // Собирается один раз при первом входе в раздел (index.html не трогаем)
  function ensureMobileStructure() {
    if (document.getElementById('deadlines-stats-bar')) return;
    const view = document.getElementById('view-deadlines');
    if (!view) return;

    const grids = view.querySelectorAll('.grid.grid-cols-4');
    if (grids.length < 3) return; // [0]=статистика, [1]=график+цели, [2]=на проверку+замены

    grids[0].classList.add('dl-stats-grid');

    const bar = document.createElement('div');
    bar.id = 'deadlines-stats-bar';
    bar.className = 'dl-stats-bar';
    bar.innerHTML = `
      <div class="dl-stats-bar-left">
        <i data-lucide="bar-chart-3" class="w-4 h-4 text-slate-500"></i>
        <span>Статистика</span>
      </div>
      <div class="dl-stats-bar-nums">
        <span class="dl-mini-stat c-emerald" id="mstat-valid" title="В порядке">0</span>
        <span class="dl-mini-stat c-sky" id="mstat-empty" title="Пустые">0</span>
        <span class="dl-mini-stat c-rose" id="mstat-needs" title="Заменить">0</span>
        <span class="dl-mini-stat c-slate" id="mstat-neutral" title="Не проверены">0</span>
      </div>
      <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400"></i>
    `;
    grids[0].parentNode.insertBefore(bar, grids[0]);

    // Фон шторки (только телефон)
    const backdrop = document.createElement('div');
    backdrop.id = 'deadlines-stats-backdrop';
    backdrop.className = 'dl-stats-backdrop hidden';
    // Шторка в едином стиле «Ещё»: ручка + шапка + скролл-тело
    const details = document.createElement('div');
    details.id = 'deadlines-details';
    details.className = 'dl-details';
    details.innerHTML = `
      <div class="ms-drag-zone dl-sheet-dragzone">
        <div class="ms-handle modal-sheet-handle"></div>
        <div class="ms-header-row dl-details-header">
          <span class="ms-title dl-details-title">Аналитика</span>
          <button id="deadlines-details-close" class="ms-close-btn" type="button" aria-label="Закрыть">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
      <div class="dl-sheet-body"></div>
    `;
    grids[1].parentNode.insertBefore(backdrop, grids[1]);
    backdrop.parentNode.insertBefore(details, backdrop.nextSibling);
    const body = details.querySelector('.dl-sheet-body');
    body.appendChild(grids[1]);
    body.appendChild(grids[2]);

    if (window.lucide) lucide.createIcons();
  }

  function openDetails() {
    const d = document.getElementById('deadlines-details');
    if (!d) return;
    setupDetailsSheet(); // свайп + фон — один раз
    const backdrop = document.getElementById('deadlines-stats-backdrop');
    if (backdrop) {
      backdrop.classList.remove('hidden');
      requestAnimationFrame(() => requestAnimationFrame(() => backdrop.classList.add('show')));
    }
    d.classList.add('open');
    setTimeout(() => renderChart(), 340); // пересчитать canvas после выезда
  }
  function closeDetails() {
    const d = document.getElementById('deadlines-details');
    const backdrop = document.getElementById('deadlines-stats-backdrop');
    if (d) d.classList.remove('open');
    if (backdrop) {
      backdrop.classList.remove('show');
      setTimeout(() => backdrop.classList.add('hidden'), 280);
    }
  }
  // Свайп вниз за ручку/шапку + закрытие по фону
  function setupDetailsSheet() {
    const d = document.getElementById('deadlines-details');
    if (!d || d.dataset.sheetSwipe) return;
    d.dataset.sheetSwipe = '1';
    document.getElementById('deadlines-stats-backdrop')?.addEventListener('click', closeDetails);
    const zone = d.querySelector('.dl-sheet-dragzone');
    if (!zone) return;
    let startY = 0, dy = 0, dragging = false;
    zone.addEventListener('touchstart', (e) => {
      dragging = true; startY = e.touches[0].clientY; dy = 0;
      d.style.transition = 'none';
    }, { passive: true });
    zone.addEventListener('touchmove', (e) => {
      if (!dragging) return;
      dy = Math.max(0, e.touches[0].clientY - startY);
      d.style.transform = `translateY(${dy}px)`;
    }, { passive: true });
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      d.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0.24, 1)';
      if (dy > 90) {
        d.style.transform = 'translateY(105%)';
        setTimeout(() => { closeDetails(); d.style.transform = ''; d.style.transition = ''; }, 240);
      } else {
        d.style.transform = '';
        setTimeout(() => { d.style.transition = ''; }, 260);
      }
    };
    zone.addEventListener('touchend', endDrag);
    zone.addEventListener('touchcancel', endDrag);
  }

  async function loadRooms() {
    try {
      rooms = await api().getRooms();
      render();
    } catch (err) {
      console.error('❌ Ошибка загрузки номеров:', err);
      const container = document.getElementById('deadlines-floors-container');
      if (container) container.innerHTML =
        `<div class="text-center py-12 text-rose-500">Ошибка: ${err.message}</div>`;
    }
  }

  function render() {
    renderStats();
    renderFloors();
  }

  function renderStats() {
    const total = rooms.length || 1;
    const counts = {
      valid: rooms.filter(r => r.expiryStatus === 'valid').length,
      empty: rooms.filter(r => r.expiryStatus === 'empty').length,
      needs_replacement: rooms.filter(r => r.expiryStatus === 'needs_replacement').length,
      neutral: rooms.filter(r => r.expiryStatus === 'neutral').length
    };
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    // Десктоп-карточки
    set('stat-valid', counts.valid);
    set('stat-empty', counts.empty);
    set('stat-needs-replacement', counts.needs_replacement);
    set('stat-neutral', counts.neutral);
    const pct = (n) => Math.round((n / total) * 100) + '%';
    set('stat-valid-pct', pct(counts.valid));
    set('stat-empty-pct', pct(counts.empty));
    set('stat-needs-pct', pct(counts.needs_replacement));
    set('stat-neutral-pct', pct(counts.neutral));

    // Мини-цифры в мобильной плашке
    set('mstat-valid', counts.valid);
    set('mstat-empty', counts.empty);
    set('mstat-needs', counts.needs_replacement);
    set('mstat-neutral', counts.neutral);
  }

  async function renderChart() {
    try {
      const data = await _loadChartStats();
      const canvas = document.getElementById('deadlines-chart');
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0) return; // блок скрыт — не рисуем
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;
      const isMobile = width < 520;
      const padding = isMobile
        ? { top: 44, right: 12, bottom: 24, left: 30 }
        : { top: 30, right: 70, bottom: 30, left: 40 };

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      const now = new Date();
      const todayDay = now.getDate();
      const chartYear = data.currentYear || now.getFullYear();
      const chartMonth = data.currentMonth || (now.getMonth() + 1);
      const prevMonth = chartMonth === 1 ? 12 : chartMonth - 1;
      const prevYear = chartMonth === 1 ? chartYear - 1 : chartYear;
      const { parseDbDate } = window.AppUtils;

      const fillCurrentMonth = (stats) => {
        const filled = [];
        for (let day = 1; day <= todayDay; day++) {
          const existing = stats.find(s => {
            const p = parseDbDate(s.date);
            return p.day === day && p.month === chartMonth && p.year === chartYear;
          });
          filled.push(existing || {
            date: new Date(Date.UTC(chartYear, chartMonth - 1, day)),
            validCount: 0, emptyCount: 0, needsReplacementCount: 0, neutralCount: 0
          });
        }
        return filled;
      };

      const fillPrevMonth = (stats) => {
        const filled = [];
        const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
        for (let day = 1; day <= daysInPrevMonth; day++) {
          const existing = stats.find(s => {
            const p = parseDbDate(s.date);
            return p.day === day && p.month === prevMonth && p.year === prevYear;
          });
          filled.push(existing || {
            date: new Date(Date.UTC(prevYear, prevMonth - 1, day)),
            validCount: 0, emptyCount: 0, needsReplacementCount: 0, neutralCount: 0
          });
        }
        return filled;
      };

      const currentStats = fillCurrentMonth(data.current || []);
      const prevStats = fillPrevMonth(data.previous || []);

      if (currentStats.length === 0 && prevStats.length === 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Данные появятся после первых проверок', width / 2, height / 2);
        return;
      }

      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      const allStats = [...currentStats, ...prevStats];
      const maxCount = Math.max(10, ...allStats.map(s => Math.max(s.validCount, s.emptyCount, s.needsReplacementCount)));
      const yMax = Math.ceil(maxCount / 5) * 5;

      const maxDays = Math.max(currentStats.length, prevStats.length);
      const getX = (i) => padding.left + (chartWidth / Math.max(1, maxDays - 1)) * i;
      const getY = (value) => padding.top + chartHeight - (value / yMax) * chartHeight;

      const gridLines = 5;
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (chartHeight / gridLines) * i;
        const value = Math.round(yMax - (yMax / gridLines) * i);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.fillText(value.toString(), padding.left - 8, y);
      }

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const dayStep = isMobile ? 7 : 5;
      for (let i = 0; i < maxDays; i++) {
        const day = i + 1;
        if (day === 1 || day % dayStep === 0 || day === maxDays) {
          ctx.fillText(day.toString(), getX(i), padding.top + chartHeight + 6);
        }
      }

      const lines = [
        { key: 'validCount', label: 'В порядке', color: '#10b981', fillStart: 'rgba(16, 185, 129, 0.20)', fillEnd: 'rgba(16, 185, 129, 0)' },
        { key: 'emptyCount', label: 'Пустые', color: '#0ea5e9', fillStart: 'rgba(14, 165, 233, 0.20)', fillEnd: 'rgba(14, 165, 233, 0)' },
        { key: 'needsReplacementCount', label: 'Заменить', color: '#f43f5e', fillStart: 'rgba(244, 63, 94, 0.20)', fillEnd: 'rgba(244, 63, 94, 0)' }
      ];

      const drawSmoothLine = (points) => {
        if (points.length < 2) {
          if (points.length === 1) ctx.moveTo(points[0].x, points[0].y);
          return;
        }
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length - 1; i++) {
          const p0 = points[Math.max(0, i - 1)];
          const p1 = points[i];
          const p2 = points[i + 1];
          const p3 = points[Math.min(points.length - 1, i + 2)];
          const tension = 0.2;
          const cp1x = p1.x + (p2.x - p0.x) * tension;
          const cp2x = p2.x - (p3.x - p1.x) * tension;
          let cp1y = p1.y + (p2.y - p0.y) * tension;
          let cp2y = p2.y - (p3.y - p1.y) * tension;
          const minY = Math.min(p1.y, p2.y);
          const maxY = Math.max(p1.y, p2.y);
          cp1y = Math.max(minY, Math.min(maxY, cp1y));
          cp2y = Math.max(minY, Math.min(maxY, cp2y));
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }
      };

      const drawLines = (stats, config) => {
        lines.forEach(line => {
          if (stats.length === 0) return;
          const points = stats.map((s, i) => ({ x: getX(i), y: getY(s[line.key]) }));
          ctx.globalAlpha = config.opacity;

          if (config.showFill) {
            const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
            gradient.addColorStop(0, line.fillStart);
            gradient.addColorStop(1, line.fillEnd);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(points[0].x, padding.top + chartHeight);
            ctx.lineTo(points[0].x, points[0].y);
            drawSmoothLine(points);
            ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
            ctx.closePath();
            ctx.fill();
          }

          ctx.strokeStyle = line.color;
          ctx.lineWidth = config.lineWidth;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.setLineDash(config.dash);
          ctx.beginPath();
          drawSmoothLine(points);
          ctx.stroke();
          ctx.setLineDash([]);

          if (config.showPoints) {
            const lastPointValue = stats[stats.length - 1][line.key];
            const showBadgeOnLast = config.showCurrentValue && lastPointValue > 0;
            points.forEach((p, i) => {
              const value = stats[i][line.key];
              const isLast = i === points.length - 1;
              if (value > 0 && !(isLast && showBadgeOnLast)) {
                ctx.fillStyle = 'white';
                ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = line.color;
                ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill();
              }
            });
          }

          if (config.showCurrentValue) {
            const lastPoint = points[points.length - 1];
            const lastValue = stats[stats.length - 1][line.key];
            if (lastValue <= 0) return;
            const label = lastValue.toString();
            const radius = label.length === 1 ? 11 : label.length === 2 ? 13 : 15;
            // Не даём бейджу вылезти за край
            const cx = Math.min(Math.max(lastPoint.x, padding.left + radius), width - padding.right - radius);
            ctx.fillStyle = line.color;
            ctx.beginPath(); ctx.arc(cx, lastPoint.y, radius, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(cx, lastPoint.y, radius, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${label.length > 2 ? 9 : 10}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, cx, lastPoint.y + 0.5);
          }
          ctx.globalAlpha = 1;
        });
      };

      if (prevStats.length > 0 && prevStats.some(s => s.validCount + s.emptyCount + s.needsReplacementCount > 0)) {
        drawLines(prevStats, { opacity: 0.3, lineWidth: 1.5, dash: [4, 4], showFill: false, showPoints: false, showCurrentValue: false });
      }
      drawLines(currentStats, { opacity: 1, lineWidth: 2.5, dash: [], showFill: true, showPoints: true, showCurrentValue: true });

      // Заголовок месяцев
      const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
      const currentMonthName = monthNames[chartMonth - 1];
      const prevMonthName = monthNames[prevMonth - 1];
      ctx.fillStyle = '#64748b';
      ctx.font = '13px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`${currentMonthName} vs ${prevMonthName}`, padding.left, 6);

      // Легенда: на десктопе справа вверху, на мобиле — второй строкой
      const drawLegendItem = (line, x, y) => {
        ctx.fillStyle = '#475569';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        const tw = ctx.measureText(line.label).width;
        ctx.fillText(line.label, x, y);
        const lineEnd = x - tw - 6;
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(lineEnd - 16, y); ctx.lineTo(lineEnd, y); ctx.stroke();
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(lineEnd - 8, y, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = line.color;
        ctx.beginPath(); ctx.arc(lineEnd - 8, y, 2, 0, Math.PI * 2); ctx.fill();
        return lineEnd - 16 - 12; // следующий X
      };

      if (isMobile) {
        let lx = width - padding.right;
        [...lines].reverse().forEach(line => { lx = drawLegendItem(line, lx, 26); });
      } else {
        let lx = width - padding.right;
        [...lines].reverse().forEach(line => { lx = drawLegendItem(line, lx, 10); });
      }
    } catch (err) {
      console.error('Ошибка рендера графика:', err);
    }
  }

  function getRoomClasses(status) {
    const base = 'room-cell text-white font-bold shadow-md';
    const map = {
      'neutral': base + ' bg-gradient-to-br from-slate-400 to-slate-500',
      'valid': base + ' bg-gradient-to-br from-emerald-500 to-emerald-600',
      'empty': base + ' bg-gradient-to-br from-sky-500 to-sky-600',
      'needs_replacement': base + ' bg-gradient-to-br from-rose-500 to-rose-600'
    };
    return map[status] || map['neutral'];
  }

  function renderFloors() {
    const container = document.getElementById('deadlines-floors-container');
    if (!container) return;
    const byFloor = {};
    rooms.forEach(r => {
      if (!byFloor[r.floor]) byFloor[r.floor] = [];
      byFloor[r.floor].push(r);
    });
    const floors = Object.keys(byFloor).map(Number).sort((a, b) => a - b);
    if (floors.length === 0) {
      container.innerHTML = '<div class="text-center py-12 text-slate-400">Нет номеров</div>';
      return;
    }
    container.innerHTML = floors.map(floor => {
      const floorRooms = byFloor[floor].sort((a, b) => a.number - b.number);
      const counts = {
        neutral: floorRooms.filter(r => r.expiryStatus === 'neutral').length,
        valid: floorRooms.filter(r => r.expiryStatus === 'valid').length,
        empty: floorRooms.filter(r => r.expiryStatus === 'empty').length,
        needs: floorRooms.filter(r => r.expiryStatus === 'needs_replacement').length
      };
      return `
        <div class="floor-section">
          <div class="floor-header">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <span class="font-bold text-sm text-slate-700">${floor}</span>
              </div>
              <div>
                <div class="font-semibold text-sm text-slate-900">Этаж ${floor}</div>
                <div class="text-xs text-slate-500">${floorRooms.length} номеров</div>
              </div>
            </div>
            <div class="flex gap-2 text-xs">
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-slate-400"></span><span class="text-slate-600">${counts.neutral}</span></span>
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span><span class="text-slate-600">${counts.valid}</span></span>
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-sky-500"></span><span class="text-slate-600">${counts.empty}</span></span>
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-rose-500"></span><span class="text-slate-600">${counts.needs}</span></span>
            </div>
          </div>
          <div class="rooms-grid">
            ${floorRooms.map(r => `
              <div class="${getRoomClasses(r.expiryStatus)}" 
                   onclick="App.deadlinesModule.openRoomModal(${r.id})"
                   title="${r.number} · ${statusLabels[r.expiryStatus] || r.expiryStatus}">
                ${r.number}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
    if (window.lucide) lucide.createIcons();
  }

  async function openRoomModal(roomId) {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    currentRoom = room;
    productSelections = {};
    const items = room.template?.items || [];
    modalProductos = items
      .filter(i => i.product.hasExpiry)
      .map(i => ({
        id: i.product.id, name: i.product.name, volume: i.product.volume,
        unit: i.product.unit, emoji: i.product.emoji, bgColor: i.product.bgColor,
        category: i.product.category, maxQty: i.qty
      }));
    try {
      const statuses = await _loadStatuses(roomId);
      statuses.forEach(s => {
        if (s.qtyToReplace > 0) productSelections[s.productId] = s.qtyToReplace;
      });
    } catch (err) {
      console.warn('Не удалось загрузить статусы продуктов:', err);
    }
    document.getElementById('deadline-modal-room-number').textContent = room.number;
    document.getElementById('deadline-modal-room-info').textContent =
      `Этаж ${room.floor} · ${room.category === 'lux' ? 'Люкс' : 'Стандарт'} · ${statusLabels[room.expiryStatus] || room.expiryStatus}`;
    renderModalProducts();
    document.getElementById('deadline-modal-backdrop').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  function renderModalProducts() {
    const container = document.getElementById('deadline-modal-products');
    if (!container) return;
    if (modalProductos.length === 0) {
      container.innerHTML = `
        <div class="col-span-4 text-center py-6 text-slate-400">
          <i data-lucide="package-x" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
          <p class="text-xs">Нет продуктов со сроком годности</p>
        </div>`;
      if (window.lucide) lucide.createIcons();
      return;
    }
    const grouped = {};
    categories.forEach(c => grouped[c] = []);
    modalProductos.forEach(p => {
      const cat = p.category || 'Напитки';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    });
    container.innerHTML = `<div class="grid grid-cols-4 gap-3">
      ${categories.map(cat => {
        const items = grouped[cat] || [];
        return `
        <div class="flex flex-col">
          <div class="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
            <span class="w-2 h-2 rounded-full bg-slate-400"></span>
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">${cat}</span>
          </div>
          <div class="space-y-2 flex-1">
            ${items.length === 0
              ? `<div class="text-center py-4 text-slate-300 text-xs">—</div>`
              : items.map(p => {
                  const count = productSelections[p.id] || 0;
                  const emoji = p.emoji || p.name.charAt(0).toUpperCase();
                  const colorClass = colorMap[p.bgColor] || 'bg-slate-100';
                  return `
                    <div class="deadline-product-card ${count > 0 ? 'selected' : ''}" 
                         onclick="App.deadlinesModule.clickProduct(${p.id})">
                      ${count > 0 ? `<div class="deadline-product-counter">${count}</div>` : ''}
                      <div class="flex items-center gap-2">
                        <div class="w-9 h-9 rounded-lg ${colorClass} flex items-center justify-center text-lg flex-shrink-0">${emoji}</div>
                        <div class="flex-1 min-w-0">
                          <div class="deadline-product-name text-xs font-semibold text-slate-900 truncate">${p.name}</div>
                          <div class="deadline-product-meta text-[10px] text-slate-500">${p.volume || '—'} ${p.unit || 'шт'}</div>
                        </div>
                      </div>
                    </div>`;
                }).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>`;
    if (window.lucide) lucide.createIcons();
  }

  function clickProduct(productId) {
    const product = modalProductos.find(p => p.id === productId);
    if (!product) return;
    const current = productSelections[productId] || 0;
    const next = current >= product.maxQty ? 0 : current + 1;
    if (next === 0) delete productSelections[productId];
    else productSelections[productId] = next;
    renderModalProducts();
  }

  async function _loadChartStats() { return api().getDeadlineStats(); }
  async function _saveStatuses(roomId, items, roomStatus) { return api().saveRoomProductStatuses(roomId, items, roomStatus); }
  async function _clearStatuses(roomId, roomStatus) { return api().clearRoomProductStatuses(roomId, roomStatus); }
  async function _loadStatuses(roomId) { return api().getRoomProductStatuses(roomId); }

  async function _loadTargets() {
    const now = Date.now();
    if (_cachedTargetsData && (now - _cachedTargetsTime) < TARGETS_CACHE_MS) {
      return _cachedTargetsData;
    }
    const data = await api().getDeadlineTargets();
    _cachedTargetsData = data;
    _cachedTargetsTime = now;
    return data;
  }

  async function renderTargets() {
    try {
      const data = await _loadTargets();
      const container = document.getElementById('targets-container');
      if (!container) return;
      const { today, tomorrow, summary } = data;
      const remaining = Math.max(0, today.target - today.processed);
      container.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-center gap-2">
            <i data-lucide="target" class="w-4 h-4 text-amber-600"></i>
            <h3 class="font-bold text-amber-600 text-sm">Цели</h3>
          </div>
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Сегодня</span>
              <span class="text-xs font-semibold text-slate-900">${today.processed} / ${today.target}</span>
            </div>
            <div class="flex items-baseline gap-1 mb-2">
              <span class="text-4xl font-bold text-slate-900 leading-none">${today.processed}</span>
              <span class="text-base text-slate-400 font-medium">/ ${today.target}</span>
            </div>
            <div class="relative h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
              <div class="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                today.percentage >= 100 ? 'bg-emerald-500' : today.percentage >= 50 ? 'bg-sky-500' : 'bg-rose-500'
              }" style="width: ${Math.min(100, today.percentage)}%"></div>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-[11px] text-slate-500">${today.percentage >= 100 ? '✓ Цель выполнена' : `Осталось ${remaining}`}</span>
              <span class="text-xs font-bold text-slate-700">${today.percentage}%</span>
            </div>
          </div>
          <div class="border-t border-slate-100"></div>
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Завтра</span>
              <span class="text-[10px] text-slate-400">прогноз</span>
            </div>
            <div class="flex items-baseline gap-1">
              <span class="text-xl font-bold text-slate-700">${tomorrow.target}</span>
              <span class="text-xs text-slate-500">номеров</span>
            </div>
          </div>
          <div class="border-t border-slate-100"></div>
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500">До конца месяца</span>
              <span class="font-semibold text-slate-700">${tomorrow.daysLeft + 1} дн.</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500">Осталось номеров</span>
              <span class="font-semibold text-slate-900">${summary.badCount}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500">Прогресс месяца</span>
              <span class="font-semibold text-slate-900">${summary.totalRooms > 0 ? Math.round((summary.goodCount / summary.totalRooms) * 100) : 0}%</span>
            </div>
          </div>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    } catch (err) {
      console.error('Ошибка рендера целей:', err);
    }
  }

  function formatPeriodInput(value) {
    const digits = String(value).replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  }

  function productEmoji(product) {
    return product.emoji || (product.name || '?').charAt(0).toUpperCase();
  }

  async function renderMonthProducts() {
    const container = document.getElementById('deadlines-month-products-container');
    if (!container) return;
    try {
      const items = await api().getMonthProducts();
      if (items.length === 0) {
        container.innerHTML = `
          <div class="text-center py-4 text-slate-400 text-xs">
            <i data-lucide="calendar-off" class="w-5 h-5 mx-auto mb-1 opacity-50"></i>
            Нет продуктов на текущий и следующий месяц
          </div>`;
        if (window.lucide) lucide.createIcons();
        return;
      }
      container.innerHTML = items.map(item => {
        const p = item.product;
        const emoji = productEmoji(p);
        const colorClass = colorMap[p.bgColor] || 'bg-slate-100';
        return `
          <div class="deadlines-month-item mb-1.5">
            <div class="deadlines-month-item-emoji ${colorClass}">${emoji}</div>
            <span class="deadlines-month-item-name" title="${p.name}">${p.name}</span>
            <span class="deadlines-month-item-period">${item.period}</span>
          </div>`;
      }).join('');
      if (window.lucide) lucide.createIcons();
    } catch (err) {
      console.error('Ошибка загрузки продуктов месяца:', err);
      container.innerHTML = `<div class="text-center py-4 text-rose-500 text-xs">${err.message}</div>`;
    }
  }

  async function renderReplacementSummary() {
    const container = document.getElementById('deadlines-replacement-container');
    const totalEl = document.getElementById('deadlines-replacement-total');
    if (!container) return;
    try {
      const data = await api().getReplacementSummary();
      const items = data.items || [];
      if (totalEl) totalEl.textContent = items.length > 0 ? `Всего: ${data.totalQty || 0} шт.` : '';
      if (items.length === 0) {
        container.innerHTML = `
          <div class="text-center py-4 text-slate-400 text-xs">
            <i data-lucide="check-circle" class="w-5 h-5 mx-auto mb-1 opacity-50"></i>
            Нет продуктов, требующих замены
          </div>`;
        if (window.lucide) lucide.createIcons();
        return;
      }
      container.innerHTML = `
        <div class="deadlines-replacement-grid">
          ${items.map(item => {
            const p = item.product;
            const emoji = productEmoji(p);
            const colorClass = colorMap[p.bgColor] || 'bg-slate-100';
            return `
              <div class="deadlines-replacement-card" title="${p.name}">
                <div class="deadlines-replacement-card-emoji ${colorClass}">${emoji}</div>
                <span class="deadlines-replacement-card-name">${p.name}</span>
                <span class="deadlines-replacement-card-qty">${item.totalQty}</span>
              </div>`;
          }).join('')}
        </div>`;
      if (window.lucide) lucide.createIcons();
    } catch (err) {
      console.error('Ошибка загрузки замен:', err);
      container.innerHTML = `<div class="text-center py-4 text-rose-500 text-xs">${err.message}</div>`;
    }
  }

  async function refreshDeadlinesExtras() {
    await Promise.all([renderMonthProducts(), renderReplacementSummary()]);
  }

  // ── Модал «Добавить сроки»: новые карточки ──
  function renderMonthModalList() {
    const container = document.getElementById('deadline-month-modal-list');
    if (!container) return;

    const hint = `
      <div class="month-check-hint">
        <i data-lucide="info" class="w-4 h-4"></i>
        <span>Укажите месяц проверки в формате <b>ММ.ГГ</b> (например 08.26). Продукт попадёт в блок «На проверку» в этом и следующем месяце. Нажмите <b>×</b> на дате, чтобы удалить её.</span>
      </div>`;

    if (monthManageProducts.length === 0) {
      container.innerHTML = hint + `<div class="text-center py-8 text-slate-400 text-sm">Нет продуктов со сроком годности</div>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    container.innerHTML = hint + monthManageProducts.map(p => {
      const emoji = productEmoji(p);
      const colorClass = colorMap[p.bgColor] || 'bg-slate-100';
      const checks = p.monthChecks || [];
      const chips = checks.length === 0
        ? `<span class="month-check-none">Даты не заданы</span>`
        : checks.map(c => `
            <span class="month-check-chip">
              <span>${c.period}</span>
              <button type="button" class="month-check-chip-del" data-check-id="${c.id}" title="Удалить дату">
                <i data-lucide="x" class="w-3 h-3"></i>
              </button>
            </span>`).join('');
      return `
        <div class="month-check-card">
          <div class="month-check-card-top">
            <div class="month-check-emoji ${colorClass}">${emoji}</div>
            <div class="month-check-info">
              <div class="month-check-name">${escapeHtml(p.name)}</div>
              <div class="month-check-meta">${p.volume || '—'} ${p.unit || 'шт'}</div>
            </div>
          </div>
          <div class="month-check-dates">${chips}</div>
          <div class="month-check-add">
            <input type="text" class="month-check-input" maxlength="5" placeholder="ММ.ГГ"
                   data-product-id="${p.id}" inputmode="numeric" autocomplete="off" />
            <button type="button" class="btn btn-primary btn-sm month-check-save-btn" data-product-id="${p.id}">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i> Добавить
            </button>
          </div>
        </div>`;
    }).join('');

    container.querySelectorAll('.month-check-input').forEach(input => {
      input.addEventListener('input', () => { input.value = formatPeriodInput(input.value); });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveMonthProduct(parseInt(input.dataset.productId, 10), input.value, input);
        }
      });
    });
    container.querySelectorAll('.month-check-save-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const productId = parseInt(btn.dataset.productId, 10);
        const input = btn.closest('.month-check-card')?.querySelector('.month-check-input');
        saveMonthProduct(productId, input?.value || '', input);
      });
    });
    container.querySelectorAll('.month-check-chip-del').forEach(btn => {
      btn.addEventListener('click', () => clearMonthCheck(parseInt(btn.dataset.checkId, 10)));
    });

    if (window.lucide) lucide.createIcons();
  }

  async function openMonthModal() {
    const backdrop = document.getElementById('deadline-month-modal-backdrop');
    if (!backdrop) return;
    backdrop.classList.remove('hidden');
    const list = document.getElementById('deadline-month-modal-list');
    if (list) {
      list.innerHTML = `
        <div class="flex items-center justify-center py-8 text-slate-400 text-sm">
          <i data-lucide="loader-2" class="w-5 h-5 animate-spin mr-2"></i> Загрузка...
        </div>`;
    }
    if (window.lucide) lucide.createIcons();
    try {
      monthManageProducts = await api().getMonthProductsManage();
      renderMonthModalList();
    } catch (err) {
      console.error('Ошибка загрузки настроек месяца:', err);
      if (list) list.innerHTML = `<div class="text-center py-8 text-rose-500 text-sm">${err.message}</div>`;
    }
  }

  function closeMonthModal() {
    document.getElementById('deadline-month-modal-backdrop')?.classList.add('hidden');
    monthManageProducts = [];
  }

  async function saveMonthProduct(productId, rawPeriod, inputEl = null) {
    const period = formatPeriodInput(rawPeriod);
    if (period.length !== 5) {
      alert('Введите период в формате ММ.ГГ (например 11.26)');
      return;
    }
    try {
      await api().setMonthProduct(productId, period);
      if (inputEl) inputEl.value = '';
      monthManageProducts = await api().getMonthProductsManage();
      renderMonthModalList();
      await renderMonthProducts();
    } catch (err) {
      console.error('Ошибка сохранения периода:', err);
      alert(err.message || 'Не удалось сохранить');
    }
  }

  async function clearMonthCheck(checkId) {
    try {
      await api().deleteMonthCheck(checkId);
      monthManageProducts = await api().getMonthProductsManage();
      renderMonthModalList();
      await renderMonthProducts();
    } catch (err) {
      console.error('Ошибка удаления периода:', err);
      alert('Не удалось удалить: ' + err.message);
    }
  }

  async function clearProductsAndSetStatus(newStatus) {
    if (!currentRoom) return;
    try {
      await _clearStatuses(currentRoom.id, newStatus);
      invalidateTargetsCache();
      await loadRooms();
      await renderChart();
      await renderTargets();
      await refreshDeadlinesExtras();
      productSelections = {};
      closeModal();
    } catch (err) {
      console.error('❌ Ошибка:', err);
      alert('Не удалось обновить: ' + err.message);
    }
  }

  async function saveSelections() {
    if (!currentRoom) return;
    const hasSelections = Object.values(productSelections).some(c => c > 0);
    const newRoomStatus = hasSelections ? 'needs_replacement' : 'neutral';
    const items = Object.entries(productSelections)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, qty]) => ({
        productId: parseInt(productId),
        qtyToReplace: qty,
        expiryStatus: 'needs_replacement'
      }));
    try {
      await _saveStatuses(currentRoom.id, items, newRoomStatus);
      invalidateTargetsCache();
      await loadRooms();
      await renderChart();
      await renderTargets();
      await refreshDeadlinesExtras();
      productSelections = {};
      closeModal();
    } catch (err) {
      console.error('❌ Ошибка:', err);
      alert('Не удалось сохранить: ' + err.message);
    }
  }

  function setEmpty() { clearProductsAndSetStatus('empty'); }
  function setValid() { clearProductsAndSetStatus('valid'); }
  function reset() { clearProductsAndSetStatus('neutral'); }
  function save() { saveSelections(); }

  function closeModal() {
    document.getElementById('deadline-modal-backdrop')?.classList.add('hidden');
    currentRoom = null;
    productSelections = {};
    App.badges.update('deadlines');
  }

  function init() {
    ensureMobileStructure();

    if (!isInitialized) {
      document.getElementById('deadline-modal-backdrop')?.addEventListener('click', (e) => {
        if (e.target.id === 'deadline-modal-backdrop') closeModal();
      });
      document.getElementById('deadline-month-modal-backdrop')?.addEventListener('click', (e) => {
        if (e.target.id === 'deadline-month-modal-backdrop') closeMonthModal();
      });
      document.getElementById('deadline-month-modal-close')?.addEventListener('click', closeMonthModal);
      document.getElementById('deadlines-month-products-btn')?.addEventListener('click', openMonthModal);
      document.getElementById('deadlines-reset-all-btn')?.addEventListener('click', resetAllRooms);

      // Плашка → шторка деталей
      document.getElementById('deadlines-stats-bar')?.addEventListener('click', openDetails);
      document.getElementById('deadlines-details-close')?.addEventListener('click', closeDetails);

      // Перерисовка графика при смене ориентации/размера
      let resizeTimer = null;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (App.state.currentRoute === 'deadlines') renderChart();
        }, 250);
      });

      isInitialized = true;
    }

    loadRooms()
      .then(() => renderChart())
      .then(() => renderTargets())
      .then(() => refreshDeadlinesExtras());
  }

  async function resetAllRooms() {
    if (!confirm('Сбросить статусы всех номеров и продуктов? Это действие нельзя отменить.')) return;
    try {
      await api().resetAllDeadlines();
      invalidateTargetsCache();
      await loadRooms();
      await renderChart();
      await renderTargets();
      await refreshDeadlinesExtras();
    } catch (err) {
      console.error('❌ Ошибка сброса:', err);
      alert('Не удалось сбросить: ' + err.message);
    }
  }

  App.badges.register('deadlines', async () => {
    try {
      const data = await api().getDeadlineTargets();
      return Math.max(0, (data.today?.target || 0) - (data.today?.processed || 0));
    } catch {
      return 0;
    }
  });

  return {
    init, openRoomModal, clickProduct, closeModal,
    setEmpty, setValid, save, reset,
    openMonthModal, closeMonthModal
  };
})();
