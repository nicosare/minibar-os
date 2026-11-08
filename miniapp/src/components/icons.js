const paths = {
  brand: '<path d="M5 6.5 12 3l7 3.5v11L12 21l-7-3.5z"/><path d="m5 6.5 7 3.5 7-3.5M12 10v11"/>',
  today: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M7.5 3v4M16.5 3v4M3.5 9.5h17M8 13h3M8 16h6"/>',
  lists: '<path d="M9 5h11M9 12h11M9 19h11"/><path d="M4 5h.01M4 12h.01M4 19h.01"/>',
  camera: '<path d="M4 7.5h3l1.4-2h7.2l1.4 2h3A1.5 1.5 0 0 1 21.5 9v9a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 18V9A1.5 1.5 0 0 1 4 7.5Z"/><circle cx="12" cy="13.5" r="3.5"/>',
  rooms: '<path d="M4 20V5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5V20M2.5 20h19M9 20v-5h6v5M8 8h2M14 8h2M8 11h2M14 11h2"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  check: '<path d="m5 12 4.5 4.5L19 7"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M7.5 3v4M16.5 3v4M3.5 9.5h17"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  package: '<path d="m12 3 8.5 4.5v9L12 21l-8.5-4.5v-9z"/><path d="m3.5 7.5 8.5 4.5 8.5-4.5M12 12v9"/>',
  history: '<path d="M3.5 11a8.5 8.5 0 1 1 2.2 6.3"/><path d="M3 4.5v6h6M12 7v5l3 2"/>',
  tag: '<path d="M20 13 13 20l-9-9V4h7z"/><circle cx="8" cy="8" r="1"/>',
  box: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="m3.5 7.5 8.5 4.5 8.5-4.5M12 12v9"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.1 1.9-1.8 3.1-2.2-.5-.2-.1-2 .8-.1.2-.8 2.1h-3.6l-.8-2.1-.1-.2-2-.8-.2.1-2.2.5-1.8-3.1 1.1-1.9.1-.1-.2-2.1-.1-.2-1.8-1.5 1.8-3.1 2.2.5.2.1 2-.8.1-.2.8-2.1h3.6l.8 2.1.1.2 2 .8.2-.1 2.2-.5 1.8 3.1-1.1 1.9-.1.1z"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
  clipboard: '<rect x="5" y="4.5" width="14" height="17" rx="2"/><path d="M9 4.5v-1h6v1M8.5 10h7M8.5 14h7M8.5 18h4"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.5-3"/>'
};
export function icon(name, size = 20, className = '') {
  return '<svg class="icon ' + className + '" width="' + size + '" height="' + size +
    '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    (paths[name] || paths.box) + '</svg>';
}
