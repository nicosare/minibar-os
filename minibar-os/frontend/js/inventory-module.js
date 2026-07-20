// МОДУЛЬ ИНВЕНТАРИЗАЦИИ (v2 — единый дизайн)
// ═══════════════════════════════════════════════════════════════
App.inventoryModule = (() => {
  const api = () => window.api;
  const { escapeHtml, pluralize } = window.AppUtils;

  const colorMap = {
    amber: 'bg-amber-50', red: 'bg-red-50', blue: 'bg-blue-50',
    yellow: 'bg-yellow-50', purple: 'bg-purple-50', emerald: 'bg-emerald-50',
    rose: 'bg-rose-50', orange: 'bg-orange-50', slate: 'bg-slate-100'
  };
  const CATEGORY_ORDER = ['Дверца', 'Напитки', 'Алкоголь', 'Соки'];

  let products = [];
  let entries = {};
  let activeCategory = CATEGORY_ORDER[0];
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
    return CATEGORY_ORDER.map(name => ({ name, items: grouped[name] || [] }));
  }

  function renderTabs() {
    const tabsEl = document.getElementById('inventory-tabs');
    if (!tabsEl) return;
    const groups = getProductsByCategory();
    tabsEl.innerHTML = groups.map(g => {
      const count = g.items.filter(p => getQtySum(p.id) > 0).length;
      const active = g.name === activeCategory ? ' active' : '';
      return `<button type="button" class="cat-tab${active}" data-category="${escapeHtml(g.name)}">
        ${escapeHtml(g.name)}
        ${count > 0 ? `<span class="cat-tab-count">${count}</span>` : ''}
      </button>`;
    }).join('');
  }

  function renderProducts() {
    const container = document.getElementById('inventory-products-container');
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
      const entry = getEntry(p.id);
      const qty = getQtySum(p.id);
      const totalVol = getTotalVolume(p);
      const emoji = p.emoji || p.name.charAt(0).toUpperCase();
      return `
        <div class="product-card inv-card${qty > 0 ? ' has-qty' : ''}" data-product-id="${p.id}">
          <div class="product-card-emoji ${getColorClass(p.bgColor)}">${emoji}</div>
          <div class="product-card-info">
            <div class="product-card-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</div>
            <div class="product-card-meta">${p.volume || '—'} ${p.unit || 'шт'}</div>
          </div>
          <div class="inv-fields">
            <input type="text" class="inv-field" maxlength="4" placeholder="0" value="${entry.a}"
                   data-product-id="${p.id}" data-field="a" inputmode="numeric" autocomplete="off" />
            <span class="inv-plus">+</span>
            <input type="text" class="inv-field" maxlength="4" placeholder="0" value="${entry.b}"
                   data-product-id="${p.id}" data-field="b" inputmode="numeric" autocomplete="off" />
          </div>
          <div class="inv-result">
            <span class="inv-result-qty">= ${qty}</span>
            <span class="inv-result-vol">${formatVolume(p, totalVol)}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Точечное обновление карточки при вводе (чтобы не терять фокус)
  function updateProductSummary(productId) {
    const product = products.find(p => p.id === productId);
    const card = document.querySelector(`.inv-card[data-product-id="${productId}"]`);
    if (!product || !card) return;
    const qty = getQtySum(productId);
    const totalVol = getTotalVolume(product);
    const qtyEl = card.querySelector('.inv-result-qty');
    const volEl = card.querySelector('.inv-result-vol');
    if (qtyEl) qtyEl.textContent = '= ' + qty;
    if (volEl) volEl.textContent = formatVolume(product, totalVol);
    card.classList.toggle('has-qty', qty > 0);
  }

  function getSummaryEntries() {
    return products
      .filter(p => getQtySum(p.id) > 0)
      .map(p => ({ product: p, qty: getQtySum(p.id), volume: getTotalVolume(p) }))
      .sort((a, b) => a.product.name.localeCompare(b.product.name, 'ru'));
  }

  function renderSummary() {
    const list = getSummaryEntries();
    const totalVolume = list.reduce((s, e) => s + e.volume, 0);
    const countText = list.length === 0
      ? '0 продуктов'
      : `${list.length} ${pluralize(list.length, ['продукт', 'продукта', 'продуктов'])}`;
    const totalText = totalVolume.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
    const isEmpty = list.length === 0;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

    const rowsHtml = list.map(e => `
      <div class="bill-row">
        <div class="bill-row-info">
          <div class="bill-row-name">${escapeHtml(e.product.name)}</div>
          <div class="bill-row-meta">${e.qty} шт</div>
        </div>
        <div class="bill-row-sum">${formatVolume(e.product, e.volume)}</div>
      </div>
    `).join('');

    // Десктоп
    const emptyEl = document.getElementById('inventory-summary-empty');
    const listEl = document.getElementById('inventory-summary-list');
    if (emptyEl) emptyEl.classList.toggle('hidden', !isEmpty);
    if (listEl) {
      listEl.classList.toggle('hidden', isEmpty);
      listEl.innerHTML = rowsHtml;
    }
    set('inventory-total-volume', totalText);

    // Мобильная мини-панель
    const mobileBar = document.getElementById('inventory-mobile-bar');
    if (mobileBar) mobileBar.classList.toggle('hidden', isEmpty);
    set('inventory-mobile-count', countText);
    set('inventory-mobile-total', totalText);

    // Мобильная шторка
    set('inventory-summary-modal-total', totalText);
    const modalList = document.getElementById('inventory-summary-modal-list');
    if (modalList) {
      modalList.innerHTML = isEmpty
        ? '<div class="text-center py-8 text-slate-400 text-sm">Нет введённых данных</div>'
        : rowsHtml;
    }
  }

  function clearAll() {
    entries = {};
    renderProducts();
    renderSummary();
  }

  async function loadProducts() {
    const container = document.getElementById('inventory-products-container');
    try {
      products = await api().getProducts();
      isLoaded = true;
      renderProducts();
      renderSummary();
    } catch (err) {
      console.error('Ошибка загрузки продуктов:', err);
      if (container) {
        container.innerHTML = '<div class="text-center py-12 text-rose-500 text-sm">Не удалось загрузить продукты</div>';
      }
    }
  }

  function openSummaryModal() {
    document.getElementById('inventory-summary-modal')?.classList.remove('hidden');
  }
  function closeSummaryModal() {
    document.getElementById('inventory-summary-modal')?.classList.add('hidden');
  }

  function setupListeners() {
    if (isInitialized) return;

    document.getElementById('inventory-tabs')?.addEventListener('click', (e) => {
      const tab = e.target.closest('.cat-tab');
      if (!tab) return;
      activeCategory = tab.dataset.category;
      renderProducts();
    });

    document.getElementById('inventory-clear-btn')?.addEventListener('click', () => {
      if (Object.keys(entries).length === 0) return;
      if (confirm('Очистить все введённые данные?')) clearAll();
    });

    document.getElementById('inventory-mobile-expand')?.addEventListener('click', openSummaryModal);
    document.getElementById('inventory-summary-modal-close')?.addEventListener('click', closeSummaryModal);
    document.getElementById('inventory-summary-modal-backdrop')?.addEventListener('click', closeSummaryModal);
    document.getElementById('inventory-summary-modal-clear')?.addEventListener('click', () => {
      if (Object.keys(entries).length === 0) return;
      if (confirm('Очистить все введённые данные?')) {
        clearAll();
        closeSummaryModal();
      }
    });

    // Ввод в поля (без перерисовки сетки — фокус не теряется)
    document.getElementById('inventory-products-container')?.addEventListener('input', (e) => {
      const input = e.target.closest('.inv-field');
      if (!input) return;
      const productId = parseInt(input.dataset.productId, 10);
      const field = input.dataset.field;
      input.value = input.value.replace(/\D/g, '').slice(0, 4);
      if (!entries[productId]) entries[productId] = { a: '', b: '' };
      entries[productId][field] = input.value;
      if (!entries[productId].a && !entries[productId].b) {
        delete entries[productId];
      }
      updateProductSummary(productId);
      renderTabs();
      renderSummary();
    });

    isInitialized = true;
  }

  function init() {
    setupListeners();
    if (!isLoaded) {
      loadProducts();
    } else {
      renderProducts();
      renderSummary();
    }
  }

  return { init, clearAll };
})();
