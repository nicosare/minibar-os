App.departuresModule = (() => {
  'use strict';

  const SESSION_DATE = () => localDateKey(new Date());
  const state = {
    data: { dateKey: '', rooms: [], checkedToday: [] },
    session: { dateKey: SESSION_DATE(), fileName: '', pdfRooms: [], marks: {} },
    initialized: false,
    requestSequence: 0,
    pendingMarks: new Set(),
    parsingPdf: false,
    midnightTimer: null
  };

  const api = () => window.api;

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function localDateKey(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function emptySession(dateKey) {
    return { dateKey, fileName: '', pdfRooms: [], marks: {} };
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }

  function showFeedback(message, type = 'info') {
    const element = document.getElementById('departures-feedback');
    if (!element) return;
    element.textContent = message;
    element.className = 'departures-feedback is-' + type;
    element.hidden = !message;
  }

  function hideFeedback() {
    const element = document.getElementById('departures-feedback');
    if (element) {
      element.hidden = true;
      element.textContent = '';
      element.className = 'departures-feedback';
    }
  }

  function formatDate(dateKey) {
    const parts = String(dateKey || SESSION_DATE()).split('-').map(Number);
    if (parts.length !== 3 || !parts.every(Number.isFinite)) return '';
    return pad(parts[2]) + '.' + pad(parts[1]) + '.' + parts[0];
  }

  function formatTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '—';
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  function roomNumber(room) {
    return String(room && room.number != null ? room.number : '');
  }

  function roomsByNumber() {
    return new Map((state.data.rooms || []).map(room => [roomNumber(room), room]));
  }

  function checkedNumbers() {
    return new Set((state.data.checkedToday || []).map(item => String(item.number)));
  }

  function normalizePdfRooms() {
    const known = roomsByNumber();
    const result = [];
    const seen = new Set();
    (state.session.pdfRooms || []).forEach(value => {
      const key = String(Number(value));
      if (known.has(key) && !seen.has(key)) {
        seen.add(key);
        result.push(key);
      }
    });
    return result;
  }

  function currentWorkingRooms() {
    const byNumber = roomsByNumber();
    const checked = checkedNumbers();
    return normalizePdfRooms()
      .filter(number => !checked.has(number))
      .map(number => byNumber.get(number))
      .filter(Boolean)
      .sort((a, b) => Number(a.floor) - Number(b.floor) || Number(a.number) - Number(b.number));
  }

  function groupByFloor(rooms) {
    const groups = new Map();
    rooms.forEach(room => {
      const floor = Number(room.floor);
      const key = Number.isFinite(floor) ? String(floor) : '—';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(room);
    });
    return [...groups.entries()]
      .sort((a, b) => {
        if (a[0] === '—') return 1;
        if (b[0] === '—') return -1;
        return Number(a[0]) - Number(b[0]);
      })
      .map(([floor, items]) => ({
        floor,
        rooms: items.sort((a, b) => Number(a.number) - Number(b.number))
      }));
  }

  function renderFloorSections(rooms, mode) {
    if (!rooms.length) return '';
    const byNumber = roomsByNumber();
    const pdfSet = new Set(normalizePdfRooms());
    const sections = groupByFloor(rooms);
    return sections.map(section => {
      const tiles = section.rooms.map(room => {
        const number = roomNumber(room);
        const mark = state.session.marks && state.session.marks[number];
        const isCheckedEmpty = mode === 'checked' && room.expiryStatus === 'empty';
        const alreadyInPdf = mode === 'checked' && pdfSet.has(number);
        const classes = ['departure-room-tile'];
        if (mode === 'checked') {
          classes.push('departure-checked-tile');
          if (isCheckedEmpty) classes.push('is-empty');
          if (alreadyInPdf) classes.push('is-auto-excluded');
        } else {
          classes.push('departure-work-tile');
          if (mark === 'resident') classes.push('is-resident');
          if (mark === 'arrival') classes.push('is-arrival');
          if (state.pendingMarks.has(number)) classes.push('is-saving');
        }

        const meta = room.category === 'lux' ? 'Люкс' : 'Стандарт';
        let secondary = '<span class="departure-room-meta">' + escapeHtml(meta) + '</span>';
        if (mode === 'checked') {
          const checked = (state.data.checkedToday || []).find(item => String(item.number) === number);
          secondary = '<span class="departure-room-time">' + escapeHtml(formatTime(checked && checked.checkedAt)) + '</span>';
          if (isCheckedEmpty) {
            secondary += '<span class="departure-room-empty-tag"><i data-lucide="droplet"></i>Пустой</span>';
          }
          if (alreadyInPdf) {
            secondary += '<span class="departure-room-match-tag">Есть в PDF</span>';
          }
        } else {
          const label = mark === 'resident' ? 'Жилой' : mark === 'arrival' ? 'На заезд' : meta;
          secondary = '<span class="departure-room-meta">' + escapeHtml(label) + '</span>';
        }

        if (mode === 'checked') {
          return '<div class="' + classes.join(' ') + '" data-room-number="' + escapeHtml(number) + '">' +
            '<span class="departure-room-number">' + escapeHtml(number) + '</span>' +
            secondary + '</div>';
        }
        const aria = mark === 'resident' ? 'Номер ' + number + ', жилой. Следующий клик — на заезд.' :
          mark === 'arrival' ? 'Номер ' + number + ', на заезд. Следующий клик сбрасывает отметку.' :
          'Номер ' + number + ', без отметки. Первый клик исключает номер как жилой.';
        return '<button type="button" class="' + classes.join(' ') + '" data-departures-room="' +
          escapeHtml(number) + '" aria-label="' + escapeHtml(aria) + '"' +
          (state.pendingMarks.has(number) ? ' disabled' : '') + '>' +
          '<span class="departure-room-number">' + escapeHtml(number) + '</span>' +
          secondary + '</button>';
      }).join('');
      return '<section class="departure-floor-section" aria-label="' + escapeHtml(section.floor) + ' этаж">' +
        '<div class="departure-floor-heading"><span>' + escapeHtml(section.floor) + ' этаж</span>' +
        '<span class="departure-floor-count">' + section.rooms.length + '</span></div>' +
        '<div class="departure-room-grid">' + tiles + '</div></section>';
    }).join('');
  }

  function renderCheckedRooms() {
    const container = document.getElementById('departures-checked-list');
    const count = document.getElementById('departures-checked-count');
    if (!container) return;

    const byNumber = roomsByNumber();
    const checked = (state.data.checkedToday || [])
      .map(item => byNumber.get(String(item.number)))
      .filter(Boolean)
      .sort((a, b) => Number(a.floor) - Number(b.floor) || Number(a.number) - Number(b.number));

    if (count) count.textContent = String(checked.length);
    if (!checked.length) {
      container.innerHTML = '<div class="departures-empty-state"><span class="departures-empty-icon"><i data-lucide="messages-square"></i></span>' +
        '<strong>Сегодня пока нет проверенных номеров</strong><span>Номера появятся здесь автоматически после сообщений в беседе.</span></div>';
    } else {
      container.innerHTML = renderFloorSections(checked, 'checked');
    }
  }

  function renderWorkingRooms() {
    const container = document.getElementById('departures-work-list');
    const fileName = document.getElementById('departures-file-name');
    const printButton = document.getElementById('departures-print-btn');
    const finalCount = document.getElementById('departures-final-count');
    if (!container) return;

    if (fileName) fileName.textContent = state.session.fileName || 'PDF ещё не загружен';
    if (printButton) printButton.disabled = !state.session.fileName || state.parsingPdf;

    if (!state.session.fileName || !state.session.pdfRooms.length) {
      container.innerHTML = '<div class="departures-empty-state"><span class="departures-empty-icon"><i data-lucide="file-up"></i></span>' +
        '<strong>Загрузите PDF с выездами</strong><span>После обработки номера автоматически распределятся по этажам, а уже проверенные сегодня исключатся.</span>' +
        '<button type="button" class="btn btn-primary" data-departures-action="upload"><i data-lucide="upload"></i>Выбрать PDF</button></div>';
      if (finalCount) finalCount.textContent = '0';
      return;
    }

    const rooms = currentWorkingRooms();
    if (finalCount) finalCount.textContent = String(rooms.filter(room =>
      state.session.marks[roomNumber(room)] !== 'resident').length);

    if (!rooms.length) {
      container.innerHTML = '<div class="departures-empty-state"><span class="departures-empty-icon"><i data-lucide="check-circle-2"></i></span>' +
        '<strong>Все номера из PDF уже проверены</strong><span>В сегодняшней очереди больше нет номеров для проверки.</span></div>';
    } else {
      container.innerHTML = renderFloorSections(rooms, 'work');
    }
  }

  function renderStats() {
    const pdfRooms = normalizePdfRooms();
    const checked = checkedNumbers();
    const automaticallyExcluded = pdfRooms.filter(number => checked.has(number)).length;
    const working = currentWorkingRooms();
    const manuallyExcluded = working.filter(room => state.session.marks[roomNumber(room)] === 'resident').length;
    const arrivals = working.filter(room => state.session.marks[roomNumber(room)] === 'arrival').length;
    const finalCount = working.filter(room => state.session.marks[roomNumber(room)] !== 'resident').length;

    const values = {
      'departures-stat-checked': checked.size,
      'departures-stat-pdf': pdfRooms.length,
      'departures-stat-auto-excluded': automaticallyExcluded,
      'departures-stat-manual-excluded': manuallyExcluded,
      'departures-stat-arrival': arrivals,
      'departures-stat-final': finalCount
    };
    Object.entries(values).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(value);
    });
    const day = document.getElementById('departures-date');
    if (day) day.textContent = formatDate(state.data.dateKey || SESSION_DATE());
  }

  function render() {
    renderStats();
    renderCheckedRooms();
    renderWorkingRooms();
    if (window.lucide) {
      try { window.lucide.createIcons(); } catch (_) {}
    }
  }

  function ensureLocalDay() {
    const key = SESSION_DATE();
    if (state.session.dateKey === key) return false;
    state.session = emptySession(key);
    state.data.dateKey = key;
    render();
    return true;
  }

  function scheduleMidnightReset() {
    if (state.midnightTimer) clearTimeout(state.midnightTimer);
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 300);
    state.midnightTimer = setTimeout(() => {
      ensureLocalDay();
      refresh();
      scheduleMidnightReset();
    }, Math.max(1000, next.getTime() - now.getTime()));
  }

  async function refresh() {
    ensureLocalDay();
    const sequence = ++state.requestSequence;
    try {
      const data = await api().getDeparturesData();
      if (sequence !== state.requestSequence) return;
      state.data = {
        dateKey: data.dateKey || SESSION_DATE(),
        rooms: Array.isArray(data.rooms) ? data.rooms : [],
        checkedToday: Array.isArray(data.checkedToday) ? data.checkedToday : []
      };
      state.session = data.session && data.session.dateKey === state.data.dateKey
        ? {
          dateKey: data.session.dateKey,
          fileName: String(data.session.fileName || ''),
          pdfRooms: Array.isArray(data.session.pdfRooms) ? data.session.pdfRooms.map(String) : [],
          marks: data.session.marks && typeof data.session.marks === 'object' ? data.session.marks : {}
        }
        : emptySession(state.data.dateKey);
      hideFeedback();
      render();
    } catch (error) {
      if (sequence !== state.requestSequence) return;
      render();
      showFeedback(error.message || 'Не удалось загрузить данные Выездов. Проверьте соединение и повторите попытку.', 'error');
    }
  }

  function addCandidate(candidate, known, found) {
    if (candidate === null || candidate === undefined) return;
    const raw = String(candidate).trim();
    if (!/^\d{1,4}$/.test(raw)) return;
    const number = String(Number(raw));
    if (known.has(number)) found.add(number);
  }

  async function extractRoomNumbers(file) {
    if (!window.pdfjsLib) throw new Error('PDF-парсер не загрузился. Обновите страницу и попробуйте ещё раз.');
    if (!Array.isArray(state.data.rooms) || !state.data.rooms.length) {
      throw new Error('Не удалось получить перечень комнат из системы.');
    }

    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

    const known = new Set(state.data.rooms.map(room => String(room.number)));
    const found = new Set();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const rows = new Map();
      const allText = [];

      for (const item of content.items || []) {
        if (typeof item.str !== 'string' || !item.str.trim()) continue;
        allText.push(item.str);
        const y = Math.round(item.transform && item.transform[5] || 0);
        if (!rows.has(y)) rows.set(y, []);
        rows.get(y).push({ text: item.str, x: item.transform && item.transform[4] || 0 });
      }

      for (const items of rows.values()) {
        items.sort((a, b) => a.x - b.x);
        const line = items.map(item => item.text).join(' ').trim();
        const firstCell = line.match(/^\s*(\d{1,4})(?=\s|$)/);
        if (firstCell) addCandidate(firstCell[1], known, found);

        const guestPattern = line.match(/\b(\d{1,4})\s+[A-Z][a-z]/);
        if (guestPattern) addCandidate(guestPattern[1], known, found);

        const roomNoPattern = line.match(/Room\s*(?:No\.?|Number|#)\s*[:.]?\s*(\d{1,4})/i);
        if (roomNoPattern) addCandidate(roomNoPattern[1], known, found);

        // Fallback to known room numbers on text rows that do not contain dates or times.
        if (!/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/.test(line) && !/\b\d{1,2}:\d{2}\b/.test(line)) {
          const matches = line.match(/\b\d{1,4}\b/g) || [];
          matches.forEach(value => addCandidate(value, known, found));
        }
      }

      // Some Opera PDFs split the room number and guest into separate text boxes.
      allText.forEach(value => {
        if (/^\s*\d{1,4}\s*$/.test(value)) addCandidate(value, known, found);
      });
    }

    return [...found].sort((a, b) => Number(a) - Number(b));
  }

  async function handlePdfSelection(file) {
    if (!file) return;
    if (file.type && file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      showFeedback('Выберите PDF-файл.', 'error');
      return;
    }

    state.parsingPdf = true;
    showFeedback('Читаю PDF и сопоставляю номера с системой…', 'info');
    renderWorkingRooms();
    try {
      const numbers = await extractRoomNumbers(file);
      if (!numbers.length) {
        throw new Error('В документе не найдены номера комнат, существующие в системе. Предыдущий список сохранён.');
      }
      const result = await api().saveDeparturesPdf(file.name, numbers);
      state.session = result.session;
      hideFeedback();
      render();
      const checked = checkedNumbers();
      const autoExcluded = numbers.filter(number => checked.has(number)).length;
      showFeedback('PDF обработан: ' + numbers.length + ' номеров. Уже проверено сегодня: ' +
        autoExcluded + '. В рабочем списке: ' + currentWorkingRooms().length + '.', 'success');
    } catch (error) {
      showFeedback(error.message || 'Не удалось обработать PDF-файл.', 'error');
    } finally {
      state.parsingPdf = false;
      const input = document.getElementById('departures-pdf-input');
      if (input) input.value = '';
      renderWorkingRooms();
      if (window.lucide) window.lucide.createIcons();
    }
  }

  function nextMark(current) {
    if (!current) return 'resident';
    if (current === 'resident') return 'arrival';
    return null;
  }

  async function handleRoomMark(number) {
    if (state.pendingMarks.has(number)) return;
    const previousMark = state.session.marks[number] || null;
    const mark = nextMark(previousMark);
    state.pendingMarks.add(number);
    if (!state.session.marks) state.session.marks = {};
    if (mark) state.session.marks[number] = mark;
    else delete state.session.marks[number];
    render();

    try {
      const response = await api().setDeparturesMark(number, mark);
      state.session = response.session;
      hideFeedback();
    } catch (error) {
      if (previousMark) state.session.marks[number] = previousMark;
      else delete state.session.marks[number];
      showFeedback(error.message || 'Не удалось сохранить отметку номера.', 'error');
    } finally {
      state.pendingMarks.delete(number);
      render();
    }
  }

  function buildPrintDocument(finalRooms) {
    const date = formatDate(SESSION_DATE());
    const pages = Math.max(1, Math.ceil(finalRooms.length / 72));
    const roomMap = roomsByNumber();
    let html = '<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Departures ' +
      escapeHtml(date) + '</title><style>' +
      '@page{size:A4 landscape;margin:10mm}' +
      'html,body{margin:0;padding:0;color:#111;font-family:"Times New Roman",serif}' +
      'body{font-size:10pt}.departure-print-page{display:flex;gap:8mm;width:100%;min-height:185mm;page-break-after:always;break-after:page}' +
      '.departure-print-page:last-child{page-break-after:auto;break-after:auto}' +
      '.departure-print-column{flex:1;min-width:0}' +
      '.departure-print-table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:10pt}' +
      '.departure-print-table th,.departure-print-table td{height:4.35mm;padding:0 2px;border:1px solid #111;vertical-align:middle}' +
      '.departure-print-table th{height:6mm;text-align:center;background:#f1f1f1;font-weight:700}' +
      '.departure-print-table .number{width:48px;text-align:center;font-weight:700;white-space:nowrap}' +
      '.departure-print-table .details{padding-left:5px;overflow-wrap:anywhere}' +
      '.departure-print-table .empty-label{font-size:9pt}' +
      '@media screen{body{padding:10mm;background:#fff}.departure-print-page{min-height:185mm;margin-bottom:10mm;box-shadow:0 1px 8px #bbb;padding:0}}' +
      '</style></head><body>';

    for (let pageIndex = 0; pageIndex < pages; pageIndex += 1) {
      const pageItems = finalRooms.slice(pageIndex * 72, pageIndex * 72 + 72);
      const left = pageItems.slice(0, 36);
      const right = pageItems.slice(36, 72);
      while (left.length < 36) left.push(null);
      while (right.length < 36) right.push(null);

      const renderColumn = column => {
        let rows = '';
        for (const item of column) {
          if (!item) {
            rows += '<tr><td class="number">&nbsp;</td><td class="details">&nbsp;</td></tr>';
            continue;
          }
          const number = roomNumber(item);
          const mark = state.session.marks[number];
          const displayNumber = (mark === 'arrival' ? '→ ' : '') + number;
          const isEmpty = roomMap.get(number)?.expiryStatus === 'empty';
          const detail = isEmpty ? '<span class="empty-label">пустой</span>' : '&nbsp;';
          rows += '<tr><td class="number">' + escapeHtml(displayNumber) +
            '</td><td class="details">' + detail + '</td></tr>';
        }
        return '<div class="departure-print-column"><table class="departure-print-table"><thead><tr>' +
          '<th class="number">№</th><th>Departures of ' + escapeHtml(date) +
          '</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
      };

      html += '<section class="departure-print-page">' + renderColumn(left) + renderColumn(right) + '</section>';
    }
    html += '</body></html>';
    return html;
  }

  async function printDepartures() {
    ensureLocalDay();
    if (!state.session.fileName) {
      showFeedback('Сначала загрузите PDF с выездами.', 'error');
      return;
    }

    const finalRooms = currentWorkingRooms().filter(room =>
      state.session.marks[roomNumber(room)] !== 'resident');
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showFeedback('Браузер заблокировал окно печати. Разрешите всплывающие окна для сайта.', 'error');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildPrintDocument(finalRooms));
    printWindow.document.close();

    let auditSaved = false;
    try {
      await api().logDeparturesPrint(finalRooms.length);
      auditSaved = true;
    } catch (error) {
      showFeedback('Документ подготовлен, но запись «Печать Departures» не попала в историю: ' +
        (error.message || 'ошибка API') + '.', 'error');
    }

    if (auditSaved) {
      showFeedback('Документ Departures подготовлен к печати. Номеров в итоговом списке: ' +
        finalRooms.length + '.', 'success');
    }
    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch (error) {
        showFeedback('Документ открыт, но браузеру не удалось начать печать. Используйте Ctrl+P.', 'error');
      }
    }, 180);
  }

  function onClick(event) {
    const upload = event.target.closest('[data-departures-action="upload"]');
    if (upload) {
      event.preventDefault();
      document.getElementById('departures-pdf-input')?.click();
      return;
    }

    const print = event.target.closest('#departures-print-btn');
    if (print) {
      event.preventDefault();
      printDepartures();
      return;
    }

    const room = event.target.closest('[data-departures-room]');
    if (room) {
      event.preventDefault();
      handleRoomMark(String(room.dataset.departuresRoom));
    }
  }

  function setupListeners() {
    if (state.initialized) return;
    const view = document.getElementById('view-departures');
    const input = document.getElementById('departures-pdf-input');
    if (view) view.addEventListener('click', onClick);
    if (input) {
      input.addEventListener('change', event => {
        handlePdfSelection(event.target.files && event.target.files[0]);
      });
    }
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && ensureLocalDay()) refresh();
    });
    window.addEventListener('focus', () => {
      if (ensureLocalDay()) refresh();
    });
    state.initialized = true;
  }

  function init() {
    setupListeners();
    scheduleMidnightReset();
    render();
    return refresh();
  }

  return { init, refresh };
})();
