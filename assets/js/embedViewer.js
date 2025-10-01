import { activities } from './activities/index.js';

const VIEW_ROOT_ID = 'cd-embed-viewer-root';
const REQUEST_MESSAGE_TYPE = 'canvas-designer:request-payload';
const DELIVER_MESSAGE_TYPE = 'canvas-designer:deliver-payload';
const RESIZE_MESSAGE_TYPE = 'canvas-designer:embed-resize';
const PARENT_RESPONSE_TIMEOUT = 8000;
const DEFAULT_MIN_HEIGHT = 420;

const FIRESTORE_PROJECT_ID = 'tdt-sandbox';
const FIRESTORE_COLLECTION = 'canvasDesignerActivities';
const FIRESTORE_API_KEY = 'AIzaSyBLj8Ql3rEOLmIiVW6IDa8uJNGFLNbhA6U';
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents/${FIRESTORE_COLLECTION}`;

const baseStyles = (containerId) => `
  #${containerId} {
    --cd-font-family: 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
    --cd-font-size-base: 14px;
    --cd-text-color: #1f2937;
    --cd-text-muted: #4b5563;
    font-family: var(--cd-font-family);
    font-size: var(--cd-font-size-base);
    color: var(--cd-text-color);
    line-height: 1.5;
    display: grid;
    gap: 1.25rem;
    background: transparent;
  }
  #${containerId} *,
  #${containerId} *::before,
  #${containerId} *::after {
    box-sizing: border-box;
    font-family: inherit;
  }
  #${containerId} .cd-embed-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
    color: #111827;
  }
  #${containerId} .cd-embed-description {
    margin: 0;
    font-size: 1rem;
    line-height: 1.6;
    color: var(--cd-text-muted);
  }
  #${containerId} .cd-embed-description + .cd-embed,
  #${containerId} .cd-embed-title + .cd-embed {
    margin-top: 0.5rem;
  }
  #${containerId} .cd-embed {
    background: transparent;
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

const parseInlinePayload = () => {
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
    console.warn('Unable to parse inline embed payload', error);
    return null;
  }
};

const requestPayloadFromParent = (embedId) =>
  new Promise((resolve, reject) => {
    if (!embedId || window.parent === window || !window.parent) {
      reject(new Error('No parent window available for payload request.'));
      return;
    }

    const handleMessage = (event) => {
      const message = event?.data;
      if (!message || message.type !== DELIVER_MESSAGE_TYPE || message.id !== embedId) {
        return;
      }

      window.removeEventListener('message', handleMessage);
      clearTimeout(timeoutId);
      resolve(message.payload);
    };

    const timeoutId = setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      reject(new Error('Timed out waiting for parent payload.'));
    }, PARENT_RESPONSE_TIMEOUT);

    window.addEventListener('message', handleMessage);

    try {
      window.parent.postMessage({ type: REQUEST_MESSAGE_TYPE, id: embedId }, '*');
    } catch (error) {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeoutId);
      reject(error);
    }
  });

const decodeFirestoreValue = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return Boolean(value.booleanValue);
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) {
    const { values } = value.arrayValue || {};
    if (!Array.isArray(values)) return [];
    return values.map((entry) => decodeFirestoreValue(entry));
  }
  if ('mapValue' in value) {
    const fields = value.mapValue?.fields || {};
    return Object.fromEntries(Object.entries(fields).map(([key, entry]) => [key, decodeFirestoreValue(entry)]));
  }
  if ('bytesValue' in value) return value.bytesValue;
  if ('referenceValue' in value) return value.referenceValue;
  if ('geoPointValue' in value) return value.geoPointValue;
  return null;
};

const fetchProjectDocument = async (projectId) => {
  if (!projectId) {
    return null;
  }

  const url = `${FIRESTORE_BASE_URL}/${encodeURIComponent(projectId)}?key=${FIRESTORE_API_KEY}`;

  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`Firestore responded with ${response.status}`);
    }
    const document = await response.json();
    const fields = document?.fields;
    if (!fields) {
      return null;
    }
    return {
      v: 1,
      id: projectId,
      title: decodeFirestoreValue(fields.title),
      description: decodeFirestoreValue(fields.description),
      type: decodeFirestoreValue(fields.type),
      content: decodeFirestoreValue(fields.data),
      updatedAt: decodeFirestoreValue(fields.updatedAt)
    };
  } catch (error) {
    console.warn('Unable to fetch project data from Firestore', error);
    return null;
  }
};

const resolvePayload = async () => {
  const inline = parseInlinePayload();
  if (inline && typeof inline === 'object') {
    return inline;
  }

  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('projectId');
  if (projectId) {
    const project = await fetchProjectDocument(projectId);
    if (project) {
      return project;
    }
  }
  const embedId = params.get('embedId');

  if (embedId) {
    try {
      const parentPayload = await requestPayloadFromParent(embedId);
      if (parentPayload && typeof parentPayload === 'object') {
        return parentPayload;
      }
    } catch (error) {
      console.warn('Unable to retrieve payload from parent context', error);
    }
  }

  return null;
};

