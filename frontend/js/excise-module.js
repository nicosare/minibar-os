// МОДУЛЬ АКЦИЗОВ
// ═══════════════════════════════════════════════════════════════
App.exciseModule = (() => {
  const RU_TO_EN = {
    'й':'q','ц':'w','у':'e','к':'r','е':'t','н':'y','г':'u','ш':'i','щ':'o','з':'p','х':'[','ъ':']',
    'ф':'a','ы':'s','в':'d','а':'f','п':'g','р':'h','о':'j','л':'k','д':'l','ж':';','э':"'",
    'я':'z','ч':'x','с':'c','м':'v','и':'b','т':'n','ь':'m','б':',','ю':'.','ё':'`',
    'Й':'Q','Ц':'W','У':'E','К':'R','Е':'T','Н':'Y','Г':'U','Ш':'I','Щ':'O','З':'P','Х':'{','Ъ':'}',
    'Ф':'A','Ы':'S','В':'D','А':'F','П':'G','Р':'H','О':'J','Л':'K','Д':'L','Ж':':','Э':'"',
    'Я':'Z','Ч':'X','С':'C','М':'V','И':'B','Т':'N','Ь':'M','Б':'<','Ю':'>','Ё':'~'
  };
  let excises = [];
let isInitialized = false;  
let isProcessing = false;   
  let debounceTimer = null;
  let isBound = false;
  let isLoaded = false;

  const api = () => window.api;
  const { pluralize, escapeHtml, showToast } = window.AppUtils;

  /** Единая проверка: карточки, счётчики и «Копировать все» используют одни правила */
  function isValidMark(mark) {
    if (!mark || typeof mark !== 'string') return false;
    const trimmed = mark.trim();
    if (trimmed.length < 20) return false;
    return /^\d/.test(trimmed);
  }

  function convertLayout(text) {
    return text.split('').map(c => RU_TO_EN[c] || c).join('');
  }

  function formatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function render() {
    const list = document.getElementById('excise-list');
    const emptyState = document.getElementById('excise-empty-state');
    const countEl = document.getElementById('excise-list-count');
    if (!list) return;

    if (excises.length === 0) {
      list.innerHTML = '';
      emptyState?.classList.remove('hidden');
      if (countEl) countEl.textContent = '0 марок';
    } else {
      emptyState?.classList.add('hidden');
      if (countEl) countEl.textContent = `${excises.length} ${pluralize(excises.length, ['марка', 'марки', 'марок'])}`;

      list.innerHTML = excises.map(e => {
        const isValid = isValidMark(e.mark_number);
        const statusClass = isValid ? 'valid' : 'invalid';
        const date = new Date(e.created_at);
        const validDate = Number.isFinite(date.getTime());
        const timeStr = validDate ? date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '—';
        const dateStr = validDate ? date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) : '—';
        return `
          <div class="excise-card ${statusClass}"
               data-excise-id="${escapeHtml(String(e.id))}"
               data-excise-mark="${escapeHtml(String(e.mark_number ?? ''))}"
               title="Нажмите, чтобы скопировать марку"
               role="button" tabindex="0"
               aria-label="${isValid ? 'Валидная' : 'Невалидная'} акцизная марка">
            <div class="excise-status-icon" aria-hidden="true">
              ${isValid
                ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
                : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
              }
            </div>
            <div class="excise-card-content">
              <div class="excise-card-mark">${escapeHtml(String(e.mark_number ?? ''))}</div>
              <div class="excise-card-meta">
                <span class="excise-meta-status">${isValid ? 'Валидна' : 'Проверить марку'}</span>
                <span class="excise-meta-time">${timeStr}</span>
                <span class="excise-meta-date">${dateStr}</span>
              </div>
            </div>
            <button class="excise-delete-btn" type="button"
                    data-excise-delete-id="${escapeHtml(String(e.id))}"
                    aria-label="Удалить акциз" title="Удалить">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                <path d="M10 11v6"></path><path d="M14 11v6"></path>
                <path d="M9 6V4h6v2"></path>
              </svg>
            </button>
          </div>`;
      }).join('');

      list.querySelectorAll('.excise-card').forEach(card => {
        const copyMark = () => copyToClipboard(card.dataset.exciseMark || '');
        card.addEventListener('click', copyMark);
        card.addEventListener('keydown', event => {
          if (event.target !== card) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            copyMark();
          }
        });
      });
      list.querySelectorAll('[data-excise-delete-id]').forEach(button => {
        button.addEventListener('click', event => {
          event.stopPropagation();
          deleteExcise(button.dataset.exciseDeleteId);
        });
      });
    }

    updateStats();
    if (window.lucide) lucide.createIcons();
  }

  function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    // Можно добавить toast-уведомление
    console.log('Скопировано:', text);
  }).catch(err => {
    console.error('Ошибка копирования:', err);
  });
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concatBytes(parts) {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}

