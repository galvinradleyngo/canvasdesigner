import { activities } from './activities/index.js';
import { escapeHtml, uid } from './utils.js';

const ensureTrailingSlash = (value) => (value.endsWith('/') ? value : `${value}/`);

const getConfiguredViewerBase = () => {
  if (typeof process !== 'undefined' && process.env) {
    const envOverride = process.env.CANVASDESIGNER_VIEWER_BASE_URL;
    if (typeof envOverride === 'string' && envOverride.trim()) {
      try {
        const url = new URL(envOverride.trim());
        return ensureTrailingSlash(url.toString());
      } catch (error) {
        console.warn('Invalid CANVASDESIGNER_VIEWER_BASE_URL environment value', error);
      }
    }
  }

  if (typeof window !== 'undefined') {
    const override = window.CANVASDESIGNER_VIEWER_BASE_URL;
    if (typeof override === 'string' && override.trim()) {
      try {
        const url = new URL(override.trim(), window.location?.href || undefined);
        return ensureTrailingSlash(url.toString());
      } catch (error) {
        console.warn('Invalid CANVASDESIGNER_VIEWER_BASE_URL override', error);
      }
    }
  }

  if (typeof document !== 'undefined') {
    const meta = document.querySelector('meta[name="canvasdesigner:viewer-base"]');
    const content = meta?.getAttribute('content');
    if (typeof content === 'string' && content.trim()) {
      try {
        const url = new URL(content.trim(), document.baseURI);
        return ensureTrailingSlash(url.toString());
      } catch (error) {
        console.warn('Invalid canvasdesigner:viewer-base meta tag', error);
      }
    }
  }

  try {
    const moduleUrl = new URL(import.meta.url);
    const base = new URL('../../', moduleUrl);
    if (base.protocol === 'http:' || base.protocol === 'https:') {
      return ensureTrailingSlash(base.toString());
    }
  } catch (error) {
    console.warn('Unable to derive viewer base from module URL', error);
  }

  if (typeof window !== 'undefined' && window.location) {
    const { protocol, origin, pathname } = window.location;
    if (protocol === 'http:' || protocol === 'https:') {
      const basePath = pathname.endsWith('/') ? pathname : pathname.replace(/[^/]*$/, '');
      return ensureTrailingSlash(`${origin}${basePath}`);
    }
  }

  throw new Error(
    'Canvas Designer viewer base URL could not be determined. Set window.CANVASDESIGNER_VIEWER_BASE_URL before loading the app.'
  );
};

const VIEWER_URL = new URL('docs/embed.html', getConfiguredViewerBase()).toString();

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

const createViewerUrlWithEmbedId = () => {
  const url = new URL(VIEWER_URL);
  // The embedId query parameter is how the viewer pairs postMessage payload
  // requests with the matching iframe instance, so it must remain in the URL
  // even though the activity data now travels in the hash segment.
  const embedId = uid('cd-embed');
  url.searchParams.set('embedId', embedId);
  return { url, embedId };
};

export const generateEmbed = ({ id, type, title, description, data }) => {
  const activity = activities[type];
  if (!activity) {
    throw new Error('Unknown activity type');
  }

  const safeTitle = sanitizeText(title);
  const safeDescription = sanitizeText(description, { maxLength: 1200 });
  const hasPersistentId = typeof id === 'string' && id.trim() !== '';
  const includeInlineContent = !hasPersistentId;

  const payload = {
    v: 1,
    ...(id ? { id } : {}),
    type,
    title: safeTitle,
    description: safeDescription,
    ...(includeInlineContent ? { content: data } : {})
  };

  const { url: viewerUrl, embedId } = createViewerUrlWithEmbedId();
  if (includeInlineContent) {
    const encoded = encodePayload(payload);
    viewerUrl.hash = encoded;
  } else if (hasPersistentId) {
    viewerUrl.searchParams.set('projectId', id);
  }

  const iframeTitle = escapeHtml(safeTitle || activity.label);

  return `<!-- Canvas Designer Studio embed: ${iframeTitle} -->
<iframe
  class="cd-embed-frame"
  title="${iframeTitle}"
  id="${embedId}"
  name="${embedId}"
  loading="lazy"
  referrerpolicy="no-referrer"
  sandbox="allow-scripts allow-same-origin"
  style="width: 100%; min-height: 420px; border: 0; border-radius: 12px; overflow: hidden; background-color: transparent;"
  src="${viewerUrl.toString()}"
></iframe>`;
};
