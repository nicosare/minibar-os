import { getState, setState, subscribe } from './core/store.js';
import { renderTopbar, renderBottomNav, pageHeader } from './components/chrome.js';
import { icon, renderIcons } from './components/icons.js';

const topbar = document.getElementById('appTopbar');
const main = document.getElementById('appMain');
const bottomNav = document.getElementById('bottomNav');
if (!topbar || !main || !bottomNav) throw new Error('Не найдена оболочка Minibar OS');

const screens = {
  camera: {
    title: 'Камера',
    glyph: 'camera',
    status: 'Рабочее пространство камеры',
    description: 'Здесь будет единая очередь номеров из заездов и выездов. Каждый номер будет отображаться только один раз. Для всех номеров на заезд появится отдельная метка — независимо от того, из какого списка пришёл номер.'
  },
  deadlines: {
    title: 'Сроки',
    glyph: 'calendar-clock',
    status: 'Раздел сроков готовится',
    description: 'Здесь будут собраны сроки по номерам из общей очереди.'
  },
  history: {
    title: 'История',
    glyph: 'history',
    status: 'История пока не подключена',
    description: 'Здесь будет отображаться история действий и изменений.'
  },
  gih: {
    title: 'GIH',
    glyph: 'clipboard-check',
    status: 'Раздел GIH готовится',
    description: 'Здесь будет отдельное рабочее пространство GIH.'
  },
  'extra-excises': {
    title: 'Акцизы',
    glyph: 'stamp',
    status: 'Раздел пока пуст',
    description: 'Инструмент появится здесь на следующем этапе.'
  },
  'extra-inventory': {
    title: 'Инвентаризация',
    glyph: 'clipboard-list',
    status: 'Раздел пока пуст',
    description: 'Инструмент появится здесь на следующем этапе.'
  },
  'extra-calculator': {
    title: 'Калькулятор',
    glyph: 'calculator',
    status: 'Раздел пока пуст',
    description: 'Инструмент появится здесь на следующем этапе.'
  },
  'extra-settings': {
    title: 'Настройки',
    glyph: 'settings',
    status: 'Раздел пока пуст',
    description: 'Настройки появятся здесь на следующем этапе.'
  }
};

function renderScreen(screen) {
  const content = screens[screen] || screens.camera;
  const cameraNote = screen === 'camera'
    ? '<div class="placeholder-principle"><span class="placeholder-principle-dot"></span><span>Один номер — одна карточка в общей очереди</span></div>'
    : '';
  return '<div class="screen screen-placeholder">' +
    pageHeader({ title: content.title }) +
    '<section class="placeholder-card">' +
    '<span class="placeholder-icon">' + icon(content.glyph, 27) + '</span>' +
    '<span class="placeholder-kicker">В РАЗРАБОТКЕ</span>' +
    '<strong>' + content.status + '</strong>' +
    '<p>' + content.description + '</p>' +
    cameraNote +
    '</section></div>';
}

let renderedScreen = null;

function render() {
  const state = getState();
  const screen = screens[state.screen] ? state.screen : 'camera';

  topbar.innerHTML = renderTopbar(state);
  main.innerHTML = renderScreen(screen);
  bottomNav.innerHTML = renderBottomNav({ ...state, screen });
  renderIcons();

  document.documentElement.dataset.screen = screen;
  if (screen !== renderedScreen) main.scrollTop = 0;
  renderedScreen = screen;
}

subscribe(render);
if (!screens[getState().screen]) setState({ screen: 'camera', menuOpen: false });
render();

document.addEventListener('click', event => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  if (target.closest('[data-menu-toggle]')) {
    setState(current => ({ menuOpen: !current.menuOpen }));
    return;
  }

  const menuItem = target.closest('[data-menu-screen]');
  if (menuItem) {
    setState({ screen: menuItem.dataset.menuScreen, menuOpen: false });
    return;
  }

  const navItem = target.closest('[data-nav]');
  if (navItem) {
    setState({ screen: navItem.dataset.nav, menuOpen: false });
    return;
  }

  if (getState().menuOpen && !target.closest('#topbarMenu')) {
    setState({ menuOpen: false });
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && getState().menuOpen) setState({ menuOpen: false });
});
