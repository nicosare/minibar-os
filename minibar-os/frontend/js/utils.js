function pluralize(n, forms) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function waitForApi(maxAttempts = 30, intervalMs = 100) {
  return new Promise((resolve, reject) => {
    let attempt = 0;
    const check = () => {
      if (window.api) {
        resolve(window.api);
      } else if (attempt >= maxAttempts) {
        reject(new Error('API not available'));
      } else {
        attempt += 1;
        setTimeout(check, intervalMs);
      }
    };
    check();
  });
}

function showToast(message, durationMs = 2000) {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-4 right-4 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), durationMs);
}

function parseDbDate(iso) {
  const d = new Date(iso);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate()
  };
}

window.AppUtils = { pluralize, escapeHtml, waitForApi, showToast, parseDbDate };
