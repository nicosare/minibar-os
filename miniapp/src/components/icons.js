export function icon(name, size = 20, className = '') {
  const classes = ['icon', className].filter(Boolean).join(' ');
  return '<i data-lucide="' + name + '" class="' + classes +
    '" width="' + size + '" height="' + size + '" aria-hidden="true"></i>';
}

export function renderIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}
