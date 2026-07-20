// ═══════════════════════════════════════════════════════════════
// МОБИЛЬНАЯ НАВИГАЦИЯ: нижний таб-бар + шторка «Ещё»
// Состав и ПОРЯДОК таб-бара настраиваются: Настройки → «Нижнее меню»
// Долгое нажатие на вкладку — перетаскивание (кроме «Ещё»)
// Также: блокирует прокрутку фона под открытыми модалками
// ═══════════════════════════════════════════════════════════════
(function () {
  var STORAGE_KEY = 'minibar.tabbar.routes';
  var MAX_TABS = 5;
  var MIN_TABS = 1;
  var DEFAULT_ROUTES = ['dashboard', 'excise', 'deadlines', 'gih'];

  var ROUTE_ORDER = [
    'dashboard', 'excise', 'deadlines', 'arrivals', 'departures',
    'gih', 'history', 'empty', 'calculator', 'inventory', 'settings'
  ];

  var ROUTE_TITLES = {
    dashboard: 'Обзор', excise: 'Акцизы', deadlines: 'Сроки',
    arrivals: 'Arrivals', departures: 'Departures', gih: 'GIH',
    history: 'История', empty: 'Пустые', calculator: 'Калькулятор',
    inventory: 'Инвентаризация', settings: 'Настройки'
  };

  var ROUTE_ICONS = {
    dashboard: 'layout-dashboard', excise: 'stamp', deadlines: 'calendar',
    arrivals: 'plane-landing', departures: 'plane-takeoff', gih: 'clipboard-check',
    history: 'history', empty: 'alert-circle', calculator: 'calculator',
    inventory: 'clipboard-list', settings: 'settings'
  };

  var ROUTE_ACCENTS = {
    dashboard: 'indigo', excise: 'amber', deadlines: 'rose',
    arrivals: 'emerald', departures: 'sky', gih: 'violet',
    history: 'slate', empty: 'pink', calculator: 'teal',
    inventory: 'blue', settings: 'zinc'
  };

  // ── Сохранённый выбор и порядок разделов нижнего меню ──
  function getSelected() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          var seen = {};
          arr = arr.filter(function (r) {
            var ok = ROUTE_ORDER.indexOf(r) !== -1 && !seen[r];
            seen[r] = true;
            return ok;
          });
          if (arr.length >= MIN_TABS && arr.length <= MAX_TABS) return arr;
        }
      }
    } catch (e) { /* ignore */ }
    return DEFAULT_ROUTES.slice();
  }

  function saveSelected(arr) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch (e) { /* ignore */ }
  }

  // API для модуля настроек
  window.AppMobileNav = {
    getSelected: getSelected,
    setSelected: function (arr) {
      saveSelected(arr);
      renderAll();
    },
    MAX_TABS: MAX_TABS,
    MIN_TABS: MIN_TABS,
    ROUTE_ORDER: ROUTE_ORDER,
    ROUTE_TITLES: ROUTE_TITLES,
    ROUTE_ICONS: ROUTE_ICONS
  };

  // Порядок вкладок = порядок, сохранённый пользователем (drag&drop)
  function tabRoutes() {
    return getSelected();
  }

  function sheetRoutes() {
    var sel = getSelected();
    return ROUTE_ORDER.filter(function (r) { return sel.indexOf(r) === -1; });
  }

  function badgeHtml(route) {
    if (route === 'excise') return '<span class="mt-badge b-amber hidden" id="excise-badge-m">0</span>';
    if (route === 'deadlines') return '<span class="mt-badge b-rose hidden" id="deadlines-badge-m">0</span>';
    return '';
  }

  // ── Рендер ──
  function renderTabbar() {
    var bar = document.getElementById('mobile-tabbar');
    if (!bar) return;
    var html = tabRoutes().map(function (r) {
      return '<a class="mobile-tab" data-route="' + r + '" data-accent="' + ROUTE_ACCENTS[r] + '" href="#">' +
        '<i data-lucide="' + ROUTE_ICONS[r] + '"></i>' +
        '<span>' + ROUTE_TITLES[r] + '</span>' +
        badgeHtml(r) +
        '</a>';
    }).join('');
    // «Ещё» — всегда последний
    html += '<a class="mobile-tab" data-route="more" data-accent="indigo" href="#">' +
      '<i data-lucide="grid-3x3"></i><span>Ещё</span></a>';
    bar.innerHTML = html;
    bindTabs();
  }

  function renderSheet() {
    var grid = document.querySelector('#mobile-more-sheet .ms-grid');
    if (!grid) return;
    var routes = sheetRoutes();
    if (routes.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #94a3b8; font-size: 12px; padding: 10px 0;">Все разделы уже в нижнем меню</div>';
    } else {
      grid.innerHTML = routes.map(function (r) {
        return '<a class="ms-item" data-route="' + r + '" href="#">' +
          '<i data-lucide="' + ROUTE_ICONS[r] + '"></i>' +
          '<span>' + ROUTE_TITLES[r] + '</span>' +
          '</a>';
      }).join('');
    }
    bindSheetItems();
  }

  function renderAll() {
    renderTabbar();
    renderSheet();
    if (window.lucide) lucide.createIcons();
    syncActive(window.App && App.state ? App.state.currentRoute : 'dashboard');
    mirrorBadges();
  }

  // ── Клики ──
  var suppressTabClick = false;

  function bindTabs() {
    document.querySelectorAll('.mobile-tab').forEach(function (tab) {
      tab.addEventListener('click', function (e) {
        e.preventDefault();
        if (suppressTabClick) return; // после drag&drop не переходим
        var route = tab.dataset.route;
        if (route === 'more') openMoreSheet();
        else if (route && window.App && App.router) App.router.go(route);
      });
    });
  }

  function bindSheetItems() {
    document.querySelectorAll('.ms-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        var route = item.dataset.route;
        closeMoreSheet();
        if (route && window.App && App.router) App.router.go(route);
      });
    });
  }

  function syncActive(route) {
    document.querySelectorAll('.mobile-tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.route === route);
    });
    document.querySelectorAll('.ms-item').forEach(function (i) {
      i.classList.toggle('active', i.dataset.route === route);
    });
    var moreTab = document.querySelector('.mobile-tab[data-route="more"]');
    if (moreTab) {
      var inSheet = !!document.querySelector('.ms-item[data-route="' + route + '"]');
      moreTab.classList.toggle('active', inSheet);
    }
    var titleEl = document.getElementById('mobile-section-title');
    if (titleEl) titleEl.textContent = ROUTE_TITLES[route] || 'MiniBar OS';
  }

  function mirrorBadges() {
    ['excise', 'deadlines'].forEach(function (name) {
      var src = document.getElementById(name + '-badge');
      var dst = document.getElementById(name + '-badge-m');
      if (src && dst) {
        dst.textContent = src.textContent;
        dst.classList.toggle('hidden', src.classList.contains('hidden'));
      }
    });
  }

  function openMoreSheet() {
    var backdrop = document.getElementById('mobile-more-backdrop');
    if (!backdrop) return;
    backdrop.classList.remove('hidden');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        backdrop.classList.add('show');
        var sheet = document.getElementById('mobile-more-sheet');
        if (sheet) sheet.classList.add('open');
      });
    });
  }

  function closeMoreSheet() {
    var backdrop = document.getElementById('mobile-more-backdrop');
    if (!backdrop || backdrop.classList.contains('hidden')) return;
    backdrop.classList.remove('show');
    var sheet = document.getElementById('mobile-more-sheet');
    if (sheet) sheet.classList.remove('open');
    setTimeout(function () { backdrop.classList.add('hidden'); }, 280);
  }

  // ── Drag & drop вкладок (долгое нажатие) ──
  var LONG_PRESS_MS = 400;
  var pressTimer = null;
  var pressStart = null;
  var drag = null;

  function vibrate(ms) {
    if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
  }

  function initTabDrag() {
    var bar = document.getElementById('mobile-tabbar');
    if (!bar || bar.dataset.dragInit) return;
    bar.dataset.dragInit = '1';

    // Долгое нажатие на ссылку не должно вызывать контекстное меню
    bar.addEventListener('contextmenu', function (e) {
      if (e.target.closest('.mobile-tab')) e.preventDefault();
    });

    bar.addEventListener('touchstart', function (e) {
      if (drag) return;
      var tab = e.target.closest('.mobile-tab');
      if (!tab || tab.dataset.route === 'more') return; // «Ещё» не двигается
      if (e.touches.length !== 1) return;
      var t = e.touches[0];
      pressStart = { x: t.clientX, y: t.clientY };
      clearTimeout(pressTimer);
      pressTimer = setTimeout(function () {
        startDrag(tab, t.clientX);
      }, LONG_PRESS_MS);
    }, { passive: true });

    bar.addEventListener('touchmove', function (e) {
      var t = e.touches[0];
      if (!drag) {
        // Если палец сдвинулся до срабатывания долгого нажатия — отменяем
        if (pressTimer && pressStart) {
          if (Math.abs(t.clientX - pressStart.x) > 8 || Math.abs(t.clientY - pressStart.y) > 8) {
            clearTimeout(pressTimer);
            pressTimer = null;
          }
        }
        return;
      }
      e.preventDefault(); // не даём странице скроллиться во время drag
      moveDrag(t.clientX);
    }, { passive: false });

    bar.addEventListener('touchend', function () {
      clearTimeout(pressTimer);
      pressTimer = null;
      pressStart = null;
      if (drag) endDrag();
    });

    bar.addEventListener('touchcancel', function () {
      clearTimeout(pressTimer);
      pressTimer = null;
      pressStart = null;
      if (drag) cancelDrag();
    });
  }

  function startDrag(tab, x) {
    var bar = document.getElementById('mobile-tabbar');
    var tabs = Array.prototype.slice.call(bar.querySelectorAll('.mobile-tab'));
    var index = tabs.indexOf(tab);
    if (index === -1 || drag) return;

    drag = {
      route: tab.dataset.route,
      el: tab,
      index: index,
      startX: x,
      slotW: tab.offsetWidth,
      count: tabs.length,
      targetIndex: index
    };
    suppressTabClick = true;
    vibrate(30);

    bar.classList.add('reordering');
    tab.classList.add('drag-source');
    applyDragPositions(0);
  }

  function moveDrag(x) {
    if (!drag) return;
    var dx = x - drag.startX;
    var maxIndex = drag.count - 2; // «Ещё» последний — его не трогаем
    var target = Math.round(drag.index + dx / drag.slotW);
    target = Math.max(0, Math.min(maxIndex, target));
    drag.targetIndex = target;
    applyDragPositions(dx);
  }

  function applyDragPositions(dx) {
    var bar = document.getElementById('mobile-tabbar');
    var tabs = Array.prototype.slice.call(bar.querySelectorAll('.mobile-tab'));
    var from = drag.index, to = drag.targetIndex;
    tabs.forEach(function (t, i) {
      if (i === from) {
        t.style.transform = 'translateX(' + dx + 'px) scale(1.12)';
        t.style.zIndex = '10';
      } else if (from < to && i > from && i <= to) {
        t.style.transform = 'translateX(' + (-drag.slotW) + 'px)';
      } else if (to < from && i >= to && i < from) {
        t.style.transform = 'translateX(' + drag.slotW + 'px)';
      } else {
        t.style.transform = '';
        t.style.zIndex = '';
      }
    });
  }

  function endDrag() {
    var d = drag;
    drag = null;
    if (!d) return;
    vibrate(10);

    var moved = d.targetIndex !== d.index;
    // Плавное «приземление» в новый слот
    var shift = (d.targetIndex - d.index) * d.slotW;
    d.el.style.transition = 'transform 0.18s cubic-bezier(0.32, 0.72, 0.24, 1)';
    d.el.style.transform = 'translateX(' + shift + 'px) scale(1.12)';

    setTimeout(function () {
      if (moved) {
        var sel = getSelected();
        var idx = sel.indexOf(d.route);
        if (idx !== -1) {
          sel.splice(idx, 1);
          sel.splice(d.targetIndex, 0, d.route);
          saveSelected(sel);
        }
      }
      renderAll();
    }, 180);

    setTimeout(function () { suppressTabClick = false; }, 450);
  }

  function cancelDrag() {
    drag = null;
    renderAll();
    setTimeout(function () { suppressTabClick = false; }, 350);
  }

  // ── Блокировка прокрутки фона под модалками ──
  var MODAL_IDS = [
    'deadline-modal-backdrop',
    'deadline-month-modal-backdrop',
    'calculator-bill-modal',
    'inventory-summary-modal',
    'product-modal-backdrop',
    'mobile-more-backdrop'
  ];

  function anyModalOpen() {
    for (var i = 0; i < MODAL_IDS.length; i++) {
      var el = document.getElementById(MODAL_IDS[i]);
      if (el && !el.classList.contains('hidden')) return true;
    }
    var details = document.getElementById('deadlines-details');
    if (details && details.classList.contains('open')) return true;
    return false;
  }

  function applyScrollLock() {
    var open = anyModalOpen();
    document.documentElement.classList.toggle('scroll-locked', open);
    document.body.classList.toggle('scroll-locked', open);
    var main = document.querySelector('main');
    if (main) main.classList.toggle('scroll-locked', open);
  }

  var lockScheduled = false;
  function scheduleLockCheck() {
    if (lockScheduled) return;
    lockScheduled = true;
    requestAnimationFrame(function () {
      lockScheduled = false;
      applyScrollLock();
    });
  }

  function initScrollGuard() {
    new MutationObserver(scheduleLockCheck).observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class']
    });
    applyScrollLock();
  }

  // ── Инициализация ──
  function init() {
    renderAll();

    var backdrop = document.getElementById('mobile-more-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', function (e) {
        if (e.target.id === 'mobile-more-backdrop') closeMoreSheet();
      });
    }

    if (window.App && App.events) {
      App.events.on('route:change', function (route) {
        syncActive(route);
        closeMoreSheet();
      });
    }

    var dateEl = document.getElementById('mobile-date');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }

    var header = document.getElementById('mobile-header');
    var mainEl = document.querySelector('main');
    var onScroll = function () {
      var y = window.scrollY || (mainEl ? mainEl.scrollTop : 0);
      if (header) header.classList.toggle('scrolled', y > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    if (mainEl) mainEl.addEventListener('scroll', onScroll, { passive: true });

    setInterval(mirrorBadges, 1500);

    initTabDrag();
    initScrollGuard();
  }

  function tryInit(attempt) {
    attempt = attempt || 1;
    if (window.App && App.router && App.events) {
      init();
    } else if (attempt < 30) {
      setTimeout(function () { tryInit(attempt + 1); }, 100);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { tryInit(1); });
  } else {
    tryInit(1);
  }
})();
