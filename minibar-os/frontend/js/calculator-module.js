// МОДУЛЬ КАЛЬКУЛЯТОРА (v4 — шторка на телефоне + страница на ПК)
// ═══════════════════════════════════════════════════════════════
// Телефон: тап по «Калькулятор» в таб-баре или шторке «Ещё»
// открывает шторку с плоской сеткой продуктов (тап = +1, счётчик = −1).
// ПК: обычная страница с вкладками категорий и боковым счётом.
// Корзина общая для обоих режимов.
// ═══════════════════════════════════════════════════════════════
App.calculatorModule = (() => {
  const api = () => window.api;
  const { escapeHtml, pluralize, showToast } = window.AppUtils;

  const colorMap = {
    amber: 'bg-amber-50', red: 'bg-red-50', blue: 'bg-blue-50',
    yellow: 'bg-yellow-50', purple: 'bg-purple-50', emerald: 'bg-emerald-50',
    rose: 'bg-rose-50', orange: 'bg-orange-50', slate: 'bg-slate-100'
  };
  const CATEGORY_ORDER = ['Дверца', 'Напитки', 'Алкоголь', 'Соки'];

  let products = [];
  let cart = {};
  let activeCategory = CATEGORY_ORDER[0];
  let isInitialized = false;
  let isLoaded = false;
  let sheetBuilt = false;
  let sheetOpen = false;

  function getColorClass(color) {
    return colorMap[color] || 'bg-slate-100';
  }

  function formatMoney(value) {
    return parseFloat(value).toLocaleString('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }) + ' ₽';
  }

  function vibrate(ms) {
    if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
  }

  function isMobile() {
    return window.matchMedia('(max-width: 768px)').matches;
  }

  function getQty(productId) {
    return cart[productId] || 0;
  }

  function changeQty(productId, delta) {
    const next = getQty(productId) + delta;
    if (next <= 0) {
      delete cart[productId];
    } else {
      cart[productId] = next;
    }
    renderProducts();
    renderBill();
    if (sheetOpen) {
      updateSheetCard(productId);
      renderSheetFooter();
    }
  }

  function clearBill() {
    cart = {};
    renderProducts();
    renderBill();
    if (sheetOpen) {
      renderSheetGrid();
      renderSheetFooter();
    }
  }

  function getProductsByCategory() {
    const grouped = {};
    products.forEach(p => {
      const cat = p.category || 'Напитки';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    });
    return CATEGORY_ORDER.map(name => ({ name, items: grouped[name] || [] }));
  }

  function renderTabs() {
    const tabsEl = document.getElementById('calculator-tabs');
    if (!tabsEl) return;
    const groups = getProductsByCategory();
    tabsEl.innerHTML = groups.map(g => {
      const count = g.items.reduce((s, p) => s + getQty(p.id), 0);
      const active = g.name === activeCategory ? ' active' : '';
      return `<button type="button" class="cat-tab${active}" data-category="${escapeHtml(g.name)}">
        ${escapeHtml(g.name)}
        ${count > 0 ? `<span class="cat-tab-count">${count}</span>` : ''}
      </button>`;
    }).join('');
  }

  function renderProducts() {
    const container = document.getElementById('calculator-products-container');
    if (!container) return;
    renderTabs();

    if (products.length === 0) {
      container.innerHTML = '<div class="text-center py-12 text-slate-400 text-sm">Нет продуктов</div>';
      return;
    }

    const groups = getProductsByCategory();
    const group = groups.find(g => g.name === activeCategory) || groups[0];

    if (group.items.length === 0) {
      container.innerHTML = '<div class="text-center py-12 text-slate-400 text-sm">Нет продуктов в этой категории</div>';
      return;
    }

    container.innerHTML = group.items.map(p => {
      const qty = getQty(p.id);
      const price = parseFloat(p.price);
      const emoji = p.emoji || p.name.charAt(0).toUpperCase();
      return `
        <div class="product-card calc-card${qty > 0 ? ' has-qty' : ''}" data-product-id="${p.id}">
          <div class="product-card-emoji ${getColorClass(p.bgColor)}">${emoji}</div>
          <div class="product-card-info">
            <div class="product-card-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</div>
            <div class="product-card-meta">${formatMoney(price)}</div>
          </div>
          <div class="calc-controls">
            <button type="button" class="calc-qty-btn calc-dec-btn" data-product-id="${p.id}" aria-label="Уменьшить" ${qty === 0 ? 'disabled' : ''}>
              <i data-lucide="minus" class="w-4 h-4"></i>
            </button>
            <span class="calc-qty-value">${qty}</span>
            <button type="button" class="calc-qty-btn calc-inc-btn" data-product-id="${p.id}" aria-label="Увеличить">
              <i data-lucide="plus" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  // Плоский список для шторки: без категорий, но в логичном порядке
  function sortedFlatProducts() {
    const catIndex = (p) => {
      const i = CATEGORY_ORDER.indexOf(p.category || 'Напитки');
      return i === -1 ? 99 : i;
    };
    return [...products].sort((a, b) => {
      const d = catIndex(a) - catIndex(b);
      return d !== 0 ? d : a.name.localeCompare(b.name, 'ru');
    });
  }

  function getBillEntries() {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const product = products.find(p => p.id === parseInt(id, 10));
        if (!product) return null;
        const price = parseFloat(product.price);
        return { product, qty, price, subtotal: price * qty };
      })
      .filter(Boolean)
      .sort((a, b) => a.product.name.localeCompare(b.product.name, 'ru'));
  }

  function billRowHtml(e) {
    return `
      <div class="bill-row">
        <div class="bill-row-info">
          <div class="bill-row-name">${escapeHtml(e.product.name)}</div>
          <div class="bill-row-meta">${e.qty} × ${formatMoney(e.price)}</div>
        </div>
        <div class="bill-row-sum">${formatMoney(e.subtotal)}</div>
        <button type="button" class="bill-row-del calc-dec-btn" data-product-id="${e.product.id}" title="Убрать">
          <i data-lucide="minus" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `;
  }

  function renderBill() {
    const entries = getBillEntries();
    const totalQty = entries.reduce((s, e) => s + e.qty, 0);
    const totalSum = entries.reduce((s, e) => s + e.subtotal, 0);
    const countText = totalQty === 0
      ? '0 позиций'
      : `${totalQty} ${pluralize(totalQty, ['позиция', 'позиции', 'позиций'])}`;
    const totalText = formatMoney(totalSum);
    const rowsHtml = entries.map(billRowHtml).join('');
    const isEmpty = entries.length === 0;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

    // Десктоп-панель
    const emptyEl = document.getElementById('calculator-bill-empty');
    const listEl = document.getElementById('calculator-bill-list');
    if (emptyEl) emptyEl.classList.toggle('hidden', !isEmpty);
    if (listEl) {
      listEl.classList.toggle('hidden', isEmpty);
      listEl.innerHTML = rowsHtml;
    }
    set('calculator-bill-count', countText);
    set('calculator-bill-total', totalText);

    // Мобильная мини-панель (страница)
    const mobileBar = document.getElementById('calculator-mobile-bar');
    if (mobileBar) mobileBar.classList.toggle('hidden', isEmpty);
    set('calculator-mobile-count', countText);
    set('calculator-mobile-total', totalText);

    // Мобильная шторка счёта (страница)
    set('calculator-bill-modal-count', countText);
    set('calculator-bill-modal-total', totalText);
    const modalList = document.getElementById('calculator-bill-modal-list');
    if (modalList) {
      modalList.innerHTML = isEmpty
        ? '<div class="text-center py-8 text-slate-400 text-sm">Счёт пуст</div>'
        : rowsHtml;
    }

    if (window.lucide) lucide.createIcons();
  }

  // ── Копирование счёта ───────────────────────────────────────
  function getBillText() {
    const entries = getBillEntries();
    if (entries.length === 0) return null;
    const totalSum = entries.reduce((s, e) => s + e.subtotal, 0);
    const lines = [`Счёт на ${formatMoney(totalSum)}`];
    entries.forEach(e => lines.push(`${e.product.name} х ${e.qty}`));
    return lines.join('\n');
  }

  // Тост с высоким z-index — виден поверх любой шторки
  function sheetToast(message) {
    const t = document.createElement('div');
    t.className = 'cs-toast';
    t.textContent = message;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 250);
    }, 1800);
  }

  async function copyBill() {
    const text = getBillText();
    if (!text) {
      sheetToast('Счёт пуст');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      sheetToast('Счёт скопирован');
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        sheetToast('Счёт скопирован');
      } catch (e) {
        sheetToast('Не удалось скопировать');
      }
      document.body.removeChild(ta);
    }
  }

  // ── Инъекция кнопок «Копировать» на странице (без правки index.html) ──
  function injectCopyButtons() {
    const clearBtn = document.getElementById('calculator-clear-btn');
    if (clearBtn && !document.getElementById('calculator-copy-btn')) {
      const wrap = document.createElement('div');
      wrap.style.display = 'flex';
      wrap.style.gap = '4px';
      clearBtn.parentNode.insertBefore(wrap, clearBtn);
      const copyBtn = document.createElement('button');
      copyBtn.id = 'calculator-copy-btn';
      copyBtn.className = 'btn btn-ghost btn-sm';
      copyBtn.innerHTML = '<i data-lucide="copy" class="w-3.5 h-3.5"></i> Копировать';
      wrap.appendChild(copyBtn);
      wrap.appendChild(clearBtn);
    }

    const clearModalBtn = document.getElementById('calculator-bill-modal-clear');
    if (clearModalBtn && !document.getElementById('calculator-bill-modal-copy')) {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '8px';
      clearModalBtn.parentNode.insertBefore(row, clearModalBtn);
      const copyModalBtn = document.createElement('button');
      copyModalBtn.id = 'calculator-bill-modal-copy';
      copyModalBtn.className = 'btn btn-primary';
      copyModalBtn.style.flex = '1';
      copyModalBtn.innerHTML = '<i data-lucide="copy" class="w-4 h-4"></i> Копировать';
      clearModalBtn.style.flex = '1';
      clearModalBtn.style.width = 'auto';
      row.appendChild(copyModalBtn);
      row.appendChild(clearModalBtn);
    }

    if (window.lucide) lucide.createIcons();
  }

  function injectSheetHandle() {
    // Ручка и шапка уже заданы в HTML единой структурой ms-drag-zone/ms-header-row.
  }

  function setupBillSheetSwipe() {
    const modal = document.getElementById('calculator-bill-modal');
    if (!modal || modal.dataset.swipeInit) return;
    const content = modal.querySelector('.sheet-modal-content');
    if (!content) return;
    modal.dataset.swipeInit = '1';

    let startY = 0, dy = 0, dragging = false;

    content.addEventListener('touchstart', (e) => {
      if (!e.target.closest('.sheet-modal-drag-zone') && !e.target.closest('.sheet-modal-header')) return;
      dragging = true;
      startY = e.touches[0].clientY;
      dy = 0;
      content.style.transition = 'none';
    }, { passive: true });

    content.addEventListener('touchmove', (e) => {
      if (!dragging) return;
      dy = Math.max(0, e.touches[0].clientY - startY);
      content.style.transform = `translateY(${dy}px)`;
    }, { passive: true });

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      content.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0.24, 1)';
      if (dy > 90) {
        content.style.transform = 'translateY(105%)';
        setTimeout(() => {
          closeBillModal();
          content.style.transform = '';
          content.style.transition = '';
        }, 240);
      } else {
        content.style.transform = '';
        setTimeout(() => { content.style.transition = ''; }, 260);
      }
    };
    content.addEventListener('touchend', endDrag);
    content.addEventListener('touchcancel', endDrag);
  }

  // ═════════════════════════════════════════════════════════════
  // ШТОРКА КАЛЬКУЛЯТОРА (только телефон)
  // ═════════════════════════════════════════════════════════════
  function buildSheet() {
    if (sheetBuilt) return;
    const wrap = document.createElement('div');
    wrap.id = 'calc-sheet-backdrop';
    wrap.className = 'hidden';
    wrap.innerHTML = `
      <div id="calc-sheet">
        <div class="ms-drag-zone cs-drag-zone">
          <div class="ms-handle cs-handle"></div>
          <div class="ms-header-row cs-header">
            <span class="ms-title cs-title">Калькулятор</span>
            <button type="button" id="cs-close" class="ms-close-btn" aria-label="Закрыть">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
        <div class="cs-body">
          <div class="cs-hint">Нажмите на продукт — добавить · на счётчик — убрать</div>
          <div id="cs-grid" class="cs-grid"></div>
        </div>
        <div class="cs-footer">
          <div class="cs-totals">
            <span class="cs-count" id="cs-count">0 позиций</span>
            <span class="cs-total" id="cs-total">0 ₽</span>
          </div>
          <button type="button" id="cs-copy" class="btn btn-primary btn-sm" disabled>
              <i data-lucide="copy" class="w-4 h-4"></i> Копировать
            </button>
          <button type="button" id="cs-clear" class="btn btn-outline btn-sm" disabled>
              <i data-lucide="trash-2" class="w-4 h-4"></i> Очистить
            </button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    document.getElementById('cs-close').addEventListener('click', closeSheet);
    wrap.addEventListener('click', (e) => {
      if (e.target.id === 'calc-sheet-backdrop') closeSheet();
    });
    document.getElementById('cs-copy').addEventListener('click', copyBill);
    document.getElementById('cs-clear').addEventListener('click', () => {
      if (Object.keys(cart).length === 0) return;
      if (confirm('Очистить счёт?')) clearBill();
    });

    // Тап по карточке = +1, тап по счётчику = −1
    document.getElementById('cs-grid').addEventListener('click', (e) => {
      const badge = e.target.closest('.cs-badge');
      if (badge) {
        changeQty(parseInt(badge.dataset.productId, 10), -1);
        vibrate(20);
        return;
      }
      const card = e.target.closest('.cs-product');
      if (card) {
        changeQty(parseInt(card.dataset.productId, 10), 1);
        vibrate(20);
      }
    });

    setupCalcSheetSwipe();
    sheetBuilt = true;
    if (window.lucide) lucide.createIcons();
  }

  function renderSheetGrid() {
    const grid = document.getElementById('cs-grid');
    if (!grid) return;
    if (!isLoaded) {
      grid.innerHTML = `
        <div class="cs-loading">
          <i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Загрузка...
        </div>`;
      if (window.lucide) lucide.createIcons();
      return;
    }
    if (products.length === 0) {
      grid.innerHTML = '<div class="cs-loading">Нет продуктов</div>';
      return;
    }
    grid.innerHTML = sortedFlatProducts().map(p => {
      const qty = getQty(p.id);
      const emoji = p.emoji || p.name.charAt(0).toUpperCase();
      return `
        <button type="button" class="cs-product${qty > 0 ? ' has-qty' : ''}" data-product-id="${p.id}">
          ${qty > 0 ? `<span class="cs-badge" data-product-id="${p.id}">${qty}</span>` : ''}
          <span class="cs-emoji ${getColorClass(p.bgColor)}">${emoji}</span>
          <span class="cs-name">${escapeHtml(p.name)}</span>
          <span class="cs-price">${formatMoney(parseFloat(p.price))}</span>
        </button>
      `;
    }).join('');
  }

  // Точечное обновление карточки (без перерисовки всей сетки)
  function updateSheetCard(productId) {
    const grid = document.getElementById('cs-grid');
    if (!grid) return;
    const card = grid.querySelector(`.cs-product[data-product-id="${productId}"]`);
    if (!card) return;
    const qty = getQty(productId);
    card.classList.toggle('has-qty', qty > 0);
    let badge = card.querySelector('.cs-badge');
    if (qty > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'cs-badge';
        badge.dataset.productId = productId;
        card.insertBefore(badge, card.firstChild);
      }
      badge.textContent = qty;
    } else if (badge) {
      badge.remove();
    }
  }

  function renderSheetFooter() {
    const entries = getBillEntries();
    const totalQty = entries.reduce((s, e) => s + e.qty, 0);
    const totalSum = entries.reduce((s, e) => s + e.subtotal, 0);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('cs-count', totalQty === 0
      ? '0 позиций'
      : `${totalQty} ${pluralize(totalQty, ['позиция', 'позиции', 'позиций'])}`);
    set('cs-total', formatMoney(totalSum));
    const empty = entries.length === 0;
    const copyBtn = document.getElementById('cs-copy');
    const clearBtn = document.getElementById('cs-clear');
    if (copyBtn) copyBtn.disabled = empty;
    if (clearBtn) clearBtn.disabled = empty;
  }

  function openSheet() {
    buildSheet();
    if (!isLoaded && products.length === 0) loadProducts();
    renderSheetGrid();
    renderSheetFooter();
    const backdrop = document.getElementById('calc-sheet-backdrop');
    backdrop.classList.remove('hidden');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        backdrop.classList.add('show');
        document.getElementById('calc-sheet').classList.add('open');
      });
    });
    sheetOpen = true;
    // Блокируем прокрутку фона
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }

  function closeSheet() {
    const backdrop = document.getElementById('calc-sheet-backdrop');
    if (!backdrop || backdrop.classList.contains('hidden')) return;
    backdrop.classList.remove('show');
    document.getElementById('calc-sheet').classList.remove('open');
    setTimeout(() => backdrop.classList.add('hidden'), 280);
    sheetOpen = false;
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }

  function setupCalcSheetSwipe() {
    const sheet = document.getElementById('calc-sheet');
    const zone = sheet.querySelector('.cs-drag-zone');
    let startY = 0, dy = 0, dragging = false;

    zone.addEventListener('touchstart', (e) => {
      dragging = true;
      startY = e.touches[0].clientY;
      dy = 0;
      sheet.style.transition = 'none';
    }, { passive: true });

    zone.addEventListener('touchmove', (e) => {
      if (!dragging) return;
      dy = Math.max(0, e.touches[0].clientY - startY);
      sheet.style.transform = `translateY(${dy}px)`;
    }, { passive: true });

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      sheet.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0.24, 1)';
      if (dy > 90) {
        sheet.style.transform = 'translateY(105%)';
        setTimeout(() => {
          closeSheet();
          sheet.style.transform = '';
          sheet.style.transition = '';
        }, 240);
      } else {
        sheet.style.transform = '';
        setTimeout(() => { sheet.style.transition = ''; }, 260);
      }
    };
    zone.addEventListener('touchend', endDrag);
    zone.addEventListener('touchcancel', endDrag);
  }

  // Перехват кликов по «Калькулятор» в мобильной навигации.
  // Capture-фаза: срабатывает РАНЬШЕ обработчиков mobile-nav
  // и не даёт им выполнить переход на страницу.
  function interceptMobileCalculator() {
    ['mobile-tabbar', 'mobile-more-sheet'].forEach(id => {
      const el = document.getElementById(id);
      if (!el || el.dataset.calcIntercept) return;
      el.dataset.calcIntercept = '1';
      el.addEventListener('click', (e) => {
        if (!isMobile()) return;
        const target = e.target.closest('[data-route="calculator"]');
        if (!target) return;
        e.preventDefault();
        e.stopPropagation();
        // Прикрываем шторку «Ещё», если тап был в ней
        const moreBackdrop = document.getElementById('mobile-more-backdrop');
        if (moreBackdrop && !moreBackdrop.classList.contains('hidden')) {
          moreBackdrop.classList.remove('show');
          document.getElementById('mobile-more-sheet')?.classList.remove('open');
          setTimeout(() => moreBackdrop.classList.add('hidden'), 280);
        }
        setTimeout(openSheet, 150);
      }, true);
    });
  }

  async function loadProducts() {
    const container = document.getElementById('calculator-products-container');
    try {
      products = await api().getProducts();
      isLoaded = true;
      renderProducts();
      renderBill();
      if (sheetOpen) {
        renderSheetGrid();
        renderSheetFooter();
      }
    } catch (err) {
      console.error('Ошибка загрузки продуктов:', err);
      if (container) {
        container.innerHTML = '<div class="text-center py-12 text-rose-500 text-sm">Не удалось загрузить продукты</div>';
      }
      if (sheetOpen) {
        const grid = document.getElementById('cs-grid');
        if (grid) grid.innerHTML = '<div class="cs-loading">Не удалось загрузить</div>';
      }
    }
  }

  function openBillModal() {
    document.getElementById('calculator-bill-modal')?.classList.remove('hidden');
  }
  function closeBillModal() {
    document.getElementById('calculator-bill-modal')?.classList.add('hidden');
  }

  function setupListeners() {
    if (isInitialized) return;

    injectCopyButtons();
    injectSheetHandle();
    setupBillSheetSwipe();

    document.getElementById('calculator-tabs')?.addEventListener('click', (e) => {
      const tab = e.target.closest('.cat-tab');
      if (!tab) return;
      activeCategory = tab.dataset.category;
      renderProducts();
    });

    document.getElementById('calculator-clear-btn')?.addEventListener('click', () => {
      if (Object.keys(cart).length === 0) return;
      if (confirm('Очистить счёт?')) clearBill();
    });

    document.getElementById('calculator-copy-btn')?.addEventListener('click', copyBill);
    document.getElementById('calculator-bill-modal-copy')?.addEventListener('click', copyBill);

    document.getElementById('calculator-mobile-expand')?.addEventListener('click', openBillModal);
    document.getElementById('calculator-bill-modal-close')?.addEventListener('click', closeBillModal);
    document.getElementById('calculator-bill-modal-backdrop')?.addEventListener('click', closeBillModal);
    document.getElementById('calculator-bill-modal-clear')?.addEventListener('click', () => {
      if (Object.keys(cart).length === 0) return;
      if (confirm('Очистить счёт?')) {
        clearBill();
        closeBillModal();
      }
    });

    // Делегирование кликов по +/− на странице
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#view-calculator')) return;
      const inc = e.target.closest('.calc-inc-btn');
      if (inc) {
        changeQty(parseInt(inc.dataset.productId, 10), 1);
        return;
      }
      const dec = e.target.closest('.calc-dec-btn');
      if (dec) {
        changeQty(parseInt(dec.dataset.productId, 10), -1);
      }
    });

    isInitialized = true;
  }

  function init() {
    setupListeners();
    if (!isLoaded) {
      loadProducts();
    } else {
      renderProducts();
      renderBill();
    }
  }

  // Перехват регистрируем сразу (не дожидаясь init),
  // чтобы работал первый же тап по «Калькулятор»
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', interceptMobileCalculator);
  } else {
    interceptMobileCalculator();
  }

  return { init, clearBill, changeQty, copyBill, openSheet, closeSheet };
})();
