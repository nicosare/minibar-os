import { getState, setState, subscribe } from './core/store.js';
import { initializeVkApp } from './core/vk.js';
import { renderTopbar, renderBottomNav } from './components/chrome.js';
import { renderIcons } from './components/icons.js';
import { renderToday } from './screens/today.js';
import { renderLists } from './screens/lists.js';
import { renderCamera } from './screens/camera.js';
import { renderRooms } from './screens/rooms.js';
import { renderMore } from './screens/more.js';

const topbar = document.getElementById('appTopbar');
const main = document.getElementById('appMain');
const bottomNav = document.getElementById('bottomNav');
if (!topbar || !main || !bottomNav) throw new Error('Не найдена оболочка Minibar OS');

const renderers = { today: renderToday, lists: renderLists, camera: renderCamera, rooms: renderRooms, more: renderMore };
function render() {
  const state = getState();
  const screen = renderers[state.screen] ? state.screen : 'today';
  topbar.innerHTML = renderTopbar();
  main.innerHTML = renderers[screen](state);
  bottomNav.innerHTML = renderBottomNav({ ...state, screen });
  renderIcons();
  document.documentElement.dataset.screen = screen;
  main.scrollTop = 0;
}
subscribe(render);

document.addEventListener('click', event => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  const nav = target.closest('[data-nav]');
  if (nav) {
    setState({ screen: nav.dataset.nav, moreItem: null });
    return;
  }

  const open = target.closest('[data-open-screen]');
  if (open) {
    setState({
      screen: open.dataset.openScreen,
      moreItem: null,
      ...(open.dataset.listType ? { listType: open.dataset.listType } : {})
    });
    return;
  }

  const listTab = target.closest('[data-list-type]');
  if (listTab) {
    setState({ listType: listTab.dataset.listType });
    return;
  }

  const more = target.closest('[data-more-item]');
  if (more) {
    setState({ screen: 'more', moreItem: more.dataset.moreItem });
    return;
  }

  if (target.closest('[data-back-more]')) setState({ screen: 'more', moreItem: null });
});

render();
void initializeVkApp();