const hydratePayload = async (payload) => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const version = typeof payload.v === 'number' ? payload.v : 0;
  if (version !== 1) {
    return { error: 'This activity was created with an incompatible version.' };
  }

  if (payload.id) {
    const latest = await fetchProjectDocument(payload.id);
    if (latest) {
      return {
        v: 1,
        id: latest.id,
        type: latest.type || payload.type,
        title: latest.title ?? payload.title,
        description: latest.description ?? payload.description,
        content: latest.content ?? payload.content,
        updatedAt: latest.updatedAt || payload.updatedAt || null
      };
    }
  }

  return payload;
};

const showMessage = (root, message) => {
  root.innerHTML = '';
  const notice = document.createElement('div');
  notice.className = 'cd-viewer-message';
  notice.setAttribute('role', 'alert');
  notice.textContent = message;
  root.append(notice);
};

const applyFrameHeight = (height, { embedId } = {}) => {
  if (!Number.isFinite(height)) {
    return;
  }

  const targetHeight = Math.max(Math.ceil(height), DEFAULT_MIN_HEIGHT);

  const doc = document.documentElement;
  if (doc) {
    doc.style.height = `${targetHeight}px`;
    doc.style.minHeight = `${targetHeight}px`;
    doc.style.maxHeight = 'none';
    doc.style.overflow = 'hidden';
  }

  if (document.body) {
    document.body.style.height = `${targetHeight}px`;
    document.body.style.minHeight = `${targetHeight}px`;
    document.body.style.maxHeight = 'none';
    document.body.style.overflow = 'hidden';
  }

  try {
    const frame = window.frameElement;
    if (frame && frame.style) {
      frame.style.height = `${targetHeight}px`;
      frame.style.minHeight = `${targetHeight}px`;
      frame.style.maxHeight = 'none';
      frame.style.overflow = 'hidden';
    }
  } catch (error) {
    // Ignore cross-origin restrictions when we can't reach the frame element.
  }

  if (embedId && window.parent && window.parent !== window) {
    try {
      window.parent.postMessage(
        {
          type: RESIZE_MESSAGE_TYPE,
          id: embedId,
          height: targetHeight
        },
        '*'
      );
    } catch (error) {
      // Ignore postMessage failures in restrictive parent contexts.
    }
  }
};

const setupAutoResize = (root, container, { embedId, applyHeight = applyFrameHeight } = {}) => {
  if (!root) {
    return;
  }

  const containerEl = container instanceof Element ? container : null;
  let lastHeight = 0;

  const getBottomMargin = (element) => {
    if (!(element instanceof Element)) {
      return 0;
    }
    try {
      const style = window.getComputedStyle(element);
      if (!style) {
        return 0;
      }
      const margin = parseFloat(style.marginBottom);
      return Number.isFinite(margin) ? margin : 0;
    } catch (error) {
      return 0;
    }
  };

  const measure = () => {
    const body = document.body;
    const doc = document.documentElement;
    const containerRect = containerEl ? containerEl.getBoundingClientRect() : null;

    const measured = Math.max(
      containerRect ? containerRect.height : 0,
      containerEl?.scrollHeight || 0,
      containerEl?.offsetHeight || 0,
      root.scrollHeight || 0,
      root.offsetHeight || 0,
      body?.scrollHeight || 0,
      body?.offsetHeight || 0,
      doc?.scrollHeight || 0,
      doc?.offsetHeight || 0
    );

    if (!Number.isFinite(measured)) {
      return;
    }

    const marginAdjustments = Math.max(
      getBottomMargin(root),
      getBottomMargin(containerEl),
      getBottomMargin(root?.lastElementChild || null),
      getBottomMargin(containerEl?.lastElementChild || null)
    );

    const adjustedHeight = measured + marginAdjustments;

    if (!Number.isFinite(adjustedHeight)) {
      return;
    }

    const nextHeight = Math.max(Math.ceil(adjustedHeight + 16), DEFAULT_MIN_HEIGHT);

    if (Math.abs(nextHeight - lastHeight) <= 1) {
      return;
    }

    lastHeight = nextHeight;
    applyHeight(nextHeight, { embedId });
  };

  measure();

  const cleanupFns = [];

  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(() => measure());
    observer.observe(root);
    if (containerEl && containerEl !== root) {
      observer.observe(containerEl);
    }
    cleanupFns.push(() => observer.disconnect());
  } else {
    let rafId = null;
    const poll = () => {
      measure();
      rafId = window.requestAnimationFrame(poll);
    };
    poll();

    cleanupFns.push(() => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    });
  }

  if (typeof MutationObserver === 'function') {
    const mutationObserver = new MutationObserver(() => measure());
    mutationObserver.observe(root, { childList: true, subtree: true, attributes: true, characterData: true });
    if (containerEl && containerEl !== root) {
      mutationObserver.observe(containerEl, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      });
    }
    cleanupFns.push(() => mutationObserver.disconnect());
  }

  const handleLoad = () => measure();
  const handleResize = () => measure();
  window.addEventListener('load', handleLoad);
  window.addEventListener('resize', handleResize);
  cleanupFns.push(() => {
    window.removeEventListener('load', handleLoad);
    window.removeEventListener('resize', handleResize);
  });

  if (document.fonts) {
    const handleFontLoad = () => measure();
    if (typeof document.fonts.addEventListener === 'function') {
      document.fonts.addEventListener('loadingdone', handleFontLoad);
      cleanupFns.push(() => document.fonts.removeEventListener('loadingdone', handleFontLoad));
    } else if (typeof document.fonts.ready?.then === 'function') {
      document.fonts.ready.then(() => measure()).catch(() => {});
    }
  }

  const settleTimers = [
    window.setTimeout(measure, 250),
    window.setTimeout(measure, 1000),
    window.setTimeout(measure, 2500)
  ];
  cleanupFns.push(() => settleTimers.forEach((timer) => window.clearTimeout(timer)));

  const cleanup = () => {
    while (cleanupFns.length) {
      const fn = cleanupFns.shift();
      try {
        fn();
      } catch (error) {
        // Ignore cleanup failures.
      }
    }
  };

  window.addEventListener('pagehide', cleanup, { once: true });
};

