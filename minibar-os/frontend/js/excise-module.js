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
      const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      
      const safeMark = String(e.mark_number).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return `
        <div class="excise-card ${statusClass}" 
             onclick="App.exciseModule.copyToClipboard('${safeMark}')"
             title="Кликните, чтобы скопировать">
          
          <!-- Статус-иконка (видна всегда, кроме hover) -->
          <div class="excise-status-icon">
            ${isValid 
              ? '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
              : '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
            }
          </div>
          
          <!-- Корзина при наведении -->
          <div class="excise-delete-btn" 
               onclick="event.stopPropagation(); App.exciseModule.deleteExcise('${e.id}')"
               title="Удалить">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
            </svg>
          </div>
          
          <!-- Номер марки -->
          <div class="excise-card-mark">${escapeHtml(e.mark_number)}</div>
          
          <!-- Мета -->
          <div class="excise-card-meta">
            <span>${isValid ? '✓ Валидна' : '✕ Ошибка'}</span>
            <span>${timeStr}</span>
          </div>
        </div>
      `;
    }).join('');
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
    if (saved._duplicate) {
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
    if (duplicatesCount > 0) console.log(`⚠️ Пропущено дубликатов: ${duplicatesCount}`);
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

  async function copyValid() {
    const valid = excises.filter(e => isValidMark(e.mark_number)).map(e => e.mark_number);
    if (valid.length === 0) {
      alert('Нет валидных акцизов для копирования');
      return;
    }

    try {
      await navigator.clipboard.writeText(valid.join('\n'));
      const shouldClear = confirm(`✓ Скопировано ${valid.length} акциз\n\nОчистить список после копирования?`);
      if (shouldClear) {
        await api().deleteAllExcises();
        excises = [];
        render();
      }
    } catch (err) {
      alert('Не удалось скопировать');
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

  async function loadFromDB() {
    if (isLoaded) return;
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
      document.getElementById('excise-copy-all-btn')?.addEventListener('click', () => copyValid());

      document.getElementById('excise-clear-all-btn')?.addEventListener('click', () => clearList());

      bindEvents();
      isInitialized = true;
    }
    loadFromDB();
  }

  // Бейдж — из локального списка (не из API: при удалении API ещё не успел обновиться)
  App.badges.register('excise', async () => excises.length);

  return { init, refresh: render, deleteExcise, copyToClipboard };
})();
