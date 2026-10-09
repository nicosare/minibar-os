// МОДУЛЬ КАЛЬКУЛЯТОРА — desktop-first
// ═══════════════════════════════════════════════════════════════
// Desktop calculator drawer
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
let drawerBuilt = false;
let drawerOpen = false;

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
    if (next <= 0) delete cart[productId];
    else cart[productId] = next;
    renderProducts();
    renderBill();
    if (drawerOpen) {
      updateDrawerCard(productId);
      renderDrawerBill();
    }
  }

  function clearBill() {
    cart = {};
    renderProducts();
    renderBill();
    if (drawerOpen) {
      renderDrawerGrid();
      renderDrawerBill();
    }
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
      items: (grouped[name] || []).sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    }));
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
    const totalQty = entries.reduce((sum, e) => sum + e.qty, 0);
    const totalSum = entries.reduce((sum, e) => sum + e.subtotal, 0);
    const countText = totalQty === 0
      ? '0 позиций'
      : `${totalQty} ${pluralize(totalQty, ['позиция', 'позиции', 'позиций'])}`;
    const rowsHtml = entries.map(billRowHtml).join('');
    const isEmpty = entries.length === 0;
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    const emptyEl = document.getElementById('calculator-bill-empty');
    const listEl = document.getElementById('calculator-bill-list');
    if (emptyEl) emptyEl.classList.toggle('hidden', !isEmpty);
    if (listEl) {
      listEl.classList.toggle('hidden', isEmpty);
      listEl.innerHTML = rowsHtml;
    }
    set('calculator-bill-count', countText);
    set('calculator-bill-total', formatMoney(totalSum));
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
  function showCopyToast(message) {
    const t = document.createElement('div');
    t.className = 'app-toast';
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
      showCopyToast('Счёт пуст');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showCopyToast('Счёт скопирован');
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        showCopyToast('Счёт скопирован');
      } catch (e) {
        showCopyToast('Не удалось скопировать');
      }
      document.body.removeChild(ta);
    }
  }

  // ── Инъекция кнопок «Копировать» на странице (без правки index.html) ──
  function injectCopyButtons() {
    const clearBtn = document.getElementById('calculator-clear-btn');
    if (clearBtn && !document.getElementById('calculator-copy-btn')) {
      const wrap = document.createElement('div');
      wrap.className = 'calculator-bill-actions';
      clearBtn.parentNode.insertBefore(wrap, clearBtn);
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.id = 'calculator-copy-btn';
      copyBtn.className = 'btn btn-secondary btn-sm';
      copyBtn.innerHTML = '<i data-lucide="copy" class="w-4 h-4"></i> Копировать';
      wrap.appendChild(copyBtn);
      wrap.appendChild(clearBtn);
    }
    if (window.lucide) lucide.createIcons();
  }

  // Desktop calculator drawer is created lazily on first use.
  function buildDrawer() {
  if (drawerBuilt) return;
  const main = document.querySelector('main');
  if (!main) return;

  const drawer = document.createElement('div');
  drawer.id = 'calc-drawer';
  drawer.className = 'calc-drawer';
  drawer.innerHTML =
    '<div class="cd-head">' +
      '<span class="cd-title"><i data-lucide="calculator" aria-hidden="true"></i> Калькулятор</span>' +
      '<button type="button" id="cd-close" class="sheet-close" aria-label="Закрыть"><i data-lucide="x"></i></button>' +
    '</div>' +
    '<div class="cd-body"><div id="cd-grid" class="cd-grid"></div></div>' +
    '<div class="cd-bill">' +
      '<div class="cd-bill-head" id="cd-bill-head">' +
        '<span class="cd-bill-title">Счёт</span>' +
        '<div class="cd-spacer"></div>' +
        '<span class="cd-head-summary" id="cd-head-summary">0 ₽</span>' +
        '<i data-lucide="chevron-down" class="cd-chevron" aria-hidden="true"></i>' +
        '<button type="button" id="cd-clear" class="btn btn-ghost btn-sm"><i data-lucide="trash-2" class="w-4 h-4"></i> Очистить</button>' +
      '</div>' +
      '<div id="cd-bill-list" class="cd-bill-list"></div>' +
      '<div class="cd-bill-foot"><div class="total-row">' +
        '<span class="total-row-label" id="cd-count">0 позиций</span>' +
        '<span class="total-row-value" id="cd-total">0 ₽</span>' +
      '</div></div>' +
    '</div>';
  main.before(drawer);

  document.getElementById('cd-close').addEventListener('click', closeDrawer);
  document.getElementById('cd-clear').addEventListener('click', () => {
    if (Object.keys(cart).length && confirm('Очистить счёт?')) clearBill();
  });
  document.getElementById('cd-grid').addEventListener('click', event => {
    const badge = event.target.closest('.cd-badge');
    if (badge) {
      changeQty(parseInt(badge.dataset.productId, 10), -1);
      return;
    }
    const card = event.target.closest('.cd-product');
    if (card) changeQty(parseInt(card.dataset.productId, 10), 1);
  });
  document.getElementById('cd-bill-list').addEventListener('click', event => {
    const remove = event.target.closest('.bill-row-del');
    if (remove) changeQty(parseInt(remove.dataset.productId, 10), -1);
  });
  drawer.addEventListener('transitionend', event => {
    if (event.propertyName === 'width' || event.propertyName === 'flex-basis') {
      window.dispatchEvent(new Event('resize'));
    }
  });

  const billHeader = drawer.querySelector('#cd-bill-head');
  const billPanel = drawer.querySelector('.cd-bill');
  billHeader?.addEventListener('click', event => {
    if (event.target.closest('#cd-clear')) return;
    billPanel.classList.toggle('collapsed');
  });

  drawerBuilt = true;
  if (window.lucide) lucide.createIcons();
}

