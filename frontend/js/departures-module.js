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
    addingManualRoom: false,
    feedbackTimer: null,
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
    return { dateKey, fileName: '', pdfRooms: [], marks: {}, manualRooms: [] };
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }


  function showFeedback(message, type = 'info') {
    // Successful operations stay silent; only actionable feedback is shown as a toast.
    if (type === 'success' || !message) {
      hideFeedback();
      return;
    }
    const element = document.getElementById('departures-feedback');
    if (!element) return;
    if (state.feedbackTimer) clearTimeout(state.feedbackTimer);
    element.textContent = message;
    element.className = 'departures-feedback is-' + type;
    element.hidden = false;
    state.feedbackTimer = setTimeout(() => {
      element.hidden = true;
      element.textContent = '';
      element.className = 'departures-feedback';
      state.feedbackTimer = null;
    }, type === 'error' ? 6500 : 4200);
  }

  function hideFeedback() {
    const element = document.getElementById('departures-feedback');
    if (state.feedbackTimer) clearTimeout(state.feedbackTimer);
    state.feedbackTimer = null;
    if (element) {
      element.hidden = true;
      element.textContent = '';
      element.className = 'departures-feedback';
    }
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

  function manualRoomMap() {
    return new Map((state.session.manualRooms || []).map(item => [
      String(item.number),
      { number: String(item.number), emptied: item.emptied === true }
    ]));
  }

  function roomMark(number, manualByNumber = manualRoomMap()) {
    return manualByNumber.has(String(number))
      ? 'arrival'
      : (state.session.marks && state.session.marks[String(number)]) || null;
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
    const visibleNumbers = new Set(normalizePdfRooms().filter(number => !checked.has(number)));
    manualRoomMap().forEach((_, number) => visibleNumbers.add(number));
    return [...visibleNumbers]
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

  function renderFloorSections(rooms) {
    if (!rooms.length) return '';
    const sections = groupByFloor(rooms);
    const manualByNumber = manualRoomMap();
    return sections.map(section => {
      const floorCounts = {
        neutral: section.rooms.filter(room => !roomMark(roomNumber(room), manualByNumber)).length,
        valid: section.rooms.filter(room => roomMark(roomNumber(room), manualByNumber) === 'arrival').length,
        needs: section.rooms.filter(room => roomMark(roomNumber(room), manualByNumber) === 'resident').length
      };
      const dot = (tone, count) => '<span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full ' +
        tone + '"></span><span class="text-slate-600">' + count + '</span></span>';
      const floorIndicators = [
        dot('bg-slate-400', floorCounts.neutral),
        dot('bg-emerald-500', floorCounts.valid),
        dot('bg-rose-500', floorCounts.needs)
      ].join('');
      const tiles = section.rooms.map(room => {
        const number = roomNumber(room);
        const manual = manualByNumber.get(number);
        const mark = roomMark(number, manualByNumber);
        const classes = ['room-cell', 'departure-room-tile', 'departure-work-tile'];
        if (mark === 'resident') classes.push('is-resident');
        if (mark === 'arrival') classes.push('is-arrival');
        if (manual) classes.push('is-manual');
        if (state.pendingMarks.has(number)) classes.push('is-saving');
        if (manual) {
          const description = manual.emptied
            ? 'Номер ' + number + ' добавлен на заезд, опустошить при печати.'
            : 'Номер ' + number + ' вручную добавлен на заезд.';
          return '<div class="departure-manual-slot" data-manual-room="' + escapeHtml(number) + '">' +
            '<button type="button" class="' + classes.join(' ') + '" disabled aria-label="' +
            escapeHtml(description) + '"><span class="departure-room-number">' + escapeHtml(number) + '</span></button>' +
            '<button type="button" class="departure-manual-remove" data-departures-manual-remove="' +
            escapeHtml(number) + '" aria-label="Убрать вручную добавленный номер ' + escapeHtml(number) + '" title="Убрать из списка">' +
            '<i data-lucide="x"></i></button></div>';
        }
        const aria = mark === 'resident'
          ? 'Номер ' + number + ', отметка жилой. Следующий клик — на заезд.'
          : mark === 'arrival'
            ? 'Номер ' + number + ', отметка на заезд. Следующий клик сбрасывает отметку.'
            : 'Номер ' + number + ', без отметки. Первый клик исключает номер как жилой.';
        return '<button type="button" class="' + classes.join(' ') + '" data-departures-room="' +
          escapeHtml(number) + '" aria-label="' + escapeHtml(aria) + '"' +
          (state.pendingMarks.has(number) ? ' disabled' : '') + '>' +
          '<span class="departure-room-number">' + escapeHtml(number) + '</span></button>';
      }).join('');
      return '<section class="floor-section departure-floor-section" aria-label="' + escapeHtml(section.floor) + ' этаж">' +
        '<div class="floor-header departure-floor-heading"><div class="flex items-center gap-2">' +
        '<div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"><span class="font-bold text-sm text-slate-700 departure-floor-badge">' + escapeHtml(section.floor) + '</span></div>' +
        '<div><div class="font-semibold text-sm text-slate-900">Этаж ' + escapeHtml(section.floor) + '</div>' +
        '<div class="text-xs text-slate-500">' + section.rooms.length + ' номеров</div></div></div>' +
        '<div class="flex gap-2 text-xs departure-floor-indicators">' + floorIndicators + '</div></div>' +
        '<div class="rooms-grid departure-room-grid">' + tiles + '</div></section>';
    }).join('');
  }


  function renderWorkingRooms() {
    const container = document.getElementById('departures-work-list');
    const fileName = document.getElementById('departures-file-name');
    const printButton = document.getElementById('departures-print-btn');
    const resetButton = document.getElementById('departures-reset-btn');
    const finalCount = document.getElementById('departures-final-count');
    const addButton = document.getElementById('departures-manual-add-btn');
    if (!container) return;

    if (fileName) fileName.textContent = state.session.fileName || 'PDF ещё не загружен';
    const rooms = currentWorkingRooms();
    const printableRooms = rooms.filter(room => roomMark(roomNumber(room)) !== 'resident');
    if (printButton) printButton.disabled = !printableRooms.length || state.parsingPdf;
    if (resetButton) resetButton.disabled = !state.session.fileName || state.parsingPdf;
    if (addButton) addButton.disabled = state.addingManualRoom || state.parsingPdf;
    if (finalCount) finalCount.textContent = String(printableRooms.length);

    if (!rooms.length) {
      const hasPdfRooms = Boolean(state.session.fileName && normalizePdfRooms().length);
      container.innerHTML = hasPdfRooms
        ? '<div class="departures-empty-state"><span class="departures-empty-icon"><i data-lucide="check-circle-2"></i></span>' +
          '<strong>Все номера из PDF уже проверены</strong><span>В сегодняшней очереди больше нет номеров для проверки.</span></div>'
        : '<div class="departures-empty-state"><span class="departures-empty-icon"><i data-lucide="file-up"></i></span>' +
          '<strong>Загрузите PDF с выездами</strong><span>Можно также вручную добавить номер на заезд в форму выше.</span></div>';
    } else {
      container.innerHTML = renderFloorSections(rooms);
    }
  }


  function renderStats() {
    const pdfRooms = normalizePdfRooms();
    const checked = checkedNumbers();
    const automaticallyExcluded = pdfRooms.filter(number => checked.has(number)).length;
    const working = currentWorkingRooms();
    const finalCount = working.filter(room => roomMark(roomNumber(room)) !== 'resident').length;

    const values = {
      'departures-stat-checked': checked.size,
      'departures-stat-pdf': pdfRooms.length,
      'departures-stat-auto-excluded': automaticallyExcluded
    };
    Object.entries(values).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(value);
    });
    const finalCountElement = document.getElementById('departures-final-count');
    if (finalCountElement) finalCountElement.textContent = String(finalCount);
  }


  function render() {
    renderStats();
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
          marks: data.session.marks && typeof data.session.marks === 'object' ? data.session.marks : {},
          manualRooms: Array.isArray(data.session.manualRooms)
            ? data.session.manualRooms.map(item => ({
              number: String(item.number),
              emptied: item.emptied === true
            }))
            : []
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

  async function resetPdf() {
    if (state.parsingPdf || !state.session.fileName) return;
    state.parsingPdf = true;
    renderWorkingRooms();
    try {
      const result = await api().resetDeparturesPdf();
      state.session = result.session;
      hideFeedback();
      showFeedback('PDF сброшен. Номера из файла очищены, ручные отметки сохранены.', 'success');
    } catch (error) {
      showFeedback(error.message || 'Не удалось сбросить список PDF.', 'error');
    } finally {
      state.parsingPdf = false;
      render();
    }
  }

  async function addManualRoom() {
    if (state.addingManualRoom || state.parsingPdf) return;
    const input = document.getElementById('departures-manual-room-number');
    const checkbox = document.getElementById('departures-manual-emptied');
    const raw = String(input?.value || '').trim();
    if (!/^\\d{1,4}$/.test(raw)) {
      showFeedback('Введите номер комнаты (от 1 до 4 цифр).', 'warning');
      input?.focus();
      return;
    }
    const number = String(Number(raw));
    const emptied = Boolean(checkbox?.checked);
    if (checkedNumbers().has(number) && !emptied) {
      showFeedback('Номер ' + number + ' уже проверяли сегодня. Чтобы всё равно добавить его, включите «Опустошить».', 'warning');
      return;
    }

    state.addingManualRoom = true;
    renderWorkingRooms();
    try {
      const response = await api().addDeparturesManualRoom(number, emptied);
      state.session = response.session;
      if (input) input.value = '';
      if (checkbox) checkbox.checked = false;
      hideFeedback();
      render();
    } catch (error) {
      const type = error.status === 409 || /уже проверяли сегодня/i.test(error.message || '') ? 'warning' : 'error';
      showFeedback(error.message || 'Не удалось добавить номер на заезд.', type);
    } finally {
      state.addingManualRoom = false;
      render();
    }
  }

  async function removeManualRoom(number) {
    const key = String(number);
    const original = manualRoomMap();
    if (!original.has(key)) return;
    try {
      const response = await api().removeDeparturesManualRoom(key);
      state.session = response.session;
      hideFeedback();
      render();
    } catch (error) {
      showFeedback(error.message || 'Не удалось убрать ручной номер.', 'error');
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
    // Legacy minibars Departures print geometry: A4 landscape, 1cm margins,
    // two columns and 36 fixed-height rows per column.
    const dateString = new Date().toLocaleDateString('ru-RU');
    const pages = [];
    const pageCount = Math.ceil(finalRooms.length / 72);
    const roomMap = roomsByNumber();
    const manualByNumber = manualRoomMap();

    for (let pageNum = 0; pageNum < pageCount; pageNum += 1) {
      const pageItems = finalRooms.slice(pageNum * 72, pageNum * 72 + 72);
      const left = pageItems.slice(0, 36);
      const right = pageItems.slice(36, 72);
      while (left.length < 36) left.push(null);
      while (right.length < 36) right.push(null);
      pages.push([left, right]);
    }

    let htmlContent = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
      '<title>Departures ' + escapeHtml(dateString) + '</title><style>' +
      '@page { size: A4 landscape; margin: 1cm; }' +
      'body { font-family: Times New Roman, serif; margin: 0; padding: 0; }' +
      '.page-container { display:flex; justify-content:space-around; width:100%; height:95vh; page-break-after:always; }' +
      '.page-column { flex:1; padding-top:1cm; padding-left:1cm; padding-right:1cm; box-sizing:border-box; }' +
      '.print-table { width:100%; border-collapse:collapse; font-size:10px; }' +
      '.print-table th, .print-table td { border:1px solid #000; padding:0px; height:16px; vertical-align:middle; }' +
      '.print-table th { background:#f0f0f0; font-weight:bold; text-align:center; }' +
      '.print-table .number-col { width:50px; text-align:center; }' +
      '.print-table .departures-col { width:auto; text-align:left; padding-left:6px; }' +
      '.subtext { display:block; font-size:10px; color:#111; margin-top:2px; }' +
      '</style></head><body>';

    const renderColumn = column => {
      let rows = '';
      for (const item of column) {
        if (!item) {
          rows += '<tr><td class="number-col">&nbsp;</td><td class="departures-col">&nbsp;</td></tr>';
          continue;
        }
        const number = roomNumber(item);
        const manual = manualByNumber.get(number);
        const mark = roomMark(number, manualByNumber);
        const displayNumber = (mark === 'arrival' ? '→ ' : '') + number;
        const isEmpty = roomMap.get(number)?.expiryStatus === 'empty';
        const cellText = manual?.emptied
          ? '<span class="subtext">опустошить</span>'
          : isEmpty ? '<span class="subtext">пустой</span>' : '&nbsp;';
        rows += '<tr><td class="number-col"><strong><font size="2">' +
          escapeHtml(displayNumber) + '</font></strong></td>' +
          '<td class="departures-col">' + cellText + '</td></tr>';
      }
      return '<div class="page-column"><table class="print-table"><thead><tr>' +
        '<th class="number-col"><font size="2">№</font></th>' +
        '<th class="departures-col" style="text-align: center;"><font size="2">Departures of ' +
        escapeHtml(dateString) + '</font></th></tr></thead><tbody>' + rows +
        '</tbody></table></div>';
    };

    pages.forEach(([left, right]) => {
      htmlContent += '<div class="page-container">' + renderColumn(left) + renderColumn(right) + '</div>';
    });
    htmlContent += '</body></html>';
    return htmlContent;
  }

  async function printDepartures() {
    ensureLocalDay();
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showFeedback('Браузер заблокировал окно печати. Разрешите всплывающие окна для сайта.', 'error');
      return;
    }

    // Re-read the server session and current VK checks immediately before printing.
    await refresh();
    if (!state.session.fileName && !manualRoomMap().size) {
      printWindow.close();
      showFeedback('Сначала загрузите PDF или вручную добавьте номер на заезд.', 'warning');
      return;
    }

    const finalRooms = currentWorkingRooms().filter(room => roomMark(roomNumber(room)) !== 'resident');
    if (!finalRooms.length) {
      printWindow.close();
      showFeedback('Нет номеров для печати. Добавьте номер на заезд или измените отметки.', 'warning');
      render();
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

    const reset = event.target.closest('#departures-reset-btn');
    if (reset) {
      event.preventDefault();
      resetPdf();
      return;
    }

    const print = event.target.closest('#departures-print-btn');
    if (print) {
      event.preventDefault();
      printDepartures();
      return;
    }

    const removeManual = event.target.closest('[data-departures-manual-remove]');
    if (removeManual) {
      event.preventDefault();
      removeManualRoom(String(removeManual.dataset.departuresManualRemove));
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
    const manualForm = document.getElementById('departures-manual-form');
    if (manualForm) manualForm.addEventListener('submit', event => {
      event.preventDefault();
      addManualRoom();
    });
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
