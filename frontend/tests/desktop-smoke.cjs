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
  template: { items: [{ qty: 5, product }] }
}];

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
      body = { items: [], total: 0 };
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
    console.log('PASS: desktop shell and design-system.css load correctly');

    await page.locator('.nav-item[data-route="calculator"]').click();
    const calcDrawer = page.locator('#calc-drawer');
    await calcDrawer.waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await calcDrawer.getAttribute('aria-hidden'), 'false', 'calculator drawer should open');
    const calcProduct = page.locator('#cd-grid .cd-product[data-product-id="1"]');
    await calcProduct.waitFor({ state: 'visible', timeout: 10000 });
    await calcProduct.click();
    await page.locator('#cd-grid .cd-badge').waitFor({ state: 'visible', timeout: 3000 });
    assert.match(await page.locator('#cd-count').innerText(), /1 позици/);
    assert.match(await page.locator('#cd-total').innerText(), /150/);
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
    await page.evaluate(() => window.App.historyModule.openRoomHistory(101, 500));
    const roomHistory = page.locator('#room-history-panel');
    await page.waitForFunction(() => document.querySelector('#room-history-panel')?.getAttribute('aria-hidden') === 'false');
    assert.match(await page.locator('#room-history-title').innerText(), /500/);
    await page.locator('[data-room-history-close]').click();
    await page.waitForFunction(() => document.querySelector('#room-history-panel')?.getAttribute('aria-hidden') === 'true');
    console.log('PASS: room-history panel opens, shows the selected room and closes');

    assert.deepEqual(pageErrors, [], 'browser JavaScript should not throw uncaught errors');
    console.log('PASS: no uncaught browser JavaScript errors');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
