App.arrivalsModule = (() => {
  'use strict';

  const state = {
    data: { dateKey: '', rooms: [] },
    session: { dateKey: '', fileName: '', pdfRooms: [], entries: {} },
    initialized: false,
    parsingPdf: false,
    pending: new Set(),
    saveQueue: new Set(),
    feedbackTimer: null
  };

  const api = () => window.api;
  const numberPattern = /^\d{1,4}$/;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }

  function emptyEntry() {
    return { vip: false, empty: false, time: '', comment: '', ready: false };
  }

  function normalizeEntry(value) {
    const item = value && typeof value === 'object' ? value : {};
    return {
      vip: item.vip === true,
      empty: item.empty === true,
      time: /^\d{2}:\d{2}$/.test(String(item.time || '')) ? String(item.time) : '',
      comment: String(item.comment || ''),
      ready: item.ready === true
    };
  }

  function roomMap() {
    return new Map((state.data.rooms || []).map(room => [String(room.number), room]));
  }

  function sessionNumbers() {
    const known = roomMap();
    return [...new Set((state.session.pdfRooms || []).map(value => String(Number(value))))]
      .filter(number => numberPattern.test(number) && known.has(number))
      .sort((a, b) => Number(a) - Number(b));
  }

  function entryFor(number) {
    return normalizeEntry(state.session.entries && state.session.entries[String(number)]);
  }

  function showFeedback(message, type = 'info') {
    const element = document.getElementById('arrivals-feedback');
    if (!element) return;
    if (state.feedbackTimer) clearTimeout(state.feedbackTimer);
    element.textContent = message || '';
    element.className = 'arrivals-feedback' + (type ? ' is-' + type : '');
    element.hidden = !message;
    if (message) state.feedbackTimer = setTimeout(() => {
      element.hidden = true;
      element.textContent = '';
      element.className = 'arrivals-feedback';
      state.feedbackTimer = null;
    }, type === 'error' ? 6500 : 2600);
  }

  function updateStats(numbers) {
    const entries = numbers.map(entryFor);
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(value);
    };
    set('arrivals-stat-total', numbers.length);
    set('arrivals-stat-vip', entries.filter(item => item.vip).length);
    set('arrivals-stat-empty', entries.filter(item => item.empty).length);
    set('arrivals-stat-ready', entries.filter(item => item.ready).length);
  }

  function render() {
    const container = document.getElementById('arrivals-list-container');
    const fileName = document.getElementById('arrivals-file-name');
    const reset = document.getElementById('arrivals-reset-btn');
    const print = document.getElementById('arrivals-print-btn');
    if (!container) return;

    const rooms = roomMap();
    const numbers = sessionNumbers();
    const finalCount = document.getElementById('arrivals-final-count');
    if (finalCount) finalCount.textContent = String(numbers.length);
    if (fileName) fileName.textContent = state.session.fileName || 'PDF не загружен · можно добавлять номера вручную';
    if (reset) reset.disabled = !numbers.length && !state.session.fileName;
    if (print) print.disabled = !numbers.length || state.parsingPdf;
    updateStats(numbers);

    if (!numbers.length) {
      container.innerHTML = '<div class="arrivals-empty-state"><i data-lucide="plane-landing"></i><strong>Список Заездов пуст</strong><span>Загрузите PDF или добавьте один или несколько номеров вручную.</span></div>';
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    const header = '<div class="arrivals-list-heading" aria-hidden="true"><span>Номер</span><span>Отметки</span><span>Время заезда</span><span>Комментарий</span><span></span></div>';
    const rows = numbers.map(number => {
      const room = rooms.get(number) || {};
      const item = entryFor(number);
      const disabled = state.pending.has(number) ? ' disabled' : '';
      const category = room.category ? '<span class="arrivals-room-category">' + escapeHtml(room.category) + '</span>' : '';
      return '<article class="arrivals-room-row' + (state.pending.has(number) ? ' is-saving' : '') + '" data-arrivals-row="' + escapeHtml(number) + '">' +
        '<div class="arrivals-room-id"><strong>' + escapeHtml(number) + '</strong>' + category + '</div>' +
        '<div class="arrivals-room-flags">' +
          '<label class="arrivals-check"><input type="checkbox" data-arrivals-field="vip" data-arrivals-number="' + escapeHtml(number) + '"' + (item.vip ? ' checked' : '') + disabled + '><span>VIP</span></label>' +
          '<label class="arrivals-check"><input type="checkbox" data-arrivals-field="empty" data-arrivals-number="' + escapeHtml(number) + '"' + (item.empty ? ' checked' : '') + disabled + '><span>Опустошить</span></label>' +
        '</div>' +
        '<div class="arrivals-room-time"><input type="time" aria-label="Время заезда, номер ' + escapeHtml(number) + '" value="' + escapeHtml(item.time) + '" data-arrivals-field="time" data-arrivals-number="' + escapeHtml(number) + '"' + disabled + '></div>' +
        '<div class="arrivals-room-comment"><input type="text" maxlength="500" aria-label="Комментарий, номер ' + escapeHtml(number) + '" placeholder="Комментарий к номеру" value="' + escapeHtml(item.comment) + '" data-arrivals-field="comment" data-arrivals-number="' + escapeHtml(number) + '"' + disabled + '></div>' +
        '<button type="button" class="arrivals-remove-btn" data-arrivals-remove="' + escapeHtml(number) + '" aria-label="Убрать номер ' + escapeHtml(number) + '"' + disabled + '><i data-lucide="x"></i></button>' +
      '</article>';
    }).join('');

    container.innerHTML = header + '<div class="arrivals-rows">' + rows + '</div>';
    if (window.lucide) window.lucide.createIcons();
  }

  async function refresh() {
    try {
      const data = await api().getArrivalsData();
      state.data = {
        dateKey: String(data.dateKey || ''),
        rooms: Array.isArray(data.rooms) ? data.rooms : []
      };
      const session = data.session || {};
      state.session = {
        dateKey: String(session.dateKey || data.dateKey || ''),
        fileName: String(session.fileName || ''),
        pdfRooms: Array.isArray(session.pdfRooms) ? session.pdfRooms.map(value => String(Number(value))) : [],
        entries: session.entries && typeof session.entries === 'object' ? session.entries : {}
      };
      render();
    } catch (error) {
      showFeedback(error.message || 'Не удалось загрузить данные Заездов. Проверьте соединение.', 'error');
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
    showFeedback('Читаю PDF и сопоставляю номера с системой…');
    render();
    try {
      const numbers = await extractRoomNumbers(file);
      if (!numbers.length) throw new Error('В документе не найдены номера комнат, существующие в системе. Предыдущий список сохранён.');
      const result = await api().saveArrivalsPdf(file.name, numbers);
      state.session = result.session;
      render();
      showFeedback('PDF обработан: ' + numbers.length + ' номеров.', 'success');
    } catch (error) {
      showFeedback(error.message || 'Не удалось обработать PDF-файл.', 'error');
    } finally {
      state.parsingPdf = false;
      const input = document.getElementById('arrivals-pdf-input');
      if (input) input.value = '';
      render();
    }
  }

  async function addRooms() {
    const input = document.getElementById('arrivals-add-numbers');
    const text = String(input?.value || '').trim();
    if (!text) {
      showFeedback('Введите номер или несколько номеров.', 'warning');
      return;
    }
    try {
      const result = await api().addArrivalRooms(text);
      state.session = result.session;
      if (input) input.value = '';
      render();
      if (result.unknown && result.unknown.length) {
        showFeedback('Добавлено: ' + result.added + '. Не найдены в базе: ' + result.unknown.join(', '), 'warning');
      } else {
        showFeedback('Добавлено номеров: ' + result.added, 'success');
      }
    } catch (error) {
      showFeedback(error.message || 'Не удалось добавить номера.', 'error');
    }
  }

  async function resetList() {
    if (state.parsingPdf) return;
    try {
      const result = await api().resetArrivals();
      state.session = result.session;
      render();
      showFeedback('Список Заездов очищен.', 'success');
    } catch (error) {
      showFeedback(error.message || 'Не удалось сбросить список.', 'error');
    }
  }

  async function saveRoomField(number, field, value, input) {
    if (!number || !field) return;
    state.pending.add(number);
    const row = input?.closest('[data-arrivals-row]');
    row?.querySelectorAll('input, button').forEach(control => { control.disabled = true; });
    try {
      const result = await api().setArrivalRoomField(number, field, value);
      state.session = result.session;
      showFeedback('');
    } catch (error) {
      showFeedback(error.message || 'Не удалось сохранить отметку номера ' + number + '.', 'error');
      await refresh();
    } finally {
      state.pending.delete(number);
      render();
    }
  }

  async function removeRoom(number) {
    if (!window.confirm('Убрать номер ' + number + ' из списка Заездов?')) return;
    try {
      const result = await api().removeArrivalRoom(number);
      state.session = result.session;
      render();
    } catch (error) {
      showFeedback(error.message || 'Не удалось убрать номер.', 'error');
    }
  }

  function buildPrintDocument(numbers) {
    // Match the legacy Departures print layout: A4 landscape, 1cm margins,
    // two columns with 36 fixed-height rows each. Arrivals adds only Move/VIP.
    const dateString = new Date().toLocaleDateString('ru-RU');
    const pages = [];
    const pageCount = Math.ceil(numbers.length / 72);

    for (let pageNum = 0; pageNum < pageCount; pageNum += 1) {
      const pageItems = numbers.slice(pageNum * 72, pageNum * 72 + 72);
      const left = pageItems.slice(0, 36);
      const right = pageItems.slice(36, 72);
      while (left.length < 36) left.push(null);
      while (right.length < 36) right.push(null);
      pages.push([left, right]);
    }

    let htmlContent = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
      '<title>Заезды ' + escapeHtml(dateString) + '</title><style>' +
      '@page { size: A4 landscape; margin: 1cm; }' +
      'body { font-family: Times New Roman, serif; margin: 0; padding: 0; }' +
      '.page-container { display:flex; justify-content:space-around; width:100%; height:95vh; page-break-after:always; }' +
      '.page-column { flex:1; padding-top:1cm; padding-left:1cm; padding-right:1cm; box-sizing:border-box; }' +
      '.print-table { width:100%; border-collapse:collapse; font-size:10px; }' +
      '.print-table th, .print-table td { border:1px solid #000; padding:0px; height:16px; vertical-align:middle; }' +
      '.print-table th { background:#f0f0f0; font-weight:bold; text-align:center; }' +
      '.print-table .number-col { width:50px; text-align:center; }' +
      '.print-table .move-vip-col { width:50px; text-align:center; }' +
      '.print-table .details-col { width:auto; text-align:left; padding-left:6px; }' +
      '</style></head><body>';

    const renderColumn = column => {
      let rows = '';
      for (const rawNumber of column) {
        if (!rawNumber) {
          rows += '<tr><td class="number-col">&nbsp;</td><td class="move-vip-col">&nbsp;</td><td class="details-col">&nbsp;</td></tr>';
          continue;
        }
        const number = String(rawNumber);
        const item = entryFor(number);
        const roomIsEmpty = roomMap().get(number)?.expiryStatus === 'empty';
        const details = [];
        if (roomIsEmpty) details.push('Пустой');
        else if (item.empty) details.push('Опустошить');
        if (item.time) details.push('Заезд ' + item.time);
        if (item.comment) details.push(item.comment);
        rows += '<tr><td class="number-col"><strong><font size="2">' +
          escapeHtml(number) + '</font></strong></td>' +
          '<td class="move-vip-col"><strong>' + (item.vip ? 'VIP' : '&nbsp;') + '</strong></td>' +
          '<td class="details-col">' + (details.length ? escapeHtml(details.join(' · ')) : '&nbsp;') + '</td></tr>';
      }
      return '<div class="page-column"><table class="print-table"><thead><tr>' +
        '<th class="number-col"><font size="2">№</font></th>' +
        '<th class="move-vip-col"><font size="2">Move/VIP</font></th>' +
        '<th class="details-col" style="text-align:center;"><font size="2">Заезды от ' +
        escapeHtml(dateString) + '</font></th></tr></thead><tbody>' + rows +
        '</tbody></table></div>';
    };

    pages.forEach(([left, right]) => {
      htmlContent += '<div class="page-container">' + renderColumn(left) + renderColumn(right) + '</div>';
    });
    htmlContent += '</body></html>';
    return htmlContent;
  }

  async function printArrivals() {
    if (!sessionNumbers().length) {
      showFeedback('Нет номеров для печати.', 'warning');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showFeedback('Браузер заблокировал окно печати. Разрешите всплывающие окна для сайта.', 'error');
      return;
    }
    await Promise.all([...state.saveQueue]);
    await refresh();
    const numbers = sessionNumbers();
    if (!numbers.length) {
      printWindow.close();
      showFeedback('Нет номеров для печати.', 'warning');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(buildPrintDocument(numbers));
    printWindow.document.close();
    try {
      await api().logArrivalsPrint(numbers.length);
    } catch (error) {
      showFeedback('Документ подготовлен, но запись печати не попала в историю: ' + (error.message || 'ошибка API'), 'error');
    }
    setTimeout(() => {
      try { printWindow.focus(); printWindow.print(); }
      catch (_) { showFeedback('Документ открыт. Запустите печать через Ctrl+P.', 'warning'); }
    }, 180);
  }

  function onClick(event) {
    if (event.target.closest('[data-arrivals-action="upload"]')) {
      event.preventDefault();
      document.getElementById('arrivals-pdf-input')?.click();
      return;
    }
    if (event.target.closest('#arrivals-add-btn')) {
      event.preventDefault();
      void addRooms();
      return;
    }
    if (event.target.closest('#arrivals-reset-btn')) {
      event.preventDefault();
      void resetList();
      return;
    }
    if (event.target.closest('#arrivals-print-btn')) {
      event.preventDefault();
      void printArrivals();
      return;
    }
    const remove = event.target.closest('[data-arrivals-remove]');
    if (remove) {
      event.preventDefault();
      void removeRoom(String(remove.dataset.arrivalsRemove));
    }
  }

  function onChange(event) {
    const input = event.target.closest('[data-arrivals-field][data-arrivals-number]');
    if (!input) return;
    const number = String(input.dataset.arrivalsNumber || '');
    const field = String(input.dataset.arrivalsField || '');
    const value = input.type === 'checkbox' ? input.checked : String(input.value || '').trim();
    const task = saveRoomField(number, field, value, input);
    state.saveQueue.add(task);
    void task.then(
      () => state.saveQueue.delete(task),
      () => state.saveQueue.delete(task)
    );
  }

  function setupListeners() {
    if (state.initialized) return;
    const view = document.getElementById('view-arrivals');
    const input = document.getElementById('arrivals-pdf-input');
    if (view) {
      view.addEventListener('click', onClick);
      view.addEventListener('change', onChange);
      view.addEventListener('keydown', event => {
        if (event.target?.id === 'arrivals-add-numbers' && event.key === 'Enter') {
          event.preventDefault();
          void addRooms();
        }
      });
    }
    if (input) input.addEventListener('change', event => handlePdfSelection(event.target.files && event.target.files[0]));
    state.initialized = true;
  }

  function init() {
    setupListeners();
    render();
    return refresh();
  }

  return { init, refresh };
})();