const renderActivity = (root, payload, { embedId } = {}) => {
  const type = typeof payload.type === 'string' ? payload.type.trim() : '';
  const activity = activities[type];

  if (!activity) {
    showMessage(root, 'This activity type is not supported.');
    return;
  }

  const content = payload.content && typeof payload.content === 'object' ? payload.content : {};
  const containerId = `cd-activity-${Date.now().toString(36)}`;
  const parts = activity.embedTemplate(content, containerId, {
    payload,
    projectId: typeof payload.id === 'string' ? payload.id : null,
    type
  });

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
    const createScript = () => {
      const script = document.createElement('script');
      if (parts.module) {
        script.type = 'module';
      } else if ('async' in script) {
        script.async = false;
      }
      return script;
    };

    const appendInlineScript = () => {
      try {
        const script = createScript();
        script.textContent = parts.js;
        document.body.append(script);
        return true;
      } catch (error) {
        console.error('Failed to append activity script element', error);
        return false;
      }
    };

    const appendBlobScript = () => {
      if (typeof Blob !== 'function' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
        return appendInlineScript();
      }

      let blobUrl;
      const cleanupUrl = () => {
        if (!blobUrl) {
          return;
        }
        try {
          URL.revokeObjectURL(blobUrl);
        } catch (error) {
          // Ignore cleanup failures.
        }
        blobUrl = undefined;
      };

      try {
        const blob = new Blob([parts.js], { type: 'text/javascript' });
        blobUrl = URL.createObjectURL(blob);

        const script = createScript();
        script.src = blobUrl;

        script.addEventListener(
          'load',
          () => {
            cleanupUrl();
          },
          { once: true }
        );

        script.addEventListener(
          'error',
          (event) => {
            cleanupUrl();
            if (event?.type === 'error') {
              console.error('Failed to execute activity script from blob URL', event);
              if (!appendInlineScript()) {
                console.error('Failed to execute activity script payload');
              }
            }
          },
          { once: true }
        );

        document.body.append(script);
        return true;
      } catch (error) {
        cleanupUrl();
        console.error('Failed to append activity script from blob URL', error);
        return appendInlineScript();
      }
    };

    if (!appendBlobScript()) {
      console.error('Failed to execute activity script payload');
    }
  }

  setupAutoResize(root, container, { embedId });
};

const bootstrap = async () => {
  const root = document.getElementById(VIEW_ROOT_ID);
  if (!root) {
    console.warn('Viewer root element missing');
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const embedId = params.get('embedId');

  const basePayload = await resolvePayload();
  if (!basePayload) {
    showMessage(root, 'No activity data provided.');
    return;
  }

  const hydrated = await hydratePayload(basePayload);
  if (!hydrated || hydrated.error) {
    showMessage(root, hydrated?.error || 'Unable to load this activity.');
    return;
  }

  renderActivity(root, hydrated, { embedId });
};

const isBootstrapDisabled = () =>
  typeof globalThis !== 'undefined' && globalThis.__CANVAS_DESIGNER_DISABLE_BOOTSTRAP__ === true;

if (!isBootstrapDisabled() && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      bootstrap().catch((error) => {
        console.error('Failed to bootstrap Canvas Designer embed viewer', error);
      });
    });
  } else {
    bootstrap().catch((error) => {
      console.error('Failed to bootstrap Canvas Designer embed viewer', error);
    });
  }
}

export { applyFrameHeight, setupAutoResize };
