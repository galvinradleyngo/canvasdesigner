import { activities } from './activities/index.js';
import { escapeHtml } from './utils.js';

const VIEWER_URL = 'https://galvinradleyngo.github.io/canvasdesigner/embed.html';

const sanitizeText = (value, { maxLength = 500 } = {}) => {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
};

const encodePayload = (payload) => {
  const json = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(json);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

export const generateEmbed = ({ type, title, description, data }) => {
  const activity = activities[type];
  if (!activity) {
    throw new Error('Unknown activity type');
  }

  const safeTitle = sanitizeText(title);
  const safeDescription = sanitizeText(description, { maxLength: 1200 });
  const payload = {
    v: 1,
    type,
    title: safeTitle,
    description: safeDescription,
    content: data
  };

  const encoded = encodePayload(payload);
  const viewerUrl = new URL(VIEWER_URL);
  viewerUrl.searchParams.set('data', encoded);

  const iframeTitle = escapeHtml(safeTitle || activity.label);

  return `<!-- Canvas Designer Studio embed: ${iframeTitle} -->
<iframe
  class="cd-embed-frame"
  title="${iframeTitle}"
  loading="lazy"
  referrerpolicy="no-referrer"
  sandbox="allow-scripts allow-same-origin"
  style="width: 100%; min-height: 420px; border: 0; border-radius: 12px; overflow: hidden;"
  src="${viewerUrl.toString()}"
></iframe>`;
};