function createXlsxBytes(values) {
  const encoder = new TextEncoder();
  const xml = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  const rows = values.map((value, index) => {
    const row = index + 1;
    return `<row r="${row}"><c r="A${row}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c></row>`;
  }).join('');
  const entries = [
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets><sheet name="Акцизы" sheetId="1" r:id="rId1"/></sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'],
    ['xl/worksheets/sheet1.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + rows + '</sheetData></worksheet>']
  ];
  const localParts = [], centralParts = [];
  let localOffset = 0;
  for (const [name, content] of entries) {
    const nameBytes = encoder.encode(name), data = encoder.encode(content), checksum = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length), localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true); localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true); localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true); localView.setUint16(12, 0x0021, true);
    localView.setUint32(14, checksum, true); localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true); localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true); local.set(nameBytes, 30);
    localParts.push(local, data);

    const central = new Uint8Array(46 + nameBytes.length), centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true); centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true); centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true); centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0x0021, true); centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, data.length, true); centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, nameBytes.length, true); centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true); centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true); centralView.setUint32(38, 0, true);
    centralView.setUint32(42, localOffset, true); central.set(nameBytes, 46);
    centralParts.push(central);
    localOffset += local.length + data.length;
  }
  const centralDirectory = concatBytes(centralParts);
  const end = new Uint8Array(22), view = new DataView(end.buffer);
  view.setUint32(0, 0x06054b50, true); view.setUint16(4, 0, true); view.setUint16(6, 0, true);
  view.setUint16(8, entries.length, true); view.setUint16(10, entries.length, true);
  view.setUint32(12, centralDirectory.length, true); view.setUint32(16, localOffset, true);
  view.setUint16(20, 0, true);
  return concatBytes([...localParts, centralDirectory, end]);
}

