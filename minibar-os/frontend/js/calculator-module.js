// МОДУЛЬ КАЛЬКУЛЯТОРА (v3 — шторка со свайпом + копирование счёта)
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

  function getColorClass(color) {
    return colorMap[color] || 'bg-slate-100';
  }

  function formatMoney(value) {
    return parseFloat(value).toLocaleString('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }) + ' ₽';
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
  }

  function clearBill() {
    cart = {};
    renderProducts();
    renderBill();
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

    // Мобильная мини-панель
    const mobileBar = document.getElementById('calculator-mobile-bar');
    if (mobileBar) mobileBar.classList.toggle('hidden', isEmpty);
    set('calculator-mobile-count', countText);
    set('calculator-mobile-total', totalText);

    // Мобильная шторка
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

  // ── Копирование счёта ──────────────────────────────────────
  function getBillText() {
    const entries = getBillEntries();
    if (entries.length === 0) return null;
    const totalSum = entries.reduce((s, e) => s + e.subtotal, 0);
    const lines = [`Счёт на ${formatMoney(totalSum)}`];
    entries.forEach(e => lines.push(`${e.product.name} х ${e.qty}`));
    return lines.join('\n');
  }

  async function copyBill() {
    const text = getBillText();
    if (!text) {
      showToast('Счёт пуст');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast('Счёт скопирован');
    } catch (err) {
      // Фолбэк для браузеров без Clipboard API
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        showToast('Счёт скопирован');
      } catch (e) {
        showToast('Не удалось скопировать');
      }
      document.body.removeChild(ta);
    }
  }

  // ── Инъекция кнопок «Копировать» (без правки index.html) ──
  function injectCopyButtons() {
    // Десктоп: рядом с «Очистить» в шапке боковой панели
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

    // Мобильный: рядом с «Очистить счёт» в футере шторки
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

  // ── Ручка шторки + закрытие свайпом вниз ──────────────────
  function injectSheetHandle() {
    const content = document.querySelector('#calculator-bill-modal .sheet-modal-content');
    if (!content || content.querySelector('.calc-sheet-handle')) return;
    const handle = document.createElement('div');
    handle.className = 'calc-sheet-handle';
    handle.style.cssText = 'width:40px;height:4px;border-radius:2px;background:#e2e8f0;margin:10px auto 2px;flex-shrink:0;';
    content.insertBefore(handle, content.firstChild);
  }

  function setupBillSheetSwipe() {
    const modal = document.getElementById('calculator-bill-modal');
    if (!modal || modal.dataset.swipeInit) return;
    const content = modal.querySelector('.sheet-modal-content');
    if (!content) return;
    modal.dataset.swipeInit = '1';

    let startY = 0, dy = 0, dragging = false;

    content.addEventListener('touchstart', (e) => {
      // Свайп работает только если касание началось с верхней части (ручка или шапка)
      if (!e.target.closest('.sheet-modal-header') && !e.target.closest('.calc-sheet-handle')) return;
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

  async function loadProducts() {
    const container = document.getElementById('calculator-products-container');
    try {
      products = await api().getProducts();
      isLoaded = true;
      renderProducts();
      renderBill();
    } catch (err) {
      console.error('Ошибка загрузки продуктов:', err);
      if (container) {
        container.innerHTML = '<div class="text-center py-12 text-rose-500 text-sm">Не удалось загрузить продукты</div>';
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

    // Инъекция кнопок и ручки, свайп
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

    // Копирование счёта (ПК + шторка)
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

    // Делегирование кликов по +/− (работает и в сетке, и в счёте, и в шторке)
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

  return { init, clearBill, changeQty, copyBill };
})();
