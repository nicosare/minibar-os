document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const route = item.dataset.route;
      if (route && App.router) {
        App.router.go(route);
      }
    });
  });

  const sidebar = document.querySelector('aside.sidebar');
  const sidebarToggle = document.querySelector('[data-sidebar-toggle]');
  if (sidebar && sidebarToggle) {
    sidebarToggle.addEventListener('click', (event) => {
      event.preventDefault();
      const expanded = sidebar.classList.toggle('is-expanded');
      sidebarToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
  }

  window.addEventListener('popstate', (event) => {
    const route = event.state?.route || App.router.currentFromUrl();
    App.router.go(route, false);
  });

  const initialRoute = App.router.currentFromUrl();
  App.router.go(initialRoute, false);

  const bootstrap = async () => {
    try {
      await window.AppUtils.waitForApi();
      App.badges.updateAll();
      if (window.lucide) lucide.createIcons();

      if (initialRoute === 'dashboard' && App.dashboardModule) {
        App.dashboardModule.init();
      }
      if ((initialRoute === 'arrivals' || initialRoute === 'departures') && App.listsModule) {
        App.listsModule.init();
      }
      if (initialRoute === 'history' && App.historyModule) {
        App.historyModule.init();
      }
      if (initialRoute === 'excise' && App.exciseModule) {
        App.exciseModule.init();
      }
      if (initialRoute === 'deadlines' && App.deadlinesModule) {
        App.deadlinesModule.init();
      }
      if (initialRoute === 'settings' && App.settingsModule) {
        App.settingsModule.init();
      }
      if (initialRoute === 'calculator' && App.calculatorModule) {
        App.calculatorModule.init();
      }
      if (initialRoute === 'inventory' && App.inventoryModule) {
        App.inventoryModule.init();
      }
      if (initialRoute === 'gih' && App.gihModule) {
        App.gihModule.init();
      }
    } catch (e) {
      console.warn('Bootstrap failed:', e);
    }
  };

  setTimeout(bootstrap, 100);
});
