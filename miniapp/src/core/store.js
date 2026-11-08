const initialState = {
  screen: 'today',
  listType: 'arrivals',
  moreItem: null,
  listData: { arrivals: null, departures: null },
  listLoading: { arrivals: false, departures: false },
  listErrors: { arrivals: '', departures: '' },
  listBusy: {},
  listNotice: null,
  listUi: {
    showCompleted: false,
    sort: 'asc',
    settingsOpen: false,
    details: { roomStatus: true, products: true, roomMeta: false }
  }
};
let state = { ...initialState };
const subscribers = new Set();

export function getState() { return state; }
export function setState(patch) {
  const next = typeof patch === 'function' ? patch(state) : patch;
  if (!next || typeof next !== 'object') return state;
  state = { ...state, ...next };
  subscribers.forEach(listener => listener(state));
  return state;
}
export function subscribe(listener) {
  if (typeof listener !== 'function') throw new TypeError('Store subscriber must be a function');
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}
