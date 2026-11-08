import { getState, setState, subscribe } from './core/store.js';
import { initializeVkApp } from './core/vk.js';
import { renderTopbar, renderBottomNav } from './components/chrome.js';
import { renderIcons } from './components/icons.js';
import { renderToday } from './screens/today.js';
import { renderLists, initializeLists, loadList, handleListClick, handleListChange } from './screens/lists.js';
import { renderCamera } from './screens/camera.js';
import { renderRooms } from './screens/rooms.js';
import { renderMore } from './screens/more.js';

const topbar = document.getElementById('appTopbar');
const main = document.getElementById('appMain');
const bottomNav = document.getElementById('bottomNav');
if (!topbar || !main || !bottomNav) throw new Error('Не найдена оболочка Minibar OS');

const renderers = { today: renderToday, lists: renderLists, camera: renderCamera, rooms: renderRooms, more: renderMore };
let renderedScreen = null;
let renderedListType = null;

function render() {
  const state = getState();
  const screen = renderers[state.screen] ? state.screen : 'today';
  const scrollTop = main.scrollTop;
  topbar.innerHTML = renderTopbar();
  main.innerHTML = renderers[screen](state);
  bottomNav.innerHTML = renderBottomNav({ ...state, screen });
  renderIcons();
  document.documentElement.dataset.screen = screen;
  if (screen !== renderedScreen || (screen === 'lists' && state.listType !== renderedListType)) main.scrollTop = 0;
  else main.scrollTop = scrollTop;
  renderedScreen = screen;
  renderedListType = state.listType;
}

initializeLists();
subscribe(render);

document.addEventListener('click', event => {
  if (handleListClick(event)) return;
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  const nav = target.closest('[data-nav]');
  if (nav) {
    const screen = nav.dataset.nav;
    setState({ screen, moreItem: null });
    if (screen === 'lists') void loadList(getState().listType);
    return;
  }

  const open = target.closest('[data-open-screen]');
  if (open) {
    const screen = open.dataset.openScreen;
    setState({
      screen,
      moreItem: null,
      ...(open.dataset.listType ? { listType: open.dataset.listType } : {})
    });
    if (screen === 'lists') void loadList(open.dataset.listType || getState().listType);
    return;
  }

  const more = target.closest('[data-more-item]');
  if (more) {
    setState({ screen: 'more', moreItem: more.dataset.moreItem });
    return;
  }

  if (target.closest('[data-back-more]')) setState({ screen: 'more', moreItem: null });
});

document.addEventListener('change', event => {
  handleListChange(event);
});

render();
void initializeVkApp();
