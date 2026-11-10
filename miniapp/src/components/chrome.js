import { icon } from './icons.js';

export function pageHeader({ eyebrow = '', title, description = '' }) {
  return '<header class="page-heading">' + (eyebrow ? '<div class="eyebrow">' + eyebrow + '</div>' : '') +
    '<h1>' + title + '</h1>' + (description ? '<p class="page-description">' + description + '</p>' : '') + '</header>';
}

const menuItems = [
  { id: 'excises', label: 'Акцизы', glyph: 'stamp' },
  { id: 'inventory', label: 'Инвентаризация', glyph: 'clipboard-list' },
  { id: 'calculator', label: 'Калькулятор', glyph: 'calculator' },
  { id: 'settings', label: 'Настройки', glyph: 'settings' }
];

const navItems = [
  { id: 'camera', label: 'Камера', glyph: 'camera' },
  { id: 'deadlines', label: 'Сроки', glyph: 'calendar-clock' },
  { id: 'history', label: 'История', glyph: 'history' },
  { id: 'gih', label: 'GIH', glyph: 'clipboard-check' }
];

export function renderTopbar(state = {}) {
  const menuOpen = state.menuOpen === true;
  return '<button type="button" class="topbar-menu-toggle' + (menuOpen ? ' is-active' : '') +
    '" data-menu-toggle aria-label="' + (menuOpen ? 'Закрыть меню' : 'Открыть меню') +
    '" aria-expanded="' + (menuOpen ? 'true' : 'false') + '" aria-controls="topbarMenu">' +
    icon(menuOpen ? 'x' : 'menu', 21) + '</button>' +
    '<div class="topbar-menu' + (menuOpen ? ' is-open' : '') +
    '" id="topbarMenu" role="menu" aria-hidden="' + (menuOpen ? 'false' : 'true') + '">' +
    '<div class="topbar-menu-heading">Ещё</div>' +
    menuItems.map(item => '<button type="button" class="topbar-menu-item" role="menuitem" data-menu-screen="extra-' +
      item.id + '"><span class="topbar-menu-item-icon">' + icon(item.glyph, 19) +
      '</span><span>' + item.label + '</span>' + icon('chevron-right', 16, 'topbar-menu-arrow') +
      '</button>').join('') + '</div>'
}

export function renderBottomNav(state = {}) {
  return navItems.map(item => {
    const selected = item.id === state.screen;
    return '<button type="button" class="nav-item' + (selected ? ' is-active' : '') +
      '" data-nav="' + item.id + '" aria-label="' + item.label +
      '" aria-current="' + (selected ? 'page' : 'false') + '"><span class="nav-icon">' +
      icon(item.glyph, 19) + '</span><span class="nav-label">' + item.label + '</span></button>';
  }).join('');
}
