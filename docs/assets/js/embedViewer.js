import { activities } from './activities/index.js';

const VIEW_ROOT_ID = 'cd-embed-viewer-root';

const baseStyles = (containerId) => `
  #${containerId} {
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #0f172a;
    line-height: 1.5;
    display: grid;
    gap: 1rem;
  }
  #${containerId} *,
  #${containerId} *::before,
  #${containerId} *::after {
    box-sizing: border-box;
  }
  #${containerId} .cd-embed-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
  }
  #${containerId} .cd-embed-description {
    margin: 0;
    color: rgba(15, 23, 42, 0.7);
  }
`;

const sanitizeText = (value, { maxLength = 1200 } = {}) => {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
};

const decodeBase64Url = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);

  if (typeof TextDecoder !== 'undefined') {
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  let escaped = '';
  for (let index = 0; index < binary.length; index += 1) {
    const code = binary.charCodeAt(index);
    escaped += `%${(`00${code.toString(16)}`).slice(-2)}`;
  }
  return decodeURIComponent(escaped);
};

const parsePayload = () => {
  const params = new URLSearchParams(window.location.search);
  let raw = params.get('data');
  if (!raw && window.location.hash.length > 1) {
    raw = window.location.hash.slice(1);
  }
  if (!raw) {
    return null;
  }

  try {
    const text = decodeBase64Url(raw);
    const payload = JSON.parse(text);
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    return payload;
  } catch (error) {
    console.warn('Unable to parse embed payload', error);
    return null;
  }
};

const showMessage = (root, message) => {
  root.innerHTML = '';
  const notice = document.createElement('div');
  notice.className = 'cd-viewer-message';
  notice.setAttribute('role', 'alert');
  notice.textContent = message;
  root.append(notice);
};

const renderActivity = (root, payload) => {
  const type = typeof payload.type === 'string' ? payload.type.trim() : '';
  const activity = activities[type];

  if (!activity) {
    showMessage(root, 'This activity type is not supported.');
    return;
  }

  const content = payload.content && typeof payload.content === 'object' ? payload.content : {};
  const containerId = `cd-activity-${Date.now().toString(36)}`;
  const parts = activity.embedTemplate(content, containerId);

  const fragment = document.createDocumentFragment();

  const title = sanitizeText(payload.title, { maxLength: 200 });
  if (title) {
    const heading = document.createElement('h1');
    heading.className = 'cd-embed-title';
    heading.textContent = title;
    fragment.append(heading);
    document.title = `${title} • Canvas Designer Viewer`;
  }

  const description = sanitizeText(payload.description);
  if (description) {
    const desc = document.createElement('p');
    desc.className = 'cd-embed-description';
    desc.textContent = description;
    fragment.append(desc);
  }

  const container = document.createElement('div');
  container.id = containerId;
  container.className = `cd-embed cd-embed-${type}`;
  container.dataset.activity = type;
  container.innerHTML = parts.html;
  fragment.append(container);

  root.innerHTML = '';
  root.append(fragment);

  const style = document.createElement('style');
  style.textContent = `${baseStyles(containerId)}\n${parts.css}`;
  document.head.append(style);

  if (parts.js) {
    const script = document.createElement('script');
    script.textContent = parts.js;
    document.body.append(script);
  }
};

const bootstrap = () => {
  const root = document.getElementById(VIEW_ROOT_ID);
  if (!root) {
    console.warn('Viewer root element missing');
    return;
  }

  const payload = parsePayload();
  if (!payload) {
    showMessage(root, 'No activity data provided.');
    return;
  }

  const version = typeof payload.v === 'number' ? payload.v : 0;
  if (version !== 1) {
    showMessage(root, 'This activity was created with an incompatible version.');
    return;
  }

  renderActivity(root, payload);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