function downloadValid() {
  const valid = excises.filter(e => isValidMark(e.mark_number)).map(e => String(e.mark_number).trim());
  if (!valid.length) {
    showToast?.('Нет валидных акцизов для скачивания', 'warning');
    return;
  }
  try {
    const blob = new Blob([createXlsxBytes(valid)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const now = new Date(), two = value => String(value).padStart(2, '0');
    const date = `${two(now.getDate())}.${two(now.getMonth() + 1)}.${String(now.getFullYear()).slice(-2)}`;
    const anchor = document.createElement('a'), url = URL.createObjectURL(blob);
    anchor.href = url; anchor.download = `Акцизы мини-бар ${date}.xlsx`; anchor.style.display = 'none';
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast?.(`Скачано акцизов: ${valid.length}`, 'success');
  } catch (error) {
    console.error('Не удалось сформировать Excel-файл с акцизами:', error);
    showToast?.('Не удалось скачать файл с акцизами', 'error');
  }
}

function updateStats() {
  const total = excises.length;
  const valid = excises.filter(e => isValidMark(e.mark_number)).length;
  const invalid = total - valid;
  
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  
  setText('excise-stat-total', total);
  setText('excise-stat-valid', valid);
  setText('excise-stat-invalid', invalid);
  
  const pct = (n) => total > 0 ? Math.round((n / total) * 100) + '%' : '0%';
  setText('excise-stat-valid-pct', pct(valid));
  setText('excise-stat-invalid-pct', pct(invalid));
  
  // Обновляем бейдж в сайдбаре
  if (App.badges) {
    App.badges.update('excise');
  }
}

  async function processInput() {
    const input = document.getElementById('excise-input');
    if (!input) return;
    const raw = input.value;
    if (!raw.trim()) return;
    
    const parts = raw.split(/[\s]+/).filter(s => s.length > 0);
    const now = new Date().toISOString();
    const newItems = [];
    let duplicatesCount = 0;
    
    for (const part of parts) {
      const converted = convertLayout(part);
      
      if (excises.some(e => e.mark_number === converted)) {
        duplicatesCount++;
        continue;
      }
      
      const newItem = {
  id: 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11),
  mark_number: converted,
  created_at: now
};
      newItems.push(newItem);
      
      if (api() && api().createExcise) {
        api().createExcise(converted)
  .then(saved => {
    const tempId = newItem.id;
    if (saved._duplicate) { showToast('⚠️ Эта марка уже в списке');
      const idx = excises.findIndex(e => String(e.id) === String(tempId));
      if (idx !== -1) excises.splice(idx, 1);
      render();
      updateStats();
    } else {
      const idx = excises.findIndex(e => String(e.id) === String(tempId));
      if (idx !== -1) {
        excises[idx].id = saved.id;
        excises[idx].created_at = saved.createdAt || saved.created_at;
        // ВАЖНО: перерендериваем, чтобы onclick обновился с новым ID
        render();
        updateStats();
      }
    }
  })
  .catch(err => console.error('Ошибка сохранения:', err));
      }
    }
    
    if (newItems.length > 0) {
      excises = [...newItems, ...excises];
      render();
    }
    
    input.value = '';
    if (duplicatesCount > 0) showToast(duplicatesCount === 1 ? '⚠️ Такая марка уже есть' : `⚠️ Пропущено дубликатов: ${duplicatesCount}`);
  }

  async function deleteExcise(idRaw) {
  // Всегда работаем со строкой для сравнения
  const id = String(idRaw).replace(/^['"]|['"]$/g, ''); // Убираем кавычки если есть
  
  console.log('🗑️ Удаляем акциз, ID:', id);
  
  // Ищем элемент в массиве (сравниваем строки)
  const idx = excises.findIndex(e => String(e.id) === id);
  
  if (idx === -1) {
    console.warn('⚠️ Акциз не найден в списке, ID:', id, 'доступные:', excises.map(e => String(e.id)));
    return;
  }
  
  // Сохраняем элемент для возможного отката
  const removedItem = excises[idx];
  
  // Оптимистичное удаление
  excises.splice(idx, 1);
  console.log('✅ Удалён из списка, осталось:', excises.length);
  
  // Сразу обновляем UI
  render();

  // Если временный ID — не удаляем из БД
  if (id.startsWith('temp_')) {
    return;
  }

  // Удаляем из БД
  try {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) throw new Error('Invalid ID: ' + id);
    await api().deleteExcise(numericId);
  } catch (err) {
    console.error('❌ Ошибка удаления из БД:', err);
    excises.splice(idx, 0, removedItem);
    render();
    alert('Не удалось удалить акциз из базы данных');
  }
}

  async function clearList() {
    if (excises.length === 0) return;
    if (!confirm(`Удалить все ${excises.length} акциз из базы данных?`)) return;
    
    try {
      await api().deleteAllExcises();
      excises = [];
      render();
    } catch (err) {
      console.error('Ошибка удаления:', err);
      alert('Не удалось удалить: ' + err.message);
    }
  }

  async function loadFromDB(force = false) {
    if (isLoaded && !force) { render(); return; }
    if (!api() || !api().getExcises) {
      setTimeout(loadFromDB, 200);
      return;
    }
    try {
      const data = await api().getExcises();
      excises = data.map(e => ({
        id: e.id,
        mark_number: e.markNumber || e.mark_number,
        created_at: e.createdAt || e.created_at
      }));
      isLoaded = true;
      render();
    } catch (err) {
      console.error('Ошибка загрузки:', err);
    }
  }


  async function refreshFromDB() {
    await loadFromDB(true);
  }

  function bindEvents() {
    if (isBound) return;
    
    document.addEventListener('input', (e) => {
      if (e.target && e.target.id === 'excise-input') {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(processInput, 500);
      }
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.target && e.target.id === 'excise-input' && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        clearTimeout(debounceTimer);
        processInput();
      }
    });
    
    isBound = true;
  }

  function init() {
    if (!isInitialized) {
      document.getElementById('excise-download-btn')?.addEventListener('click', () => downloadValid());

      document.getElementById('excise-clear-all-btn')?.addEventListener('click', () => clearList());

      bindEvents();
      isInitialized = true;
    }
    loadFromDB();
  }

  // Бейдж — из локального списка (не из API: при удалении API ещё не успел обновиться)
  App.badges.register('excise', async () => {
  try {
    const data = await api().getExcises();
    return Array.isArray(data) ? data.length : 0;
  } catch (err) {
    return isLoaded ? excises.length : 0;
  }
});

  return { init, refresh: refreshFromDB, deleteExcise, copyToClipboard };
})();
