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

const exciseRecords = [
  { id: 901, markNumber: '12345678901234567890', createdAt: new Date().toISOString() },
  { id: 903, markNumber: '22345678901234567890', createdAt: new Date().toISOString() },
  { id: 902, markNumber: 'INVALID-EXCISE', createdAt: new Date().toISOString() }
];

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
  { ...makeGihHistoryRecord(1, ['replenished', 'in_place', 'out'], ['Кола', 'Пеппер', 'Боржоми']), notes: 'Проверить остатки перед выездом' },
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
const roomSearchRecords = [
  { ...makeGihHistoryRecord(811, ['out'], ['Тест 502']), id: 811, type: 'check', room: { number: 502 }, notes: null, gihItems: [] },
  { ...makeGihHistoryRecord(812, ['out'], ['Тест 1502']), id: 812, type: 'check', room: { number: 1502 }, notes: null, gihItems: [] }
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
      if (url.searchParams.has('room')) {
        body = { items: roomSearchRecords, total: roomSearchRecords.length };
      } else if (operation === 'daily') {
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
      if (payload.gihRoomStatus === 'not_checked' && body && body.id) {
        const archived = { ...body, status: 'done', gihRoomStatus: 'not_checked' };
        if (!gihHistoryRecords.some(check => check.id === id)) gihHistoryRecords.push(archived);
        if (!roomHistoryRecords.some(check => check.id === id)) roomHistoryRecords.push(archived);
      }
    } else if (path === '/checks') {
      body = [];
    } else if (path === '/excises' && method === 'GET') {
      body = exciseRecords;
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

    const expectedPageIcons = [
      ['dashboard', 'layout-dashboard'],
      ['excise', 'stamp'],
      ['arrivals', 'plane-landing'],
      ['departures', 'plane-takeoff'],
      ['gih', 'clipboard-check'],
      ['inventory', 'clipboard-list'],
      ['deadlines', 'calendar'],
      ['history', 'history'],
      ['empty', 'alert-circle'],
      ['calculator', 'calculator'],
      ['settings', 'settings']
    ];
    const pageIconAudit = await page.evaluate(routes => routes.map(([route, expected]) => {
      const icon = document.querySelector('#view-' + route + ' .page-title [data-page-icon]');
      return [route, icon ? icon.getAttribute('data-page-icon') : null, expected];
    }), expectedPageIcons);
    assert.deepEqual(pageIconAudit, expectedPageIcons.map(([route, icon]) => [route, icon, icon]),
      'each main tab should display its matching sidebar icon in the page title');
    const titleIconStyle = await page.locator('#view-excise .page-title-icon').evaluate(icon => ({
      width: getComputedStyle(icon).width,
      height: getComputedStyle(icon).height,
      strokeWidth: getComputedStyle(icon).strokeWidth
    }));
    assert.deepEqual(titleIconStyle, { width: '24px', height: '24px', strokeWidth: '2.5px' },
      'page title icons should be 24px and use a bolder stroke');
    assert.deepEqual(await page.locator('[data-history-view]').evaluateAll(nodes => nodes.map(node => node.dataset.historyView)),
      ['daily', 'gih', 'deadlines'], 'history subtabs should be ordered Daily, GIH, Deadlines');

    const searchFrame = await page.evaluate(() => ({
      inputBorder: getComputedStyle(document.getElementById('history-search')).borderTopWidth,
      wrapperBorder: getComputedStyle(document.querySelector('.history-search-wrap')).borderTopWidth
    }));
    assert.equal(searchFrame.inputBorder, '0px', 'history search input should not draw a second border');
    assert.equal(searchFrame.wrapperBorder, '1px', 'history search should keep one shared wrapper border');

    assert.ok(parseFloat(await page.locator('.sidebar').evaluate(el => getComputedStyle(el).width)) > 200,
      'expanded desktop sidebar should have a usable width');

    const navigationAccentTransitionGuard = await page.addStyleTag({
      content: '.nav-item, .nav-item .nav-icon { transition: none !important; }'
    });
    const navigationAccentChecks = await page.evaluate(() => {
      const links = [...document.querySelectorAll('.nav-item')];
      const originalActive = links.map(link => link.classList.contains('active'));
      const cases = [
        ['excise', 'excise-badge', 'rgb(146, 64, 14)'],
        ['deadlines', 'deadlines-badge', 'rgb(153, 27, 27)'],
        ['arrivals', 'arrivals-badge', 'rgb(6, 95, 70)'],
        ['departures', 'departures-badge', 'rgb(30, 64, 175)'],
        ['gih', 'gih-badge', 'rgb(55, 48, 163)'],
        ['empty', 'empty-badge', 'rgb(159, 18, 57)'],
        ['inventory', 'inventory-badge', 'rgb(7, 89, 133)']
      ];
      const result = cases.map(([route, badgeId, expectedColor]) => {
        links.forEach(link => link.classList.toggle('active', link.dataset.route === route));
        const link = links.find(node => node.dataset.route === route);
        const badge = document.getElementById(badgeId);
        return {
          route,
          expectedColor,
          hasAccent: link.hasAttribute('data-accent'),
          accentValue: link.dataset.accent,
          matchesAccentSelector: link.matches('.nav-item.active[data-accent]'),
          navActiveVariable: getComputedStyle(link).getPropertyValue('--nav-active-color').trim(),
          resolvedAccentVariable: getComputedStyle(link).getPropertyValue('--accent').trim(),
          activeColor: getComputedStyle(link).color,
          iconColor: getComputedStyle(link.querySelector('.nav-icon')).color,
          badgeColor: getComputedStyle(badge).color
        };
      });
      links.forEach((link, index) => link.classList.toggle('active', originalActive[index]));
      return result;
    });
    await navigationAccentTransitionGuard.evaluate(element => element.remove());
    for (const check of navigationAccentChecks) {
      assert.equal(check.badgeColor, check.expectedColor, `${check.route} badge should keep its defined accent`);
      assert.equal(check.activeColor, check.expectedColor, `${check.route} active label should match its badge accent; diagnostics=${JSON.stringify(check)}`);
      assert.equal(check.iconColor, check.expectedColor, `${check.route} active icon should match its badge accent`);
    }
    console.log('PASS: active sidebar labels and icons match each colored badge');

    await page.locator('.nav-item[data-route="excise"]').click();
    await page.locator('#excise-list .excise-card').first().waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await page.locator('#excise-list .excise-card').count(), 3,
      'excise list should render two valid marks and one invalid mark');
    assert.equal(await page.locator('#excise-list .excise-card.valid').count(), 2,
      'both valid marks should be classified as valid');
    assert.equal(await page.locator('#excise-list .excise-card.invalid').count(), 1,
      'the invalid mark should remain visible but not be exported');
    assert.equal(await page.locator('#excise-list .excise-card.valid .excise-meta-status').first().innerText(), 'Валидна');
    assert.equal(await page.locator('#excise-list .excise-card.invalid .excise-meta-status').innerText(), 'Проверить марку');
    assert.equal(await page.locator('#excise-list .excise-card.valid').first().evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)',
      'valid excise cards should use the shared neutral card surface');
    assert.equal(await page.locator('#excise-copy-all-btn').count(), 0,
      'the obsolete copy-all action should be removed');

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#excise-download-btn').click();
    const exciseDownload = await downloadPromise;
    assert.match(exciseDownload.suggestedFilename(), /^Акцизы мини-бар \d{2}\.\d{2}\.\d{2}\.xlsx$/,
      'download should use the requested Russian title and DD.MM.YY date');
    const fs = require('node:fs');
    const workbook = fs.readFileSync(await exciseDownload.path());
    assert.equal(workbook.readUInt32LE(0), 0x04034b50, 'download should be an actual XLSX ZIP package');
    function readStoredZipEntry(buffer, wantedName) {
      let offset = 0;
      while (offset + 30 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
        const compression = buffer.readUInt16LE(offset + 8);
        const compressedSize = buffer.readUInt32LE(offset + 18);
        const nameLength = buffer.readUInt16LE(offset + 26);
        const extraLength = buffer.readUInt16LE(offset + 28);
        const name = buffer.subarray(offset + 30, offset + 30 + nameLength).toString('utf8');
        const dataStart = offset + 30 + nameLength + extraLength;
        if (name === wantedName) {
          assert.equal(compression, 0, 'test XLSX entries should use stored ZIP data');
          return buffer.subarray(dataStart, dataStart + compressedSize).toString('utf8');
        }
        offset = dataStart + compressedSize;
      }
      throw new Error(`Missing XLSX entry: ${wantedName}`);
    }
    const worksheetXml = readStoredZipEntry(workbook, 'xl/worksheets/sheet1.xml');
    const exportedMarks = [...worksheetXml.matchAll(/<row r="\d+"><c r="A\d+" t="inlineStr"><is><t xml:space="preserve">(.*?)<\/t><\/is><\/c><\/row>/g)]
      .map(match => match[1].replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&'));
    assert.deepEqual(exportedMarks, ['12345678901234567890', '22345678901234567890'],
      'Excel should contain only valid excises, one mark per row and no header or extra columns');
    assert.ok(!worksheetXml.includes('INVALID-EXCISE'), 'invalid marks must not be included in the workbook');
    console.log('PASS: excise cards use the site style and download creates a valid-mark-only XLSX workbook');

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

    await page.locator('#history-search').fill('502');
    await page.waitForFunction(() => {
      const numbers = [...document.querySelectorAll('.history-records-table [data-history-room-number]')]
        .map(node => node.getAttribute('data-history-room-number'));
      return numbers.length === 1 && numbers[0] === '502';
    }, null, { timeout: 5000 });
    const exactRoomMatches = await page.locator('.history-records-table [data-history-room-number]')
      .evaluateAll(nodes => nodes.map(node => node.getAttribute('data-history-room-number')));
    assert.deepEqual(exactRoomMatches, ['502'],
      'searching 502 must never show partial match 1502, even if the API returns both');
    assert.equal((await page.locator('#history-results-count').innerText()).trim(), 'Найдено: 1',
      'the search count should reflect exact matches only');
    await page.locator('#history-search-clear').click();
    await page.waitForFunction(() => [...document.querySelectorAll('.history-records-table [data-history-room-number]')]
      .some(node => node.getAttribute('data-history-room-number') === '500'), null, { timeout: 5000 });

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
    await page.locator('#gih-drafts .gih-card[data-did="701"]').waitFor({ state: 'visible', timeout: 5000 });
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
    await page.waitForFunction(() => {
      const element = document.querySelector('#gih-room-recent-items');
      return element && !element.innerText.includes('Загрузка истории…');
    }, null, { timeout: 5000 });
    const recentText = await page.locator('#gih-room-recent-items').innerText();
    assert.match(recentText, /\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}/,
      'every history record should show its date and time');
    assert.match(recentText, /Пополнено:\s*Кола/,
      'inline GIH history should summarize products by status; rendered text was: ' + recentText);
    assert.match(recentText, /На месте: Пеппер/);
    assert.match(recentText, /Выложили: Боржоми/);
    assert.match(recentText, /GIH · Всё выложили/);
    assert.doesNotMatch(recentText, /Режим:/, 'mode history should not repeat the word “Режим”');
    assert.match(recentText, /Опустошение/);
    assert.match(recentText, /Проверить остатки перед выездом/,
      'inline room history should also display a saved record comment');
    assert.equal(await recentStrip.locator('.gih-room-recent-entry').count(), 3,
      'the latest three records should each occupy their own row');
    assert.equal(await recentStrip.locator('.gih-room-recent-entry').first().evaluate(el => getComputedStyle(el).display), 'block',
      'recent records should be stacked vertically');
    assert.equal(await recentStrip.locator('.gih-room-recent-open').evaluate(el => getComputedStyle(el).alignSelf), 'center',
      'the history drawer button should be vertically centered beside the three history rows');
    assert.notEqual(await recentStrip.locator('.gih-room-recent-note').first().evaluate(el => getComputedStyle(el).color),
      await recentStrip.locator('.gih-room-recent-entry').first().evaluate(el => getComputedStyle(el).color),
      'comments and status accents should have their own subdued color');
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
    page.once('dialog', dialog => dialog.accept('Комментарий к проверке'));
    await inPlaceCard.locator('[data-act="notes"]').click();
    for (let attempt = 0; attempt < 40 && !savedGihPayloads.some(entry => entry.id === 701 && Object.prototype.hasOwnProperty.call(entry.payload, 'notes')); attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    const savedDraftNote = savedGihPayloads.find(entry => entry.id === 701 && Object.prototype.hasOwnProperty.call(entry.payload, 'notes'));
    assert.ok(savedDraftNote, 'editing a draft comment should persist it immediately');
    assert.equal(savedDraftNote.payload.notes, 'Комментарий к проверке');
    await inPlaceCard.locator('[data-act="mode"][data-mode="all_in_place"]').click();
    await inPlaceCard.locator('[data-act="save"]').click();
    for (let attempt = 0; attempt < 40 && !savedGihPayloads.some(entry => entry.id === 701); attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    const inPlaceSave = savedGihPayloads.find(entry => entry.id === 701 && Array.isArray(entry.payload.pills));
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

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0);
    const staleDraft = {
      ...makeGihDraft(704),
      checkDate: yesterday.toISOString(),
      createdAt: yesterday.toISOString(),
      notes: 'Заметка старого черновика'
    };
    const staleSaved = {
      ...makeGihHistoryRecord(705, ['replenished'], ['Старая сохранённая запись']),
      checkDate: yesterday.toISOString(),
      createdAt: yesterday.toISOString()
    };
    gihChecks.push(staleDraft, staleSaved);
    await page.evaluate(() => window.App.gihModule.refresh());
    for (let attempt = 0; attempt < 40 && !savedGihPayloads.some(entry => entry.id === 704 && entry.payload.gihRoomStatus === 'not_checked'); attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    const archivePayload = savedGihPayloads.find(entry => entry.id === 704 && entry.payload.gihRoomStatus === 'not_checked');
    assert.ok(archivePayload, 'a previous-day draft should be converted into a completed history record');
    assert.equal(archivePayload.payload.status, 'done');
    assert.equal(archivePayload.payload.notes, 'Заметка старого черновика',
      'archiving a previous-day draft should preserve its comment');
    const archivedCheck = gihChecks.find(check => check.id === 704);
    assert.equal(archivedCheck.status, 'done');
    assert.equal(archivedCheck.gihRoomStatus, 'not_checked');
    assert.equal(await page.locator('#gih-drafts .gih-card[data-did="704"]').count(), 0,
      'previous-day drafts should not remain on the GIH tab');
    assert.equal(await page.locator('#gih-dones .gih-card[data-did="704"]').count(), 0,
      'archived unchecked records should be hidden from saved GIH cards');
    assert.equal(await page.locator('#gih-dones .gih-card[data-did="705"]').count(), 0,
      'previous-day saved cards should disappear from the GIH tab without being deleted');

    await page.evaluate(() => window.App.historyModule.refresh());
    await page.waitForFunction(() => document.querySelector('.history-records-table')?.innerText.includes('Не проверен'));
    const archivedHistory = page.locator('.history-records-table');
    assert.match(await archivedHistory.innerText(), /Заметка старого черновика/,
      'the archived record and its comment should remain in GIH history');
    assert.ok(gihHistoryRecords.some(check => check.id === 704 && check.gihRoomStatus === 'not_checked'),
      'archiving should retain a history record instead of deleting it');
    console.log('PASS: day rollover hides old saved cards and archives stale drafts as “Не проверен”');

    assert.deepEqual(pageErrors, [], 'browser JavaScript should not throw uncaught errors');
    console.log('PASS: no uncaught browser JavaScript errors');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