function drawerCardHtml(product) {
  const qty = getQty(product.id);
  const emoji = product.emoji || product.name.charAt(0).toUpperCase();
  return '<button type="button" class="cd-product' + (qty > 0 ? ' has-qty' : '') + '" data-product-id="' + product.id + '">' +
    (qty > 0 ? '<span class="cd-badge" data-product-id="' + product.id + '">' + qty + '</span>' : '') +
    '<span class="cd-emoji ' + getColorClass(product.bgColor) + '">' + escapeHtml(emoji) + '</span>' +
    '<span class="cd-name">' + escapeHtml(product.name) + '</span>' +
    '<span class="cd-price">' + formatMoney(parseFloat(product.price)) + '</span>' +
  '</button>';
}

function renderDrawerGrid() {
  const grid = document.getElementById('cd-grid');
  if (!grid) return;
  if (!isLoaded) {
    grid.innerHTML = '<div class="cd-bill-empty">Загрузка…</div>';
    return;
  }
  if (!products.length) {
    grid.innerHTML = '<div class="cd-bill-empty">Нет продуктов</div>';
    return;
  }
  grid.innerHTML = sortedFlatProducts().map(drawerCardHtml).join('');
  if (window.lucide) lucide.createIcons();
}

function updateDrawerCard(productId) {
  const grid = document.getElementById('cd-grid');
  if (!grid) return;
  const card = grid.querySelector('.cd-product[data-product-id="' + productId + '"]');
  if (!card) return;
  const qty = getQty(productId);
  card.classList.toggle('has-qty', qty > 0);
  let badge = card.querySelector('.cd-badge');
  if (qty > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'cd-badge';
      badge.dataset.productId = productId;
      card.insertBefore(badge, card.firstChild);
    }
    badge.textContent = qty;
  } else if (badge) {
    badge.remove();
  }
}

function renderDrawerBill() {
  const list = document.getElementById('cd-bill-list');
  if (!list) return;
  const entries = getBillEntries();
  const totalQty = entries.reduce((sum, entry) => sum + entry.qty, 0);
  const totalSum = entries.reduce((sum, entry) => sum + entry.subtotal, 0);
  const set = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };
  set('cd-count', totalQty === 0
    ? '0 позиций'
    : totalQty + ' ' + pluralize(totalQty, ['позиция', 'позиции', 'позиций']));
  set('cd-total', formatMoney(totalSum));
  set('cd-head-summary', formatMoney(totalSum));
  list.innerHTML = entries.length
    ? entries.map(billRowHtml).join('')
    : '<div class="cd-bill-empty">Счёт пуст</div>';
  const clearButton = document.getElementById('cd-clear');
  if (clearButton) clearButton.disabled = entries.length === 0;
  if (window.lucide) lucide.createIcons();
}

