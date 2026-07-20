// ═══════════════════════════════════════════════════════════════
// МОБИЛЬНАЯ НАВИГАЦИЯ: нижний таб-бар + шторка «Ещё»
// ═══════════════════════════════════════════════════════════════
(function () {
  var routeTitles = {
    dashboard: 'Обзор', excise: 'Акцизы', deadlines: 'Сроки',
    arrivals: 'Arrivals', departures: 'Departures', gih: 'GIH',
    history: 'История', empty: 'Пустые', calculator: 'Калькулятор',
    inventory: 'Инвентаризация', settings: 'Настройки'
  };

  function init() {
    // Клики по таб-бару
    document.querySelectorAll('.mobile-tab').forEach(function (tab) {
      tab.addEventListener('click', function (e) {
        e.preventDefault();
        var route = tab.dataset.route;
        if (route === 'more') openMoreSheet();
        else if (route && window.App && App.router) App.router.go(route);
      });
    });

    // Клики по шторке
    document.querySelectorAll('.ms-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        var route = item.dataset.route;
        closeMoreSheet();
        if (route && window.App && App.router) App.router.go(route);
      });
    });

    // Закрытие по фону
    var backdrop = document.getElementById('mobile-more-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', function (e) {
        if (e.target.id === 'mobile-more-backdrop') closeMoreSheet();
      });
    }

    // Синхронизация активной вкладки и заголовка
    if (window.App && App.events) {
      App.events.on('route:change', function (route) {
        syncActive(route);
        closeMoreSheet();
      });
    }

    // Дата в шапке
    var dateEl = document.getElementById('mobile-date');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }

    // Тень шапки при скролле
    var header = document.getElementById('mobile-header');
    var mainEl = document.querySelector('main');
    var onScroll = function () {
      var y = window.scrollY || (mainEl ? mainEl.scrollTop : 0);
      if (header) header.classList.toggle('scrolled', y > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    if (mainEl) mainEl.addEventListener('scroll', onScroll, { passive: true });

    // Зеркалим бейджи из сайдбара в таб-бар
    setInterval(mirrorBadges, 1500);
    mirrorBadges();

    if (window.App && App.state && App.state.currentRoute) syncActive(App.state.currentRoute);
  }

  function syncActive(route) {
    document.querySelectorAll('.mobile-tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.route === route);
    });
    document.querySelectorAll('.ms-item').forEach(function (i) {
      i.classList.toggle('active', i.dataset.route === route);
    });
    // «Ещё» подсвечивается, если открыт раздел из шторки
    var moreTab = document.querySelector('.mobile-tab[data-route="more"]');
    if (moreTab) {
      var inSheet = !!document.querySelector('.ms-item[data-route="' + route + '"]');
      moreTab.classList.toggle('active', inSheet);
    }
    var titleEl = document.getElementById('mobile-section-title');
    if (titleEl) titleEl.textContent = routeTitles[route] || 'MiniBar OS';
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

  // Ждём готовности App
  function tryInit(attempt) {
    attempt = attempt || 1;
    if (window.App && App.router && App.events) {
      init();
      if (window.lucide) lucide.createIcons();
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
