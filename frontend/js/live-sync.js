(function () {
  'use strict';

  const clientId = window.MINIBAR_CLIENT_ID || ('page-' + Date.now().toString(36));
  const apiBase = String(window.API_BASE || '/api').replace(/\/$/, '');
  const routeDomains = {
    dashboard: ['all', 'dashboard', 'history', 'rooms', 'products', 'deadlines', 'gih', 'templates', 'miniapp'],
    history: ['all', 'history', 'gih'],
    deadlines: ['all', 'deadlines', 'rooms', 'products', 'templates'],
    excise: ['all', 'excises'],
    arrivals: ['all', 'lists', 'rooms', 'products'],
    departures: ['all', 'lists', 'rooms', 'products'],
    gih: ['all', 'gih', 'history', 'rooms', 'products', 'templates'],
    empty: ['all', 'rooms', 'deadlines'],
    calculator: ['all', 'products', 'templates', 'rooms', 'history'],
    inventory: ['all', 'products'],
    settings: ['all', 'products', 'templates', 'settings']
  };

  const dirtyRoutes = new Set();
  const routeRevisions = new Map();
  const inFlight = new Set();
  const pendingRefresh = new Set();
  const handledEventIds = new Set();
  const refreshTimers = new Map();
  let eventSource = null;
  let badgeTimer = null;
  let connectionState = 'connecting';

  Object.keys(routeDomains).forEach(route => routeRevisions.set(route, 0));

  function currentRoute() {
    return window.App && App.state && App.state.currentRoute
      ? App.state.currentRoute
      : 'dashboard';
  }

  function routeMatches(route, domains) {
    const expected = routeDomains[route] || ['all'];
    return domains.includes('all') || domains.some(domain => expected.includes(domain));
  }

  function routesForDomains(domains) {
    return Object.keys(routeDomains).filter(route => routeMatches(route, domains));
  }

  function markRoutesDirty(routes) {
    routes.forEach(route => {
      dirtyRoutes.add(route);
      routeRevisions.set(route, (routeRevisions.get(route) || 0) + 1);
    });
  }

  function markAllDirty() {
    markRoutesDirty(Object.keys(routeDomains));
  }

  function activeEditorBlocksRefresh(route) {
    const active = document.activeElement;

    if (route === 'settings') {
      const modal = document.getElementById('product-modal-backdrop');
      if (modal && !modal.classList.contains('hidden')) return true;
      const view = document.getElementById('view-settings');
      if (active && view && view.contains(active) &&
          /^(INPUT|SELECT|TEXTAREA)$/.test(active.tagName)) return true;
    }
    if (route === 'history' && active && /^(INPUT|SELECT|TEXTAREA)$/.test(active.tagName) &&
        active.closest('#view-history')) return true;
    if (route === 'inventory' && active && active.classList &&
        active.classList.contains('inv-field')) return true;
    if (route === 'gih') {
      const factory = document.getElementById('gih-factory');
      if (factory && !factory.classList.contains('hidden')) return true;
      if (active && active.id === 'gih-finput') return true;
    }
    if (route === 'calculator' && active &&
        /^(INPUT|SELECT|TEXTAREA)$/.test(active.tagName) &&
        (active.closest('#view-calculator') || active.closest('#calc-drawer'))) return true;
    return false;
  }

  function refreshTarget(route) {
    const map = {
      dashboard: App.dashboardModule,
      history: App.historyModule,
      deadlines: App.deadlinesModule,
      excise: App.exciseModule,
      arrivals: App.listsModule,
      departures: App.listsModule,
      gih: App.gihModule,
      empty: App.listsModule,
      calculator: App.calculatorModule,
      inventory: App.inventoryModule,
      settings: App.settingsModule
    };
    const module = map[route];
    if (!module) return null;
    if (typeof module.refresh === 'function') return module.refresh.bind(module);
    if (typeof module.init === 'function') return module.init.bind(module);
    return null;
  }

  async function refreshRoute(route, force) {
    if (!route || (!force && !dirtyRoutes.has(route))) return;
    if (activeEditorBlocksRefresh(route)) {
      pendingRefresh.add(route);
      return;
    }
    if (inFlight.has(route)) return;

    const refresh = refreshTarget(route);
    if (!refresh) {
      dirtyRoutes.delete(route);
      return;
    }

    const startRevision = routeRevisions.get(route) || 0;
    inFlight.add(route);
    try {
      const result = await refresh();
      if (result === false) {
        pendingRefresh.add(route);
        return;
      }
      if ((routeRevisions.get(route) || 0) === startRevision) {
        dirtyRoutes.delete(route);
        pendingRefresh.delete(route);
      }
    } catch (error) {
      console.warn('Live refresh failed for ' + route + ':', error);
    } finally {
      inFlight.delete(route);
      if ((routeRevisions.get(route) || 0) !== startRevision) {
        scheduleRefresh(route, 150);
      }
    }
  }

  function scheduleRefresh(route, delay) {
    if (!route) return;
    if (refreshTimers.has(route)) clearTimeout(refreshTimers.get(route));
    const timer = setTimeout(() => {
      refreshTimers.delete(route);
      refreshRoute(route, false);
    }, delay);
    refreshTimers.set(route, timer);
  }

  function scheduleBadges() {
    clearTimeout(badgeTimer);
    badgeTimer = setTimeout(() => {
      if (window.App && App.badges && typeof App.badges.updateAll === 'function') {
        App.badges.updateAll();
      }
    }, 120);
  }

  function notifyModules(event) {
    if (window.App && App.events) App.events.emit('data:changed', event);
    window.dispatchEvent(new CustomEvent('minibar:data-changed', { detail: event }));
  }

  function handleChange(event) {
    if (event.id) {
      if (handledEventIds.has(event.id)) return;
      handledEventIds.add(event.id);
      if (handledEventIds.size > 600) {
        const oldest = handledEventIds.values().next().value;
        handledEventIds.delete(oldest);
      }
    }
    const domains = Array.isArray(event.domains) && event.domains.length
      ? event.domains
      : ['all'];
    markRoutesDirty(routesForDomains(domains));
    notifyModules(event);
    scheduleBadges();

    // Own API responses already update the active module. Keep its dirty marker
    // so it is refreshed on next navigation; other tabs refresh immediately.
    if (event.originClientId !== clientId) {
      scheduleRefresh(currentRoute(), 100);
    }
  }

  function handleSyncRequired(event) {
    const payload = event || { reason: 'resync', domains: ['all'] };
    markAllDirty();
    notifyModules(payload);
    scheduleBadges();
    scheduleRefresh(currentRoute(), 100);
  }

  function start() {
    if (!('EventSource' in window)) {
      console.warn('Server-Sent Events are not supported in this browser.');
      return;
    }
    if (eventSource && eventSource.readyState !== EventSource.CLOSED) return;

    const separator = apiBase.includes('?') ? '&' : '?';
    const url = apiBase + '/events' + separator + 'clientId=' + encodeURIComponent(clientId);
    eventSource = new EventSource(url);

    eventSource.addEventListener('open', () => {
      connectionState = 'connected';
      window.dispatchEvent(new CustomEvent('minibar:sync-status', {
        detail: { connected: true }
      }));
    });

    eventSource.addEventListener('data.changed', message => {
      try {
        handleChange(JSON.parse(message.data));
      } catch (error) {
        console.warn('Invalid live event:', error);
        handleSyncRequired({ type: 'sync.required', reason: 'invalid-event', domains: ['all'] });
      }
    });

    eventSource.addEventListener('sync.required', message => {
      let payload = { type: 'sync.required', domains: ['all'], reason: 'resync' };
      try { payload = JSON.parse(message.data); } catch (_) {}
      handleSyncRequired(payload);
    });

    eventSource.addEventListener('error', () => {
      connectionState = 'reconnecting';
      window.dispatchEvent(new CustomEvent('minibar:sync-status', {
        detail: { connected: false, reconnecting: true }
      }));
      // EventSource reconnects automatically; server replay or sync.required
      // will restore the client after the connection comes back.
    });
  }

  function pumpPendingRefreshes() {
    if (!pendingRefresh.size) return;
    const route = currentRoute();
    if (pendingRefresh.has(route) && !activeEditorBlocksRefresh(route)) {
      scheduleRefresh(route, 100);
    }
  }

  document.addEventListener('focusout', () => setTimeout(pumpPendingRefreshes, 120), true);
  document.addEventListener('click', () => setTimeout(pumpPendingRefreshes, 160), true);

  if (window.App && App.events) {
    App.events.on('route:change', route => {
      if (dirtyRoutes.has(route)) scheduleRefresh(route, 80);
      pumpPendingRefreshes();
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      markAllDirty();
      scheduleRefresh(currentRoute(), 80);
      scheduleBadges();
    }
  });

  window.addEventListener('online', () => {
    markAllDirty();
    scheduleRefresh(currentRoute(), 80);
    scheduleBadges();
  });

  window.AppLiveSync = {
    clientId,
    get state() { return connectionState; },
    refreshCurrent() {
      markAllDirty();
      return refreshRoute(currentRoute(), true);
    }
  };

  // Let route initialization finish before requesting the initial authoritative state.
  document.addEventListener('DOMContentLoaded', () => setTimeout(start, 180), { once: true });
})();
