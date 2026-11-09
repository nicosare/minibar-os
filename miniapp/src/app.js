import { getState, setState, subscribe } from './core/store.js';
import { initializeVkApp } from './core/vk.js';
import { renderTopbar, renderBottomNav } from './components/chrome.js';
import { renderIcons } from './components/icons.js';
import { renderToday } from './screens/today.js';
import { renderLists, initializeLists, loadList, handleListClick, handleListChange } from './screens/lists.js';
import { renderCamera, cameraDidRender, cameraWillUnmount } from './screens/camera.js';
import { renderRooms, roomsDidRender, roomsWillUnmount, handleRoomsClick, handleRoomsInput, handleRoomsChange } from './screens/rooms.js';
import { renderMore } from './screens/more.js';
import { gihDidRender, gihWillUnmount, handleGihClick, handleGihInput, handleGihChange } from './screens/gih.js';

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
  const preserveExpanded = screen === renderedScreen &&
    (screen !== 'lists' || state.listType === renderedListType);
  const expandedRooms = preserveExpanded
    ? [...main.querySelectorAll('details.list-room-card[open]')].map(card => card.dataset.roomNumber)
    : [];
  if (renderedScreen === 'camera' && screen !== 'camera') cameraWillUnmount();
  if (renderedScreen === 'rooms' && screen !== 'rooms') roomsWillUnmount();
  if (renderedScreen === 'lists' && renderedListType === 'gih' && (screen !== 'lists' || state.listType !== 'gih')) gihWillUnmount();
  topbar.innerHTML = renderTopbar();
  main.innerHTML = renderers[screen](state);
  if (screen === 'camera') cameraDidRender();
  if (screen === 'rooms') roomsDidRender();
  if (screen === 'lists' && state.listType === 'gih') gihDidRender();
  bottomNav.innerHTML = renderBottomNav({ ...state, screen });
  renderIcons();
  document.documentElement.dataset.screen = screen;
  if (screen !== renderedScreen || (screen === 'lists' && state.listType !== renderedListType)) main.scrollTop = 0;
  else main.scrollTop = scrollTop;
  if (expandedRooms.length) {
    main.querySelectorAll('details.list-room-card[data-room-number]').forEach(card => {
      if (expandedRooms.includes(card.dataset.roomNumber)) card.open = true;
    });
  }
  renderedScreen = screen;
  renderedListType = state.listType;
}

initializeLists();
subscribe(render);

function resetSingleRoomCameraContext(screen) {
  const state = getState();
  if (screen !== 'camera' || state.cameraSourceListType !== 'room-single') return {};
  return {
    cameraSourceListType: state.listType === 'departures' ? 'departures' : 'arrivals',
    cameraSelectedRoomNumber: ''
  };
}

document.addEventListener('click', event => {
  if (handleGihClick(event)) return;
  if (handleListClick(event)) return;
  if (handleRoomsClick(event)) return;

  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  const nav = target.closest('[data-nav]');
  if (nav) {
    const screen = nav.dataset.nav;
    setState({ screen, moreItem: null, ...resetSingleRoomCameraContext(screen) });
    if (screen === 'lists') void loadList(getState().listType);
    return;
  }

  const open = target.closest('[data-open-screen]');
  if (open) {
    const screen = open.dataset.openScreen;
    setState({
      screen,
      moreItem: null,
      ...resetSingleRoomCameraContext(screen),
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
  handleRoomsChange(event);
  handleGihChange(event);
});
document.addEventListener('input', event => {
  if (handleGihInput(event)) return;
  handleRoomsInput(event);
});

render();
void initializeVkApp();
