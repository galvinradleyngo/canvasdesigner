export const clone = (value) => JSON.parse(JSON.stringify(value));

let uidCounter = 0;
export const uid = (prefix = 'item') => `${prefix}-${Date.now().toString(36)}-${uidCounter++}`;

export const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const formatDate = (date) => {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

export const debounce = (fn, delay = 180) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};
