const initialState = { screen: 'today', listType: 'arrivals', moreItem: null };
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
