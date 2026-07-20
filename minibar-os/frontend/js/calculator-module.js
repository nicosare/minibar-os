// МОДУЛЬ КАЛЬКУЛЯТОРА (v2 — единый дизайн)
// ═══════════════════════════════════════════════════════════════
App.calculatorModule = (() => {
  const api = () => window.api;
  const { escapeHtml, pluralize } = window.AppUtils;

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

  return { init, clearBill, changeQty };
})();
