const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const product = {
  id: 1,
  name: 'Вода',
  price: 150,
  category: 'Напитки',
  volume: 0.5,
  unit: 'л',
  emoji: '💧',
  bgColor: 'blue',
  hasExpiry: true
};

const rooms = [{
  id: 101,
  number: 500,
  floor: 5,
  category: 'standard',
  expiryStatus: 'neutral',
  template: { items: [{ qty: 5, productId: product.id, product: { ...product, name: 'Минеральная вода газированная 0,5 литра' } }] }
}];

const makeGihDraft = id => ({
  id,
  roomId: 101,
  type: 'gih',
  status: 'draft',
  checkDate: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  gihRoomStatus: null,
  notes: null,
  room: { number: 500 },
  gihItems: [{
    id: id * 10 + 1,
    productId: product.id,
    itemStatus: 'pending',
    productName: product.name,
    productPrice: product.price,
    productVolume: product.volume,
    productUnit: product.unit,
    productEmoji: product.emoji,
    productBgColor: product.bgColor,
    productCategory: product.category,
    product
  }]
});
let gihChecks = [makeGihDraft(701), makeGihDraft(702)];
const makeGihHistoryRecord = (id, statuses, names, mode = null) => ({
  id,
  roomId: 101,
  type: 'gih',
  status: 'done',
  checkDate: new Date(Date.now() - id * 1000).toISOString(),
  createdAt: new Date(Date.now() - id * 1000).toISOString(),
  gihRoomStatus: mode,
  notes: null,
  room: { number: 500 },
  gihItems: statuses.map((itemStatus, index) => {
    const itemProduct = { ...product, id: id * 100 + index, name: names[index] };
    return {
      id: id * 1000 + index,
      productId: itemProduct.id,
      itemStatus,
      productName: itemProduct.name,
      productPrice: itemProduct.price,
      productVolume: itemProduct.volume,
      productUnit: itemProduct.unit,
      productEmoji: itemProduct.emoji,
      productBgColor: itemProduct.bgColor,
      productCategory: itemProduct.category,
      product: itemProduct
    };
  })
});
const gihHistoryRecords = [
  makeGihHistoryRecord(601, ['replenished', 'in_place', 'out'], ['Кола', 'Пеппер', 'Боржоми']),
  makeGihHistoryRecord(602, ['replenished', 'not_replenished', 'out'], ['Вода', 'Сок', 'Тоник']),
  makeGihHistoryRecord(603, ['not_replenished', 'out', 'in_place'], ['Кола', 'Пеппер', 'Боржоми'])
];
const roomHistoryRecords = [
  makeGihHistoryRecord(1, ['replenished', 'in_place', 'out'], ['Кола', 'Пеппер', 'Боржоми']),
  makeGihHistoryRecord(2, ['out', 'out'], ['Кола', 'Вода'], 'all_out'),
  {
    id: 3,
    roomId: 101,
    type: 'emptied',
    status: 'done',
    checkDate: new Date(Date.now() - 3000).toISOString(),
    createdAt: new Date(Date.now() - 3000).toISOString(),
    room: { number: 500 },
    notes: null,
    gihItems: []
  }
];
const monthProducts = [{ ...product, monthChecks: [] }];
const stats = {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth() + 1,
  current: [],
  previous: []
};
const targets = {
  today: { target: 1, processed: 0, percentage: 0 },
  tomorrow: { target: 1, daysLeft: 10 },
  summary: { badCount: 0, totalRooms: 1, goodCount: 0 }
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrors = [];
  const apiCalls = [];
  let savedPeriodPayload = null;
  const savedGihPayloads = [];
  const savedGihCreates = [];
  let designSystemResponse = null;

  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('response', response => {
    if (new URL(response.url()).pathname.endsWith('/design-system.css')) {
      designSystemResponse = {
        status: response.status(),
        contentType: response.headers()['content-type'] || ''
      };
    }
  });

  await page.route('**/minibar-os/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/minibar-os\/api/, '') || '/';
    const method = request.method();
    apiCalls.push({ path, method });

    if (path === '/events') {
      await route.abort();
      return;
    }

    let body = {};
    if (path === '/products' && method === 'GET') {
      body = [product];
    } else if (path === '/rooms' && method === 'GET') {
      body = rooms;
    } else if (/^\/rooms\/\d+\/product-statuses$/.test(path) && method === 'GET') {
      body = [];
    } else if (/^\/rooms\/\d+\/product-statuses$/.test(path)) {
      body = { success: true };
    } else if (path === '/deadlines/targets') {
      body = targets;
    } else if (path === '/deadlines/stats') {
      body = stats;
    } else if (path === '/deadlines/month-products/manage' && method === 'GET') {
      body = monthProducts;
    } else if (path === '/deadlines/month-products' && method === 'GET') {
      body = [];
    } else if (/^\/deadlines\/month-products\/\d+$/.test(path) && method === 'PUT') {
      savedPeriodPayload = request.postDataJSON();
      body = { success: true };
    } else if (path === '/deadlines/replacement-summary') {
      body = { items: [], totalQty: 0 };
    } else if (path === '/checks/history') {
      const operation = url.searchParams.get('operation');
      if (operation === 'daily') {
        body = {
          items: [{
            id: 51,
            roomId: 101,
            type: 'check',
            status: 'done',
            checkDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            room: { number: 500 },
            notes: 'Тестовая запись'
          }],
          total: 1
        };
      } else if (operation === 'room') {
        body = { items: roomHistoryRecords, total: roomHistoryRecords.length };
      } else if (operation === 'gih') {
        body = { items: gihHistoryRecords, total: gihHistoryRecords.length };
      } else {
        body = { items: [], total: 0 };
      }
    } else if (path === '/checks' && method === 'POST') {
      const payload = request.postDataJSON();
      savedGihCreates.push(payload);
      body = { id: 703, ...payload, createdAt: new Date().toISOString(), checkDate: new Date().toISOString(), room: { number: 500 } };
    } else if (path === '/checks' && method === 'GET' && url.searchParams.get('type') === 'gih') {
      body = gihChecks;
    } else if (/^\/checks\/\d+$/.test(path) && method === 'PUT') {
      const id = Number(path.split('/').pop());
      const payload = request.postDataJSON();
      savedGihPayloads.push({ id, payload });
      const itemUpdates = new Map((payload.pills || []).map(item => [Number(item.id), item.itemStatus]));
      gihChecks = gihChecks.map(check => check.id === id ? {
        ...check,
        status: payload.status === undefined ? check.status : payload.status,
        gihRoomStatus: payload.gihRoomStatus === undefined ? check.gihRoomStatus : payload.gihRoomStatus,
        notes: payload.notes === undefined ? check.notes : payload.notes,
        checkDate: payload.status === 'done' ? new Date().toISOString() : check.checkDate,
        gihItems: check.gihItems.map(item => itemUpdates.has(item.id)
          ? { ...item, itemStatus: itemUpdates.get(item.id) }
          : item)
      } : check);
      body = gihChecks.find(check => check.id === id) || { success: true };
    } else if (path === '/checks') {
      body = [];
    } else if (path === '/excises' || path === '/lists' || path === '/templates') {
      body = [];
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify(body)
    });
  });

  try {
    await page.goto('http://127.0.0.1:8080/', { waitUntil: 'domcontentloaded' });
    await page.locator('.sidebar').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForFunction(() => Boolean(window.App && window.api), null, { timeout: 10000 });

    assert.ok(designSystemResponse, 'design-system.css must be requested by the browser');
    assert.equal(designSystemResponse.status, 200, 'design-system.css must be served successfully');
    assert.match(designSystemResponse.contentType, /text\/css/i, 'design-system.css must be served as CSS');
    assert.ok(parseFloat(await page.locator('.sidebar').evaluate(el => getComputedStyle(el).width)) > 200,
      'expanded desktop sidebar should have a usable width');

    const sidebar = page.locator('.sidebar');
    const sidebarToggle = page.locator('[data-sidebar-toggle]');
    const sidebarArrow = page.locator('.sidebar-brand-toggle-icon');
    await sidebarToggle.hover();
    await page.waitForTimeout(280);
    const expandedArrowMatrix = await sidebarArrow.evaluate(el => getComputedStyle(el).transform);
    await sidebarToggle.click();
    await page.waitForTimeout(300);
    assert.ok(parseFloat(await sidebar.evaluate(el => getComputedStyle(el).width)) < 100,
      'collapsed sidebar should animate to its narrow width');
    const collapsedArrowMatrix = await sidebarArrow.evaluate(el => getComputedStyle(el).transform);
    assert.notEqual(collapsedArrowMatrix, expandedArrowMatrix,
      'sidebar expansion arrow should rotate when collapsed');
    await sidebarToggle.click();
    await page.waitForTimeout(300);
    assert.ok(parseFloat(await sidebar.evaluate(el => getComputedStyle(el).width)) > 200,
      'sidebar should expand smoothly back to its full width');

    console.log('PASS: desktop shell, design-system.css and sidebar motion load correctly');

    await page.locator('.nav-item[data-route="calculator"]').click();
    const calcDrawer = page.locator('#calc-drawer');
    await calcDrawer.waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await calcDrawer.getAttribute('aria-hidden'), 'false', 'calculator drawer should open');
    assert.equal(
      await page.locator('#cd-close').evaluate(el => Math.round(el.getBoundingClientRect().width)),
      36,
      'calculator close control should use the shared 36px size'
    );
    const calcProduct = page.locator('#cd-grid .cd-product[data-product-id="1"]');
    await calcProduct.waitFor({ state: 'visible', timeout: 10000 });
    await calcProduct.click();
    await page.locator('#cd-grid .cd-badge').waitFor({ state: 'visible', timeout: 3000 });
    assert.match(await page.locator('#cd-count').innerText(), /1 позици/);
    assert.match(await page.locator('#cd-total').innerText(), /150/);
    const calcMotion = await calcDrawer.evaluate(el => ({
      properties: getComputedStyle(el).transitionProperty.split(',').map(value => value.trim()),
      duration: getComputedStyle(el).transitionDuration
    }));
    assert.ok(calcMotion.properties.includes('min-width'),
      'drawer min-width must transition with width and flex-basis');
    assert.match(calcMotion.duration, /0\.2[5-9]s|0\.3s/,
      'drawer should use a non-zero, smooth transition duration');
    await page.locator('.nav-item[data-route="deadlines"]').click();
    await page.waitForFunction(() => document.getElementById('view-deadlines')?.classList.contains('active'));
    assert.equal(await calcDrawer.getAttribute('aria-hidden'), 'false',
      'calculator drawer must remain open when switching tabs');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('#calc-drawer')?.getAttribute('aria-hidden') === 'true');
    console.log('PASS: calculator adds a product, updates total and closes with Escape');

    await page.locator('.nav-item[data-route="inventory"]').click();
    await page.locator('#inventory-summary-toggle').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#inventory-summary-toggle').click();
    const invDrawer = page.locator('#inv-drawer');
    await invDrawer.waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForFunction(() => document.querySelector('#inv-drawer')?.getAttribute('aria-hidden') === 'false');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('#inv-drawer')?.getAttribute('aria-hidden') === 'true');
    console.log('PASS: inventory summary drawer opens and closes with Escape');

    await page.locator('.nav-item[data-route="deadlines"]').click();
    await page.locator('#deadlines-month-products-btn').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('#deadlines-month-products-btn').click();
    await page.locator('#deadline-month-modal-backdrop:not(.hidden)').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(
      await page.locator('#deadline-month-modal-close').evaluate(el => Math.round(el.getBoundingClientRect().width)),
      36,
      'modal close control should use the shared 36px size'
    );
    const periodInput = page.locator('.month-check-input').first();
    await periodInput.waitFor({ state: 'visible', timeout: 5000 });
    await periodInput.fill('1126');
    assert.equal(await periodInput.inputValue(), '11.26', 'month input should format MMYY as MM.YY');
    await page.locator('.month-check-save-btn').first().click();
    for (let attempt = 0; attempt < 30 && !savedPeriodPayload; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.ok(savedPeriodPayload, 'saving a month period should issue a PUT request');
    assert.equal(savedPeriodPayload.period, '11.26', 'the API payload should contain the formatted period');
    await page.locator('#deadline-month-modal-close').click();
    await page.waitForFunction(() => document.getElementById('deadline-month-modal-backdrop')?.classList.contains('hidden'));

    await page.locator('.room-cell').first().waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('.room-cell').first().click();
    await page.locator('#deadline-modal-backdrop:not(.hidden)').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal((await page.locator('#deadline-modal-room-number').innerText()).trim(), '500');
    await page.locator('#deadline-modal-backdrop').getByRole('button', { name: /В порядке/ }).click();
    await page.waitForFunction(() => document.getElementById('deadline-modal-backdrop')?.classList.contains('hidden'));
    assert.ok(apiCalls.some(call => call.path === '/rooms/101/product-statuses' && call.method === 'DELETE'),
      'setting a room to valid should send a clear-status request');
    console.log('PASS: expiry periods format and save; room status editor works with a mock API');

    await page.locator('.nav-item[data-route="history"]').click();
    await page.locator('#history-list-container').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('.history-records-table tbody tr').first().waitFor({ state: 'visible', timeout: 5000 });
    assert.equal((await page.locator('.history-records-table thead th').first().innerText()).trim().toLocaleLowerCase('ru-RU'), 'время',
      'history should show only a time column because rows are grouped by day');
    assert.match((await page.locator('.history-records-table tbody tr').first().locator('td').first().innerText()).trim(),
      /^\d{2}:\d{2}$/, 'history timestamp should contain the time without the date');
    await page.evaluate(() => window.App.historyModule.openRoomHistory(101, 500));
    const roomHistory = page.locator('#room-history-panel');
    await page.waitForFunction(() => document.querySelector('#room-history-panel')?.getAttribute('aria-hidden') === 'false');
    assert.equal(
      await page.locator('[data-room-history-close]').evaluate(el => Math.round(el.getBoundingClientRect().width)),
      36,
      'room history close control should use the shared 36px size'
    );
    assert.match(await page.locator('#room-history-title').innerText(), /500/);
    assert.doesNotMatch(await roomHistory.innerText(), /По продуктам/,
      'room history should not show the redundant “По продуктам” label for GIH');
    await page.locator('.nav-item[data-route="deadlines"]').click();
    await page.waitForFunction(() => document.getElementById('view-deadlines')?.classList.contains('active'));
    assert.equal(await roomHistory.getAttribute('aria-hidden'), 'false',
      'room history drawer must remain open when switching tabs');
    await page.locator('[data-room-history-close]').click();
    await page.waitForFunction(() => document.querySelector('#room-history-panel')?.getAttribute('aria-hidden') === 'true');
    console.log('PASS: room-history panel opens, shows the selected room and closes');

    await page.locator('.nav-item[data-route="gih"]').click();
    const gihFactory = page.locator('#gih-factory');
    await gihFactory.waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await page.locator('#gih-new-btn').count(), 0,
      'GIH creator should be permanently available without a “New entry” button');
    assert.doesNotMatch(await gihFactory.innerText(), /позици|шт/i,
      'the creator footer should not show product-position or piece counts');
    const roomInput = page.locator('#gih-finput');
    await roomInput.fill('5');
    assert.equal(await page.locator('.gih-ac-item, .gih-ac-list').count(), 0,
      'typing a partial room number must not show room suggestions');
    await roomInput.fill('500');
    const recentStrip = page.locator('#gih-room-recent');
    await recentStrip.waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForFunction(() => document.querySelector('#gih-room-recent-items')?.innerText.includes('Пополнено: Кола'));
    const recentText = await page.locator('#gih-room-recent-items').innerText();
    assert.match(recentText, /\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}/,
      'every history record should show its date and time');
    assert.match(recentText, /Пополнено: Кола/);
    assert.match(recentText, /На месте: Пеппер/);
    assert.match(recentText, /Выложили: Боржоми/);
    assert.match(recentText, /GIH · Всё выложили/);
    assert.doesNotMatch(recentText, /Режим:/, 'mode history should not repeat the word “Режим”');
    assert.match(recentText, /Опустошение/);
    assert.equal(await recentStrip.locator('.gih-room-recent-entry').count(), 3,
      'the latest three records should each occupy their own row');
    assert.equal(await recentStrip.locator('.gih-room-recent-entry').first().evaluate(el => getComputedStyle(el).display), 'block',
      'recent records should be stacked vertically');
    assert.ok(await recentStrip.evaluate(el => el.getBoundingClientRect().height < 120),
      'the recent-history strip should remain compact and unobtrusive');
    await recentStrip.locator('[data-act="open-room-history"]').click();
    await page.waitForFunction(() => document.querySelector('#room-history-panel')?.getAttribute('aria-hidden') === 'false');
    assert.match(await page.locator('#room-history-title').innerText(), /500/);
    await page.locator('[data-room-history-close]').click();
    await page.waitForFunction(() => document.querySelector('#room-history-panel')?.getAttribute('aria-hidden') === 'true');

    const fullProductName = gihFactory.locator('.gih-fitem-name');
    await fullProductName.waitFor({ state: 'visible', timeout: 5000 });
    assert.equal((await fullProductName.innerText()).trim(), 'Минеральная вода газированная 0,5 литра',
      'the complete product name should remain visible rather than being truncated');
    const productNameStyles = await fullProductName.evaluate(el => ({
      whiteSpace: getComputedStyle(el).whiteSpace,
      textOverflow: getComputedStyle(el).textOverflow,
      overflow: getComputedStyle(el).overflow
    }));
    assert.equal(productNameStyles.whiteSpace, 'normal', 'product names should wrap across lines');
    assert.equal(productNameStyles.textOverflow, 'clip', 'product names should not use ellipsis');
    assert.equal(productNameStyles.overflow, 'visible', 'product-name overflow should not be hidden');

    await gihFactory.locator('.gih-fitem[data-pid="1"]').click();
    await gihFactory.locator('[data-act="fcreate"]').click();
    for (let attempt = 0; attempt < 40 && !savedGihCreates.length; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.equal(savedGihCreates.length, 1, 'creating a GIH record should submit it to the API');
    assert.deepEqual(savedGihCreates[0], {
      roomId: 101, type: 'gih', status: 'draft', gihItems: [{ productId: 1, qty: 1 }]
    });
    await page.waitForFunction(() => document.querySelector('#gih-factory') && !document.querySelector('#gih-factory').classList.contains('hidden') && document.querySelector('#gih-finput')?.value === '');
    assert.equal(await page.locator('#gih-room-recent').count(), 0,
      'the creator should reset for the next room after a successful save');
    console.log('PASS: permanent GIH creator, exact room lookup, thin recent history and reset after create');

    const inPlaceCard = page.locator('#gih-drafts .gih-card[data-did="701"]');
    await inPlaceCard.waitFor({ state: 'visible', timeout: 5000 });
    await inPlaceCard.locator('[data-act="mode"][data-mode="all_in_place"]').click();
    await inPlaceCard.locator('[data-act="save"]').click();
    for (let attempt = 0; attempt < 40 && !savedGihPayloads.some(entry => entry.id === 701); attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    const inPlaceSave = savedGihPayloads.find(entry => entry.id === 701);
    assert.ok(inPlaceSave, 'saving “Всё на месте” should update the GIH record');
    assert.deepEqual(inPlaceSave.payload.pills, [{ id: 7011, itemStatus: 'in_place' }],
      '“Всё на месте” should assign the “На месте” status to every product');
    const inPlaceDone = page.locator('#gih-dones .gih-card[data-did="701"] .gih-done-body');
    await inPlaceDone.waitFor({ state: 'visible', timeout: 5000 });
    assert.match(await inPlaceDone.innerText(), /На месте/);
    assert.match(await inPlaceDone.innerText(), /Вода/);
    assert.doesNotMatch(await inPlaceDone.innerText(), /Не размечено/);
    assert.doesNotMatch(await inPlaceDone.innerText(), /Всё на месте/,
      'saved GIH cards should show product statuses instead of the “Всё на месте” mode label');
    assert.equal(await inPlaceCard.locator('[data-act="edit"]').count(), 0,
      'saved GIH cards must not expose an edit action');

    const outCard = page.locator('#gih-drafts .gih-card[data-did="702"]');
    await outCard.waitFor({ state: 'visible', timeout: 5000 });
    await outCard.locator('[data-act="mode"][data-mode="all_out"]').click();
    await outCard.locator('[data-act="save"]').click();
    for (let attempt = 0; attempt < 40 && !savedGihPayloads.some(entry => entry.id === 702); attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    const outSave = savedGihPayloads.find(entry => entry.id === 702);
    assert.ok(outSave, 'saving “Всё выложили” should update the GIH record');
    assert.deepEqual(outSave.payload.pills, [{ id: 7021, itemStatus: 'out' }],
      '“Всё выложили” should assign the “Выложили” status to every product');
    const outDone = page.locator('#gih-dones .gih-card[data-did="702"] .gih-done-body');
    await outDone.waitFor({ state: 'visible', timeout: 5000 });
    assert.match(await outDone.innerText(), /Выложили/);
    assert.match(await outDone.innerText(), /Вода/);
    assert.doesNotMatch(await outDone.innerText(), /Не размечено/);
    assert.doesNotMatch(await outDone.innerText(), /Всё выложили/,
      'saved GIH cards should show product statuses instead of the “Всё выложили” mode label');
    assert.equal(await outCard.locator('[data-act="edit"]').count(), 0,
      'saved GIH cards must not expose an edit action');
    console.log('PASS: saved GIH cards hide general modes and cannot be edited');

    await page.locator('.nav-item[data-route="history"]').click();
    await page.waitForFunction(() => document.getElementById('view-history')?.classList.contains('active'));
    await page.locator('[data-history-view="gih"]').click();
    const gihTable = page.locator('.history-records-table');
    await gihTable.waitFor({ state: 'visible', timeout: 5000 });
    const gihHeaders = await gihTable.locator('thead th').allInnerTexts();
    assert.equal(gihHeaders[0].trim().toLocaleLowerCase('ru-RU'), 'время',
      'GIH history should include a time column');
    await page.waitForFunction(() => document.querySelectorAll('.history-records-table tbody tr').length === 3);
    const summaryText = (await gihTable.locator('tbody').innerText());
    assert.match(summaryText, /Пополнен/,
      'replenished + in-place/out products should yield “Пополнен”');
    assert.match(summaryText, /Частично пополнен/,
      'replenished + not-replenished products should yield “Частично пополнен”');
    assert.match(summaryText, /Проверен/,
      'without any replenished products, status should be “Проверен”');
    assert.doesNotMatch(summaryText, /По продуктам|Всё на месте|Всё выложили/,
      'history should display aggregate statuses rather than general mode labels');
    const historyOutPanel = page.locator('.history-gih-status-panel[data-status="out"]').first();
    const savedOutLine = outDone.locator('.gih-done-line.gih-st-out');
    assert.equal(
      await historyOutPanel.evaluate(el => getComputedStyle(el).backgroundColor),
      await savedOutLine.evaluate(el => getComputedStyle(el).backgroundColor),
      'the “Выложили” highlight must use the same color in GIH cards and History'
    );
    console.log('PASS: GIH history displays time, aggregate statuses and matching product colors');

    assert.deepEqual(pageErrors, [], 'browser JavaScript should not throw uncaught errors');
    console.log('PASS: no uncaught browser JavaScript errors');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
