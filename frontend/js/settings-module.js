// МОДУЛЬ НАСТРОЕК
// ═══════════════════════════════════════════════════════════════
App.settingsModule = (() => {
const api = () => window.api;
const { escapeHtml } = window.AppUtils;
let products = [];
let templates = [];
let activeTab = 'products';
let moduleInitialized = false;
let tabbarTabCreated = false;
const colorMap = {
amber: 'bg-amber-50', red: 'bg-red-50', blue: 'bg-blue-50',
yellow: 'bg-yellow-50', purple: 'bg-purple-50', emerald: 'bg-emerald-50',
rose: 'bg-rose-50', orange: 'bg-orange-50', slate: 'bg-slate-100'
};
const COLORS = ['amber', 'red', 'blue', 'yellow', 'purple', 'emerald', 'rose', 'orange', 'slate'];
function getColorClass(color) { return colorMap[color] || 'bg-slate-100'; }
function getRandomColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }
// ── Вкладка «Нижнее меню» (видна только на телефоне) ──
function ensureTabbarTab() {
if (tabbarTabCreated) return;
if (!window.AppMobileNav) return;
const firstTab = document.querySelector('.settings-tab');
if (!firstTab) return;
const tabsRow = firstTab.parentElement;
const btn = document.createElement('button');
btn.dataset.settingsTab = 'tabbar';
btn.className = 'settings-tab settings-tab-mobile px-4 py-1.5 text-sm rounded-md text-slate-600';
btn.innerHTML = '<i data-lucide="smartphone" class="w-3.5 h-3.5 inline-block mr-1 -mt-0.5"></i>Нижнее меню';
tabsRow.appendChild(btn);
const panel = document.createElement('div');
panel.id = 'settings-tabbar';
panel.className = 'settings-panel hidden';
panel.innerHTML = `
<div class="bg-white rounded-xl border border-slate-100 overflow-hidden">
<div class="p-5 border-b border-slate-100">
<h3 class="font-semibold text-slate-900">Разделы в нижнем меню</h3>
<p class="text-xs text-slate-500 mt-1">Выберите от 1 до 5 разделов — они появятся в нижнем меню на телефоне. Остальные будут доступны в шторке «Ещё». Кнопка «Ещё» закреплена всегда.</p>
</div>
<div id="tabbar-settings-list" class="p-5"></div>
</div>
`;
const templatesPanel = document.getElementById('settings-templates');
templatesPanel.parentNode.insertBefore(panel, templatesPanel.nextSibling);
tabbarTabCreated = true;
if (window.lucide) lucide.createIcons();
}
function renderTabbarSettings() {
const container = document.getElementById('tabbar-settings-list');
if (!container || !window.AppMobileNav) return;
const selected = window.AppMobileNav.getSelected();
const titles = window.AppMobileNav.ROUTE_TITLES;
const icons = window.AppMobileNav.ROUTE_ICONS;
container.innerHTML = `
<div class="space-y-2">
${window.AppMobileNav.ROUTE_ORDER.map(route => {
const checked = selected.includes(route);
return `
<label class="tabbar-setting-row flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${checked ? 'tabbar-setting-checked' : 'border-slate-100 hover:bg-slate-50'}">
<input type="checkbox" class="tabbar-setting-checkbox w-4 h-4 rounded border-slate-300" data-route="${route}" ${checked ? 'checked' : ''} />
<i data-lucide="${icons[route]}" class="w-4 h-4 text-slate-500"></i>
<span class="text-sm font-medium text-slate-900 flex-1">${titles[route]}</span>
</label>
`;
}).join('')}
</div>
<div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
<span class="text-xs text-slate-500">Выбрано: <span id="tabbar-count" class="font-semibold text-slate-700">${selected.length}</span> из ${window.AppMobileNav.MAX_TABS}</span>
<span class="text-xs text-slate-400">«Ещё» — всегда в меню</span>
</div>
`;
if (window.lucide) lucide.createIcons();
}
function handleTabbarChange(checkbox) {
const route = checkbox.dataset.route;
const selected = window.AppMobileNav.getSelected();
if (checkbox.checked) {
if (selected.length >= window.AppMobileNav.MAX_TABS) {
checkbox.checked = false;
alert(`В нижнем меню максимум ${window.AppMobileNav.MAX_TABS} раздела`);
return;
}
if (!selected.includes(route)) selected.push(route);
} else {
if (selected.length <= window.AppMobileNav.MIN_TABS) {
checkbox.checked = true;
alert('Должен остаться хотя бы 1 раздел в нижнем меню');
return;
}
const idx = selected.indexOf(route);
if (idx !== -1) selected.splice(idx, 1);
}
window.AppMobileNav.setSelected(selected);
renderTabbarSettings();
}
function switchTab(tab) {
activeTab = tab;
document.querySelectorAll('.settings-tab').forEach(b => {
const isActive = b.dataset.settingsTab === tab;
b.classList.toggle('bg-white', isActive);
b.classList.toggle('shadow-sm', isActive);
b.classList.toggle('font-medium', isActive);
b.classList.toggle('text-slate-600', !isActive);
});
document.getElementById('settings-products')?.classList.toggle('hidden', tab !== 'products');
document.getElementById('settings-templates')?.classList.toggle('hidden', tab !== 'templates');
document.getElementById('settings-tabbar')?.classList.toggle('hidden', tab !== 'tabbar');
if (tab === 'tabbar') renderTabbarSettings();
}
async function loadProducts() {
try {
products = await api().getProducts();
renderProductsList();
} catch (err) {
console.error('Ошибка загрузки продуктов:', err);
const container = document.getElementById('products-table-container');
if (container) container.innerHTML = '<div class="text-center py-12 text-rose-500 text-sm">Ошибка загрузки</div>';
}
}
// ── Список продуктов: карточки с перетаскиванием (вместо таблицы) ──
function renderProductsList() {
const container = document.getElementById('products-table-container');
if (!container) return;
if (products.length === 0) {
container.innerHTML = '<div class="text-center py-12 text-slate-400 text-sm">Нет продуктов</div>';
return;
}
container.innerHTML = `<div class="prod-list">${products.map(p => {
const emoji = p.emoji || p.name.charAt(0).toUpperCase();
const safeName = String(p.name).replace(/"/g, '&quot;');
return `
<div class="prod-row" data-product-id="${p.id}">
<div class="drag-handle" title="Перетащить"><i data-lucide="grip-vertical" class="w-4 h-4 pointer-events-none"></i></div>
<div class="prod-row-main">
<div class="prod-row-emoji ${getColorClass(p.bgColor)}">${emoji}</div>
<div class="prod-row-info">
<div class="prod-row-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</div>
<div class="prod-row-meta">${p.volume || '—'} ${p.unit || 'шт'} · ${parseFloat(p.price).toLocaleString('ru-RU')} ₽</div>
</div>
</div>
<span class="prod-row-expiry ${p.hasExpiry ? 'on' : 'off'}">${p.hasExpiry ? 'Срок' : 'Без срока'}</span>
<div class="prod-row-actions">
<button class="btn btn-ghost edit-product-btn" data-id="${p.id}" title="Редактировать">
<i data-lucide="pencil" class="w-4 h-4"></i>
</button>
<button class="btn btn-ghost delete-product-btn" data-id="${p.id}" data-name="${safeName}" title="Удалить" style="color: var(--danger);">
<i data-lucide="trash-2" class="w-4 h-4"></i>
</button>
</div>
</div>`;
}).join('')}</div>`;
if (window.lucide) lucide.createIcons();
const listEl = container.querySelector('.prod-list');
initListDrag(listEl, {
itemSel: '.prod-row',
handleSel: '.drag-handle',
getId: el => el.dataset.productId,
onReorder: (ids) => {
const map = new Map(products.map(p => [String(p.id), p]));
products = ids.map(id => map.get(String(id))).filter(Boolean);
if (window.api && api().reorderProducts) {
api().reorderProducts(ids).catch(err => console.error('reorderProducts error', err));
}
}
});
}
function openProductModal(product = null) {
const title = document.getElementById('product-modal-title');
if (!title) return;
title.textContent = product ? 'Редактировать продукт' : 'Новый продукт';
document.getElementById('product-id').value = product ? product.id : '';
document.getElementById('product-name').value = product ? product.name : '';
document.getElementById('product-price').value = product ? product.price : '';
document.getElementById('product-volume').value = product ? product.volume : '';
document.getElementById('product-unit').value = product ? (product.unit || 'шт') : 'шт';
document.getElementById('product-category').value = product ? (product.category || 'Напитки') : 'Напитки';
document.getElementById('product-emoji').value = product ? (product.emoji || '') : '';
document.getElementById('product-has-expiry').checked = product ? product.hasExpiry : true;
const bgColor = product ? (product.bgColor || 'slate') : getRandomColor();
document.getElementById('product-bg-color').value = bgColor;
document.querySelectorAll('.color-option').forEach(btn => {
if (btn.dataset.color === bgColor) {
btn.classList.add('border-slate-900', 'ring-2', 'ring-slate-900/20');
} else {
btn.classList.remove('border-slate-900', 'ring-2', 'ring-slate-900/20');
}
});
const backdrop = document.getElementById('product-modal-backdrop');
const sheet = backdrop?.querySelector(':scope > div');
if (!backdrop) return;
backdrop.classList.remove('hidden');
sheet?.classList.remove('modal-sheet-closing');
requestAnimationFrame(() => {
requestAnimationFrame(() => {
backdrop.classList.add('show');
sheet?.classList.add('open');
});
});
setTimeout(updatePreview, 50);
if (window.lucide) lucide.createIcons();
}
function closeProductModal() {
const backdrop = document.getElementById('product-modal-backdrop');
const sheet = backdrop?.querySelector(':scope > div');
if (!backdrop) return;
backdrop.classList.remove('show');
sheet?.classList.remove('open');
sheet?.classList.add('modal-sheet-closing');
setTimeout(() => {
backdrop.classList.add('hidden');
sheet?.classList.remove('modal-sheet-closing');
}, 280);
}
function updatePreview() {
const name = document.getElementById('product-name')?.value || '';
const volume = document.getElementById('product-volume')?.value || '0';
const unit = document.getElementById('product-unit')?.value || 'шт';
const price = document.getElementById('product-price')?.value || '0';
const emoji = document.getElementById('product-emoji')?.value;
const bgColor = document.getElementById('product-bg-color')?.value || 'slate';
const displayEmoji = emoji || (name ? name.charAt(0).toUpperCase() : '📦');
const displayName = name ? (name.charAt(0).toUpperCase() + name.slice(1)) : 'Название продукта';
const previewIcon = document.getElementById('preview-icon');
const previewName = document.getElementById('preview-name');
const previewDetails = document.getElementById('preview-details');
if (previewIcon) {
previewIcon.className = `w-12 h-12 rounded-lg ${getColorClass(bgColor)} flex items-center justify-center text-2xl`;
previewIcon.textContent = displayEmoji;
}
if (previewName) previewName.textContent = displayName;
if (previewDetails) previewDetails.textContent = `${volume} ${unit} · ${parseFloat(price || 0).toLocaleString('ru-RU')} ₽`;
}
async function handleProductSubmit(e) {
e.preventDefault();
const id = document.getElementById('product-id').value;
const name = document.getElementById('product-name').value.trim();
const price = document.getElementById('product-price').value;
const volume = document.getElementById('product-volume').value;
if (!name || price === '' || volume === '') {
alert('Заполните обязательные поля');
return;
}
const data = {
name,
price: parseFloat(price),
volume: parseFloat(volume),
unit: document.getElementById('product-unit').value,
category: document.getElementById('product-category').value,
emoji: document.getElementById('product-emoji').value || null,
bgColor: document.getElementById('product-bg-color').value || 'slate',
hasExpiry: document.getElementById('product-has-expiry').checked
};
try {
let savedProduct;
if (id) {
savedProduct = await api().updateProduct(parseInt(id), data);
const idx = products.findIndex(p => p.id === parseInt(id));
if (idx !== -1) products[idx] = savedProduct;
} else {
savedProduct = await api().createProduct(data);
products.push(savedProduct);
}
closeProductModal();
renderProductsList();
await loadTemplates();
} catch (err) {
alert('Ошибка сохранения: ' + err.message);
}
}
async function deleteProduct(id, name) {
if (!confirm(`Удалить продукт "${name}"?`)) return;
try {
await api().deleteProduct(id);
await loadProducts();
} catch (err) {
alert(err.message);
}
}
async function loadTemplates() {
try {
templates = await api().getTemplates();
if (!products.length) await loadProducts();
renderTemplates();
} catch (err) {
console.error('Ошибка загрузки шаблонов:', err);
}
}
function renderTemplates() {
['standard', 'lux'].forEach(cat => {
const container = document.querySelector(`.template-items-container[data-category="${cat}"]`);
if (!container) return;
const template = templates.find(t => t.category === cat);
if (!template) {
container.innerHTML = '<div class="text-center py-8 text-slate-400 text-sm">Шаблон не найден</div>';
return;
}
const items = template.items || [];
const categories = ['Дверца', 'Напитки', 'Алкоголь', 'Соки'];
const grouped = {};
categories.forEach(c => grouped[c] = []);
items.forEach(item => {
const freshProduct = products.find(p => p.id === item.productId);
const itemCat = (freshProduct?.category) || item.product.category || 'Напитки';
if (freshProduct) item.product = { ...item.product, ...freshProduct };
if (!grouped[itemCat]) grouped[itemCat] = [];
grouped[itemCat].push(item);
});
container.innerHTML = `
<div class="space-y-4 template-items-list" data-template-id="${template.id}">
${categories.map(category => {
const catItems = grouped[category] || [];
if (catItems.length === 0) return '';
return `
<div class="template-category" data-category-name="${category}">
<div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">${category}</div>
<div class="space-y-2 sortable-list" data-category="${category}">
${catItems.map(item => `
<div class="template-item flex items-center gap-2 p-2 bg-slate-50 rounded-lg" data-product-id="${item.productId}" data-sort-order="${item.sortOrder}">
<div class="drag-handle text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing">
<i data-lucide="grip-vertical" class="w-4 h-4 pointer-events-none"></i>
</div>
<div class="flex items-center gap-2 flex-1 min-w-0">
<div class="w-7 h-7 rounded-md flex items-center justify-center text-base ${getColorClass(item.product.bgColor)}">${item.product.emoji || item.product.name.charAt(0).toUpperCase()}</div>
<span class="text-sm font-medium text-slate-900 truncate">${item.product.name}</span>
</div>
<div class="text-xs text-slate-500">${item.product.volume || ''} ${item.product.unit || 'шт'}</div>
<input type="number" min="0" value="${item.qty}" class="qty-input w-16 text-center border border-slate-200 rounded-md px-2 py-1 text-sm" data-product-id="${item.productId}" />
<button class="remove-item-btn w-7 h-7 rounded-md hover:bg-rose-50 flex items-center justify-center text-rose-500" data-product-id="${item.productId}"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
</div>
`).join('')}
</div>
</div>
`;
}).join('')}
</div>
<div class="mt-3 pt-3 border-t border-slate-100">
<select class="add-product-select w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white mb-2">
<option value="">+ Добавить продукт...</option>
${products.filter(p => !items.some(i => i.productId === p.id)).map(p => `<option value="${p.id}">${p.emoji || p.name.charAt(0).toUpperCase()} ${p.name} ${p.volume || ''} ${p.unit || 'шт'} (${p.category || 'Напитки'})</option>`).join('')}
</select>
<button class="save-template-btn btn btn-primary w-full justify-center"><i data-lucide="save" class="w-4 h-4"></i> Сохранить шаблон</button>
</div>`;
if (window.lucide) lucide.createIcons();
container.querySelectorAll('.sortable-list').forEach(sl => {
initListDrag(sl, {
itemSel: '.template-item',
handleSel: '.drag-handle',
getId: el => el.dataset.productId,
onReorder: () => saveTemplate(sl.dataset.category)
});
});
});
}
// ── Универсальный drag-and-drop списков (pointer events, визуал как в мобильном навбаре) ──
// Хват только за .drag-handle (работает и мышью, и пальцем благодаря touch-action:none).
// Перетаскиваемый элемент «всплывает» (тень + scale), соседи плавно расступаются.
function initListDrag(listEl, opts) {
if (!listEl || listEl.dataset.dragInit) return;
listEl.dataset.dragInit = '1';
const itemSel = opts.itemSel;
const handleSel = opts.handleSel;
let drag = null;
const items = () => Array.from(listEl.querySelectorAll(itemSel));
listEl.addEventListener('pointerdown', (e) => {
if (e.button && e.button !== 0) return;
const handle = e.target.closest(handleSel);
if (!handle) return;
const item = handle.closest(itemSel);
if (!item || !listEl.contains(item)) return;
e.preventDefault();
const all = items();
const index = all.indexOf(item);
if (index < 0) return;
const listRect = listEl.getBoundingClientRect();
const meta = all.map(el => {
const r = el.getBoundingClientRect();
return { el, top: r.top - listRect.top, height: r.height };
});
const slot = (index < all.length - 1)
? (meta[index + 1].top - meta[index].top)
: (meta[index].height + 8);
listEl.classList.add('is-dragging-list');
item.classList.add('is-drag-source');
drag = { index, target: index, startY: e.clientY, meta, slot, moved: false };
applyTransforms(0);
window.addEventListener('pointermove', onMove);
window.addEventListener('pointerup', onUp);
window.addEventListener('pointercancel', onUp);
});
function applyTransforms(dy) {
const { index, target, meta, slot } = drag;
meta.forEach((m, i) => {
if (i === index) {
m.el.style.transform = `translateY(${dy}px) scale(1.02)`;
} else if (index < target && i > index && i <= target) {
m.el.style.transform = `translateY(${-slot}px)`;
} else if (target < index && i >= target && i < index) {
m.el.style.transform = `translateY(${slot}px)`;
} else {
m.el.style.transform = '';
}
});
}
function onMove(e) {
if (!drag) return;
e.preventDefault();
const dy = e.clientY - drag.startY;
const curCenter = drag.meta[drag.index].top + dy + drag.meta[drag.index].height / 2;
let target = 0;
for (let i = 0; i < drag.meta.length; i++) {
if (i === drag.index) continue;
const c = drag.meta[i].top + drag.meta[i].height / 2;
if (c < curCenter) target++;
}
target = Math.max(0, Math.min(drag.meta.length - 1, target));
if (target !== drag.index) drag.moved = true;
drag.target = target;
applyTransforms(dy);
}
function onUp() {
if (!drag) return;
window.removeEventListener('pointermove', onMove);
window.removeEventListener('pointerup', onUp);
window.removeEventListener('pointercancel', onUp);
const { index, target, meta, slot, moved } = drag;
meta.forEach((m, i) => {
m.el.style.transition = 'transform .2s cubic-bezier(.32,.72,.24,1)';
if (i === index) {
m.el.style.transform = moved ? `translateY(${(target - index) * slot}px) scale(1.02)` : '';
} else {
m.el.style.transform = '';
}
});
const d = drag;
drag = null;
setTimeout(() => {
const all = items();
const srcEl = d.meta[index].el;
if (moved && all[d.target]) {
if (target_gt_index(d, index)) {
all[d.target].parentNode.insertBefore(srcEl, all[d.target].nextSibling);
} else {
all[d.target].parentNode.insertBefore(srcEl, all[d.target]);
}
}
listEl.classList.remove('is-dragging-list');
srcEl.classList.remove('is-drag-source');
items().forEach(el => { el.style.transform = ''; el.style.transition = ''; });
if (moved && typeof opts.onReorder === 'function') {
const ids = items().map(el => opts.getId(el)).filter(Boolean);
opts.onReorder(ids);
}
}, 200);
}
function target_gt_index(d, index) { return d.target > index; }
}
function getTemplateState(category) {
const container = document.querySelector(`.template-items-container[data-category="${category}"]`);
if (!container) return { templateId: null, items: [] };
const list = container.querySelector('.template-items-list');
const templateId = list?.dataset.templateId;
const items = [];
let sortOrder = 0;
container.querySelectorAll('.template-item').forEach(el => {
const productId = el.dataset.productId;
const qty = parseInt(el.querySelector('.qty-input').value) || 0;
if (qty > 0) items.push({ productId, qty, sortOrder: sortOrder++ });
});
return { templateId, items };
}
async function saveTemplate(category) {
const { templateId, items } = getTemplateState(category);
if (!templateId) return;
try {
await api().updateTemplateItems(templateId, items);
await loadTemplates();
} catch (err) {
alert('Ошибка сохранения: ' + err.message);
}
}
function setupGlobalListeners() {
document.addEventListener('click', (e) => {
if (e.target.closest('#add-product-btn')) { e.preventDefault(); openProductModal(); return; }
const editBtn = e.target.closest('.edit-product-btn');
if (editBtn) {
const id = parseInt(editBtn.dataset.id);
const product = products.find(p => p.id === id);
if (product) openProductModal(product);
return;
}
const delBtn = e.target.closest('.delete-product-btn');
if (delBtn) { deleteProduct(parseInt(delBtn.dataset.id), delBtn.dataset.name); return; }
const tabBtn = e.target.closest('.settings-tab');
if (tabBtn) { switchTab(tabBtn.dataset.settingsTab); return; }
const colorBtn = e.target.closest('.color-option');
if (colorBtn) {
document.querySelectorAll('.color-option').forEach(btn => {
btn.classList.remove('border-slate-900', 'ring-2', 'ring-slate-900/20');
});
colorBtn.classList.add('border-slate-900', 'ring-2', 'ring-slate-900/20');
document.getElementById('product-bg-color').value = colorBtn.dataset.color;
updatePreview();
return;
}
const incBtn = e.target.closest('.qty-inc-btn');
if (incBtn) {
const cont = incBtn.closest('.template-items-container');
const input = cont.querySelector(`.qty-input[data-product-id="${incBtn.dataset.productId}"]`);
if (input) input.value = parseInt(input.value) + 1;
return;
}
const decBtn = e.target.closest('.qty-dec-btn');
if (decBtn) {
const cont = decBtn.closest('.template-items-container');
const input = cont.querySelector(`.qty-input[data-product-id="${decBtn.dataset.productId}"]`);
if (input) { const v = parseInt(input.value); if (v > 0) input.value = v - 1; }
return;
}
const removeBtn = e.target.closest('.remove-item-btn');
if (removeBtn) { removeBtn.closest('.template-item')?.remove(); return; }
const saveBtn = e.target.closest('.save-template-btn');
if (saveBtn) {
const category = saveBtn.closest('.template-items-container').dataset.category;
saveTemplate(category);
return;
}
});
document.addEventListener('input', (e) => {
if (['product-name', 'product-volume', 'product-unit', 'product-price', 'product-emoji'].includes(e.target.id)) {
updatePreview();
}
});
document.addEventListener('change', (e) => {
if (e.target.classList.contains('tabbar-setting-checkbox')) {
handleTabbarChange(e.target);
return;
}
if (e.target.id === 'product-unit') updatePreview();
if (e.target.classList.contains('add-product-select') && e.target.value) {
const productId = parseInt(e.target.value);
const product = products.find(p => p.id === productId);
if (!product) return;
const list = e.target.closest('.template-items-container').querySelector('.template-items-list');
const item = document.createElement('div');
item.className = 'flex items-center gap-2 p-2 bg-slate-50 rounded-lg template-item';
item.dataset.productId = productId;
item.innerHTML = `
<div class="drag-handle text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing">
<i data-lucide="grip-vertical" class="w-4 h-4 pointer-events-none"></i>
</div>
<div class="flex items-center gap-2 flex-1 min-w-0">
<div class="w-7 h-7 rounded-md flex items-center justify-center text-base ${getColorClass(product.bgColor)}">${product.emoji || product.name.charAt(0).toUpperCase()}</div>
<span class="text-sm font-medium text-slate-900 truncate">${escapeHtml(product.name)}</span>
</div>
<div class="text-xs text-slate-500">${product.volume || ''} ${product.unit || 'шт'}</div>
<div class="flex items-center gap-1">
<button class="qty-dec-btn w-7 h-7 rounded-md bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center" data-product-id="${productId}"><i data-lucide="minus" class="w-3 h-3"></i></button>
<input type="number" min="0" value="1" class="qty-input w-14 text-center border border-slate-200 rounded-md px-2 py-1 text-sm" data-product-id="${productId}" />
<button class="qty-inc-btn w-7 h-7 rounded-md bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center" data-product-id="${productId}"><i data-lucide="plus" class="w-3 h-3"></i></button>
</div>
<button class="remove-item-btn w-7 h-7 rounded-md hover:bg-rose-50 flex items-center justify-center text-rose-500" data-product-id="${productId}"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
`;
list.appendChild(item);
e.target.value = '';
if (window.lucide) lucide.createIcons();
}
});
document.addEventListener('submit', (e) => {
if (e.target.id === 'product-form') { e.preventDefault(); handleProductSubmit(e); }
});
document.addEventListener('click', (e) => {
if (e.target.id === 'product-modal-backdrop') closeProductModal();
});
}
function init() {
if (!moduleInitialized) {
setupGlobalListeners();
moduleInitialized = true;
}
ensureTabbarTab();
loadProducts();
loadTemplates();
}
return { init, closeProductModal };
})();