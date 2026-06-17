// МОДУЛЬ ИНВЕНТАРИЗАЦИИ
// ═══════════════════════════════════════════════════════════════
App.inventoryModule = (() => {
  const api = () => window.api;
  const { escapeHtml } = window.AppUtils;

  const colorMap = {
    amber: 'bg-amber-50', red: 'bg-red-50', blue: 'bg-blue-50',
    yellow: 'bg-yellow-50', purple: 'bg-purple-50', emerald: 'bg-emerald-50',
    rose: 'bg-rose-50', orange: 'bg-orange-50', slate: 'bg-slate-100'
  };
  const CATEGORY_ORDER = ['Дверца', 'Напитки', 'Алкоголь', 'Соки'];

  let products = [];
  /** @type {Record<number, { a: string, b: string }>} */
  let entries = {};
  let isInitialized = false;
  let isLoaded = false;

  function getColorClass(color) {
    return colorMap[color] || 'bg-slate-100';
  }

  function parseCount(value) {
    const n = parseInt(String(value).replace(/\D/g, ''), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function getEntry(productId) {
    return entries[productId] || { a: '', b: '' };
  }

  function getQtySum(productId) {
    const { a, b } = getEntry(productId);
    return parseCount(a) + parseCount(b);
  }

  function getTotalVolume(product) {
    const qty = getQtySum(product.id);
    const unitVol = parseFloat(product.volume) || 0;
    return qty * unitVol;
  }

  function formatVolume(product, total) {
    const unit = product.unit || 'шт';
    if (!total) return `0 ${unit}`;
    const formatted = total.toLocaleString('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    });
    return `${formatted} ${unit}`;
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

  function updateProductSummary(productId) {
    const product = products.find(p => p.id === productId);
    const card = document.querySelector(`.inventory-product-card[data-product-id="${productId}"]`);
    if (!product || !card) return;

    const qty = getQtySum(productId);
    const totalVol = getTotalVolume(product);

    const qtyEl = card.querySelector('.inventory-product-qty');
    const volEl = card.querySelector('.inventory-product-volume');
    if (qtyEl) qtyEl.textContent = qty;
    if (volEl) volEl.textContent = formatVolume(product, totalVol);
    card.classList.toggle('has-qty', qty > 0);
  }

  function renderProducts() {
    const container = document.getElementById('inventory-products-container');
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
                    const entry = getEntry(p.id);
                    const qty = getQtySum(p.id);
                    const totalVol = getTotalVolume(p);
                    const emoji = p.emoji || p.name.charAt(0).toUpperCase();
                    return `
                      <div class="inventory-product-card${qty > 0 ? ' has-qty' : ''}" data-product-id="${p.id}">
                        <div class="inventory-product-main">
                          <div class="calculator-product-emoji ${getColorClass(p.bgColor)}">${emoji}</div>
                          <div class="calculator-product-name">${escapeHtml(p.name)}</div>
                        </div>
                        <div class="inventory-product-fields">
                          <input type="text" class="inventory-field-input" maxlength="4"
                                 placeholder="0" value="${entry.a}"
                                 data-product-id="${p.id}" data-field="a"
                                 inputmode="numeric" autocomplete="off" />
                          <input type="text" class="inventory-field-input" maxlength="4"
                                 placeholder="0" value="${entry.b}"
                                 data-product-id="${p.id}" data-field="b"
                                 inputmode="numeric" autocomplete="off" />
                        </div>
                        <div class="inventory-product-result">
                          <span class="inventory-product-qty">${qty}</span>
                          <span class="inventory-product-volume">${formatVolume(p, totalVol)}</span>
                        </div>
                      </div>
                    `;
                  }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function clearAll() {
    entries = {};
    renderProducts();
  }

  async function loadProducts() {
    const container = document.getElementById('inventory-products-container');
    try {
      products = await api().getProducts();
      isLoaded = true;
      renderProducts();
    } catch (err) {
      console.error('Ошибка загрузки продуктов:', err);
      if (container) {
        container.innerHTML = '<div class="text-center py-12 text-rose-500 text-sm">Не удалось загрузить продукты</div>';
      }
    }
  }

  function setupListeners() {
    if (isInitialized) return;

    document.getElementById('inventory-clear-btn')?.addEventListener('click', () => {
      if (Object.keys(entries).length === 0) return;
      if (confirm('Очистить все введённые данные?')) clearAll();
    });

    document.getElementById('inventory-products-container')?.addEventListener('input', (e) => {
      const input = e.target.closest('.inventory-field-input');
      if (!input) return;

      const productId = parseInt(input.dataset.productId, 10);
      const field = input.dataset.field;
      input.value = input.value.replace(/\D/g, '').slice(0, 4);

      if (!entries[productId]) entries[productId] = { a: '', b: '' };
      entries[productId][field] = input.value;

      if (!input.value && !entries[productId][field === 'a' ? 'b' : 'a']) {
        delete entries[productId];
      }

      updateProductSummary(productId);
    });

    isInitialized = true;
  }

  function init() {
    setupListeners();
    if (!isLoaded) {
      loadProducts();
    } else {
      renderProducts();
    }
  }

  return { init, clearAll };
})();
