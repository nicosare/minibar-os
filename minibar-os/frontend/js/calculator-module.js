// МОДУЛЬ КАЛЬКУЛЯТОРА
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
  /** @type {Record<number, number>} productId → qty */
  let cart = {};
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
    return CATEGORY_ORDER.map(name => ({
      name,
      items: grouped[name] || []
    }));
  }

  function renderProducts() {
    const container = document.getElementById('calculator-products-container');
    if (!container) return;

    if (products.length === 0) {
      container.innerHTML = '<div class="text-center py-12 text-slate-400 text-sm">Нет продуктов</div>';
      return;
    }

    const groups = getProductsByCategory();
    container.innerHTML = `
      <div class="calculator-categories-grid">
        ${groups.map(group => `
          <div class="calculator-category-col">
            <div class="calculator-category-header">${escapeHtml(group.name)}</div>
            <div class="calculator-category-items">
              ${group.items.length === 0
                ? '<div class="calculator-category-empty">—</div>'
                : group.items.map(p => {
                    const qty = getQty(p.id);
                    const price = parseFloat(p.price);
                    const emoji = p.emoji || p.name.charAt(0).toUpperCase();
                    return `
                      <div class="calculator-product-card${qty > 0 ? ' has-qty' : ''}" data-product-id="${p.id}">
                        <div class="calculator-product-main">
                          <div class="calculator-product-emoji ${getColorClass(p.bgColor)}">${emoji}</div>
                          <div class="calculator-product-info">
                            <div class="calculator-product-name">${escapeHtml(p.name)}</div>
                            <div class="calculator-product-meta">
                              <span class="calculator-product-price">${formatMoney(price)}</span>
                              <span class="calculator-product-qty">${qty}</span>
                            </div>
                          </div>
                        </div>
                        <div class="calculator-product-controls">
                          <button type="button" class="calc-dec-btn calculator-qty-btn" data-product-id="${p.id}" aria-label="Уменьшить" ${qty === 0 ? 'disabled' : ''}>
                            <i data-lucide="minus" class="w-3 h-3"></i>
                          </button>
                          <button type="button" class="calc-inc-btn calculator-qty-btn" data-product-id="${p.id}" aria-label="Увеличить">
                            <i data-lucide="plus" class="w-3 h-3"></i>
                          </button>
                        </div>
                      </div>
                    `;
                  }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  }

  function renderBill() {
    const emptyEl = document.getElementById('calculator-bill-empty');
    const listEl = document.getElementById('calculator-bill-list');
    const totalEl = document.getElementById('calculator-bill-total');
    const countEl = document.getElementById('calculator-bill-count');
    if (!listEl || !totalEl) return;

    const entries = Object.entries(cart)
      .map(([id, qty]) => {
        const product = products.find(p => p.id === parseInt(id, 10));
        if (!product) return null;
        const price = parseFloat(product.price);
        return { product, qty, price, subtotal: price * qty };
      })
      .filter(Boolean)
      .sort((a, b) => a.product.name.localeCompare(b.product.name, 'ru'));

    const totalQty = entries.reduce((sum, e) => sum + e.qty, 0);
    const totalSum = entries.reduce((sum, e) => sum + e.subtotal, 0);

    if (countEl) {
      countEl.textContent = totalQty === 0
        ? '0 позиций'
        : `${totalQty} ${pluralize(totalQty, ['позиция', 'позиции', 'позиций'])}`;
    }

    if (entries.length === 0) {
      emptyEl?.classList.remove('hidden');
      listEl.classList.add('hidden');
      listEl.innerHTML = '';
      totalEl.textContent = '0 ₽';
      return;
    }

    emptyEl?.classList.add('hidden');
    listEl.classList.remove('hidden');
    listEl.innerHTML = entries.map(({ product, qty, price, subtotal }) => `
      <div class="calculator-bill-row">
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-slate-900 truncate">${escapeHtml(product.name)}</div>
          <div class="text-xs text-slate-500">${qty} × ${formatMoney(price)}</div>
        </div>
        <div class="text-sm font-semibold text-slate-900 whitespace-nowrap ml-3">${formatMoney(subtotal)}</div>
        <button type="button" class="calc-dec-btn calculator-bill-dec ml-2" data-product-id="${product.id}" title="Убрать">
          <i data-lucide="minus" class="w-3 h-3"></i>
        </button>
      </div>
    `).join('');

    totalEl.textContent = formatMoney(totalSum);
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

  function setupListeners() {
    if (isInitialized) return;

    document.getElementById('calculator-clear-btn')?.addEventListener('click', () => {
      if (Object.keys(cart).length === 0) return;
      if (confirm('Очистить счёт?')) clearBill();
    });

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
