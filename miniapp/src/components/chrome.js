import { icon } from './icons.js';

export function pageHeader({ eyebrow = '', title, description = '' }) {
  return '<header class="page-heading">' + (eyebrow ? '<div class="eyebrow">' + eyebrow + '</div>' : '') +
    '<h1>' + title + '</h1>' + (description ? '<p class="page-description">' + description + '</p>' : '') + '</header>';
}

export function renderTopbar() {
  return '<div class="topbar-brand"><span class="brand-mark">' + icon('box', 20) +
    '</span><span class="brand-name">MINIBAR <strong>OS</strong></span></div>';
}

const navItems = [
  { id: 'today', label: 'Сегодня', glyph: 'layout-dashboard' },
  { id: 'lists', label: 'Списки', glyph: 'list' },
  { id: 'camera', label: 'Камера', glyph: 'camera' },
  { id: 'rooms', label: 'Номера', glyph: 'door-open' },
  { id: 'more', label: 'Ещё', glyph: 'more-horizontal' }
];

export function renderBottomNav(state) {
  const active = state.screen === 'more-detail' ? 'more' : state.screen;
  return navItems.map(item => {
    const selected = item.id === active;
    return '<button type="button" class="nav-item' + (selected ? ' is-active' : '') +
      '" data-nav="' + item.id + '" aria-label="' + item.label +
      '" aria-current="' + (selected ? 'page' : 'false') + '"><span class="nav-icon">' +
      icon(item.glyph, 19) + '</span><span class="nav-label">' + item.label + '</span></button>';
  }).join('');
}
