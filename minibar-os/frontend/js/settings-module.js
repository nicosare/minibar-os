// МОДУЛЬ НАСТРОЕК
// ═══════════════════════════════════════════════════════════════
App.settingsModule = (() => {
  const api = () => window.api;
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

    // Кнопка вкладки
    const btn = document.createElement('button');
    btn.dataset.settingsTab = 'tabbar';
    btn.className = 'settings-tab settings-tab-mobile px-4 py-1.5 text-sm rounded-md text-slate-600';
    btn.innerHTML = '<i data-lucide="smartphone" class="w-3.5 h-3.5 inline-block mr-1 -mt-0.5"></i>Нижнее меню';
    tabsRow.appendChild(btn);

    // Панель
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
      renderProductsTable();
    } catch (err) {
      console.error('Ошибка загрузки продуктов:', err);
      const container = document.getElementById('products-table-container');
      if (container) container.innerHTML = '<div class="text-center py-12 text-rose-500 text-sm">Ошибка загрузки</div>';
    }
  }

  function renderProductsTable() {
    const container = document.getElementById('products-table-container');
    if (!container) return;
    if (products.length === 0) {
      container.innerHTML = '<div class="text-center py-12 text-slate-400 text-sm">Нет продуктов</div>';
      return;
    }
    container.innerHTML = `
      <table class="w-full">
        <thead class="bg-slate-50">
          <tr>
            <th class="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-2">Продукт</th>
            <th class="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-2">Объём</th>
            <th class="text-right text-xs font-semibold text-slate-500 uppercase px-4 py-2">Цена</th>
            <th class="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-2">Срок</th>
            <th class="text-right text-xs font-semibold text-slate-500 uppercase px-4 py-2">Действия</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${products.map(p => `
            <tr class="hover:bg-slate-50">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-lg ${getColorClass(p.bgColor)} flex items-center justify-center text-xl">${p.emoji || p.name.charAt(0).toUpperCase()}</div>
                  <span class="text-sm font-medium text-slate-900">${p.name}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-slate-600">${p.volume || '—'} ${p.unit || 'шт'}</td>
              <td class="px-4 py-3 text-sm text-right">${parseFloat(p.price).toLocaleString('ru-RU')} ₽</td>
              <td class="px-4 py-3 text-center">
                ${p.hasExpiry ? '<span class="badge badge-success">Да</span>' : '<span class="badge badge-muted">Нет</span>'}
              </td>
              <td class="px-4 py-3 text-right">
                <button class="btn btn-ghost edit-product-btn" data-id="${p.id}" title="Редактировать">
                  <i data-lucide="pencil" class="w-4 h-4"></i>
                </button>
                <button class="btn btn-ghost delete-product-btn" data-id="${p.id}" data-name="${p.name.replace(/"/g, '&quot;')}" title="Удалить" style="color: var(--danger);">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
    if (window.lucide) lucide.createIcons();
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
      renderProductsTable();
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
                    <div class="template-item flex items-center gap-2 p-2 bg-slate-50 rounded-lg" draggable="true" data-product-id="${item.productId}" data-sort-order="${item.sortOrder}">
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
      initDragAndDrop(container);
    });
  }

  function initDragAndDrop(container) {
    let draggedItem = null;
    let isDraggingFromHandle = false;
    container.addEventListener('mousedown', (e) => {
      const handle = e.target.closest('.drag-handle');
      const item = e.target.closest('.template-item');
      isDraggingFromHandle = !!(handle && item);
    });
    container.addEventListener('dragstart', (e) => {
      const item = e.target.closest('.template-item');
      if (!item) return;
      if (!isDraggingFromHandle) { e.preventDefault(); return; }
      draggedItem = item;
      const category = item.closest('.sortable-list')?.dataset.category;
      item.dataset.dragCategory = category;
      setTimeout(() => item.classList.add('dragging'), 0);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.dataset.productId);
    });
    container.addEventListener('dragover', (e) => {
      if (!draggedItem) return;
      e.preventDefault();
      const targetItem = e.target.closest('.template-item');
      if (!targetItem || targetItem === draggedItem) return;
      const targetCategory = targetItem.closest('.sortable-list')?.dataset.category;
      const draggedCategory = draggedItem.dataset.dragCategory;
      if (targetCategory !== draggedCategory) { e.dataTransfer.dropEffect = 'none'; return; }
      e.dataTransfer.dropEffect = 'move';
      const rect = targetItem.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const parentList = targetItem.closest('.sortable-list');
      parentList.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
        el.classList.remove('drag-over-top', 'drag-over-bottom');
      });
      if (e.clientY < midpoint) targetItem.classList.add('drag-over-top');
      else targetItem.classList.add('drag-over-bottom');
    });
    container.addEventListener('dragleave', (e) => {
      const targetItem = e.target.closest('.template-item');
      if (targetItem) targetItem.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    container.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!draggedItem) return;
      const targetItem = e.target.closest('.template-item');
      if (!targetItem || targetItem === draggedItem) return;
      const targetCategory = targetItem.closest('.sortable-list')?.dataset.category;
      const draggedCategory = draggedItem.dataset.dragCategory;
      if (targetCategory !== draggedCategory) return;
      const parent = targetItem.closest('.sortable-list');
      if (targetItem.classList.contains('drag-over-top')) parent.insertBefore(draggedItem, targetItem);
      else if (targetItem.classList.contains('drag-over-bottom')) parent.insertBefore(draggedItem, targetItem.nextSibling);
      parent.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
        el.classList.remove('drag-over-top', 'drag-over-bottom');
      });
    });
    container.addEventListener('dragend', (e) => {
      const item = e.target.closest('.template-item');
      if (item) { item.classList.remove('dragging'); delete item.dataset.dragCategory; }
      container.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
        el.classList.remove('drag-over-top', 'drag-over-bottom');
      });
      draggedItem = null;
      isDraggingFromHandle = false;
    });
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
      alert('Шаблон сохранён');
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
      // Чекбоксы «Нижнее меню»
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
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <div class="w-7 h-7 rounded-md flex items-center justify-center text-base ${getColorClass(product.bgColor)}">${product.emoji || product.name.charAt(0).toUpperCase()}</div>
            <span class="text-sm font-medium text-slate-900 truncate">${product.name}</span>
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