function setCalcNavHighlight(on) {
  var nav = document.querySelector('.nav-item[data-route="calculator"]');
  if (nav) nav.classList.toggle('nav-calc-open', on);
}
function openDrawer() {
  if (window.App && App.historyModule && App.historyModule.closeRoomHistory) {
    App.historyModule.closeRoomHistory();
  }
  if (window.App && App.inventoryModule && App.inventoryModule.closeDrawer) {
    App.inventoryModule.closeDrawer();
  }
  buildDrawer();
  if (!isLoaded && products.length === 0) loadProducts();
  renderDrawerGrid();
  renderDrawerBill();
  var drawer = document.getElementById('calc-drawer');
  if (!drawer) return;
  drawer.classList.add('open');
  drawerOpen = true;
  setCalcNavHighlight(true);
  requestAnimationFrame(function () { window.dispatchEvent(new Event('resize')); });
}
function closeDrawer() {
  var drawer = document.getElementById('calc-drawer');
  if (drawer) drawer.classList.remove('open');
  drawerOpen = false;
  setCalcNavHighlight(false);
}
function interceptDesktopCalculator() {
  document.addEventListener('click', function (e) {
    
    var t = e.target.closest('.nav-item[data-route="calculator"]');
    if (!t) return;
    e.preventDefault();
    e.stopPropagation();
    if (drawerOpen) closeDrawer(); else openDrawer();
  }, true);
}
var lastNonCalcRoute = null;
function guardCalculatorRoute() {
  if (!window.App || !App.events) return;
  App.events.on('route:change', function (route) {
    if (route === 'calculator') {
      openDrawer();
      const previousRoute = lastNonCalcRoute || 'dashboard';
      setTimeout(() => { if (App.router) App.router.go(previousRoute, false); }, 0);
    } else {
      lastNonCalcRoute = route;
    }
  });
}
async function loadProducts() {
  const container = document.getElementById('calculator-products-container');
  try {
    products = await api().getProducts();
    isLoaded = true;
    renderProducts();
    renderBill();
    if (drawerOpen) {
      renderDrawerGrid();
      renderDrawerBill();
    }
  } catch (err) {
    console.error('Ошибка загрузки продуктов:', err);
    if (container) {
      container.innerHTML = '<div class="text-center py-12 text-rose-500 text-sm">Не удалось загрузить продукты</div>';
    }
    const grid = document.getElementById('cd-grid');
    if (drawerOpen && grid) grid.innerHTML = '<div class="cd-bill-empty">Не удалось загрузить продукты</div>';
  }
}

function setupListeners() {
  if (isInitialized) return;
  injectCopyButtons();

  document.getElementById('calculator-tabs')?.addEventListener('click', event => {
    const tab = event.target.closest('.cat-tab');
    if (!tab) return;
    activeCategory = tab.dataset.category;
    renderProducts();
  });

  document.getElementById('calculator-clear-btn')?.addEventListener('click', event => {
    event.stopPropagation();
    if (Object.keys(cart).length && confirm('Очистить счёт?')) clearBill();
  });

  const billPanel = document.querySelector('#view-calculator .side-panel');
  const billHeader = billPanel?.querySelector('.side-panel-header');
  if (billHeader) {
    billHeader.addEventListener('click', event => {
      if (event.target.closest('#calculator-clear-btn, #calculator-copy-btn')) return;
      billPanel.classList.toggle('collapsed');
    });
  }

  document.getElementById('calculator-copy-btn')?.addEventListener('click', copyBill);

  document.addEventListener('click', event => {
    if (!event.target.closest('#view-calculator')) return;
    const inc = event.target.closest('.calc-inc-btn');
    if (inc) {
      changeQty(parseInt(inc.dataset.productId, 10), 1);
      return;
    }
    const dec = event.target.closest('.calc-dec-btn');
    if (dec) changeQty(parseInt(dec.dataset.productId, 10), -1);
  });

  isInitialized = true;
}

function init() {
  setupListeners();
  if (!isLoaded) loadProducts();
  else {
    renderProducts();
    renderBill();
  }
}

// Перехват регистрируем сразу (не дожидаясь init),
  // чтобы работал первый же тап по «Калькулятор»
  function bootIntercepts() {
  interceptDesktopCalculator();
  guardCalculatorRoute();
}
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', bootIntercepts);
} else {
bootIntercepts();
}
return { init, refresh: loadProducts, clearBill, changeQty, copyBill, openDrawer, closeDrawer };
})();
