function initModuleWhenApiReady(moduleName, initFn, maxAttempts = 20, intervalMs = 100) {
  const tryInit = (attempt = 1) => {
    if (window.api && initFn) {
      initFn();
    } else if (attempt < maxAttempts) {
      setTimeout(() => tryInit(attempt + 1), intervalMs);
    }
  };
  tryInit();
}

App.events.on('route:change', (route) => {
  try {
    if (App.badges?._updaters[route]) {
      setTimeout(() => App.badges.update(route), 100);
    }
  } catch (e) {
    console.warn('Badge update failed:', e);
  }

  if (route === 'deadlines' && App.deadlinesModule) {
    initModuleWhenApiReady('deadlines', () => App.deadlinesModule.init());
  }

  if (route === 'excise' && App.exciseModule) {
    setTimeout(() => App.exciseModule.init(), 50);
  }

  if (route === 'settings' && App.settingsModule) {
    setTimeout(() => App.settingsModule.init(), 50);
  }

  if (route === 'calculator' && App.calculatorModule) {
    initModuleWhenApiReady('calculator', () => App.calculatorModule.init());
  }

  if (route === 'inventory' && App.inventoryModule) {
    initModuleWhenApiReady('inventory', () => App.inventoryModule.init());
  }
});
