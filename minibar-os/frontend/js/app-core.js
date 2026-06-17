const App = {
  state: { currentRoute: 'dashboard' },
  events: {
    listeners: {},
    on(event, cb) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(cb);
    },
    emit(event, data) {
      (this.listeners[event] || []).forEach(cb => cb(data));
    }
  },
  views: {
    dashboard: { onEnter() {}, onLeave() {} },
    excise: { onEnter() {}, onLeave() {} },
    deadlines: { onEnter() {}, onLeave() {} },
    arrivals: { onEnter() {}, onLeave() {} },
    departures: { onEnter() {}, onLeave() {} },
    gih: { onEnter() {}, onLeave() {} },
    history: { onEnter() {}, onLeave() {} },
    empty: { onEnter() {}, onLeave() {} },
    calculator: { onEnter() {}, onLeave() {} },
    inventory: { onEnter() {}, onLeave() {} },
    settings: { onEnter() {}, onLeave() {} }
  },
  router: {
    urlToRoute: {
      '/': 'dashboard',
      '/dashboard': 'dashboard',
      '/excise': 'excise',
      '/deadlines': 'deadlines',
      '/arrivals': 'arrivals',
      '/departures': 'departures',
      '/gih': 'gih',
      '/history': 'history',
      '/empty': 'empty',
      '/calculator': 'calculator',
      '/inventory': 'inventory',
      '/settings': 'settings'
    },
    routeToUrl: {
      dashboard: '/dashboard',
      excise: '/excise',
      deadlines: '/deadlines',
      arrivals: '/arrivals',
      departures: '/departures',
      gih: '/gih',
      history: '/history',
      empty: '/empty',
      calculator: '/calculator',
      inventory: '/inventory',
      settings: '/settings'
    },
    go(route, pushToHistory = true) {
      try {
        App.state.currentRoute = route;

        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));

        const view = document.getElementById('view-' + route);
        if (view) view.classList.add('active');

        document.querySelectorAll('.nav-item').forEach(el => {
          el.classList.toggle('active', el.dataset.route === route);
        });

        const url = this.routeToUrl[route] || '/';
        if (pushToHistory && window.location.pathname !== url) {
          window.history.pushState({ route }, '', url);
        }

        if (window.lucide) {
          try { lucide.createIcons(); } catch (e) { /* ignore */ }
        }

        App.events.emit('route:change', route);
      } catch (err) {
        console.error('Router.go error:', err);
      }
    },
    currentFromUrl() {
      return this.urlToRoute[window.location.pathname] || 'dashboard';
    },
    current() {
      return App.state.currentRoute;
    }
  }
};

App.badges = {
  _updaters: {},

  register(name, updaterFn) {
    this._updaters[name] = updaterFn;
  },

  async update(name) {
    try {
      const updater = this._updaters[name];
      if (!updater) return;

      const badge = document.getElementById(`${name}-badge`);
      if (!badge) return;

      const count = await updater();
      if (typeof count === 'number' && count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    } catch (err) {
      console.warn(`Badge ${name} update failed:`, err);
    }
  },

  async updateAll(retryCount = 0) {
    const maxRetries = 10;
    const results = await Promise.allSettled(
      Object.keys(this._updaters).map(name => this.update(name))
    );

    const hasApiErrors = results.some(r =>
      r.status === 'rejected' || (r.value === undefined && retryCount < maxRetries)
    );

    if (hasApiErrors && retryCount < maxRetries) {
      setTimeout(() => this.updateAll(retryCount + 1), 500);
    }
  }
};

window.App = App;
