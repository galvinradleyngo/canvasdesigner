const RESIZE_MESSAGE_TYPE = 'canvas-designer:embed-resize';
const DEFAULT_MIN_HEIGHT = 420;
const GLOBAL_KEY = '__canvasDesignerEmbedHost__';

(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const existing = window[GLOBAL_KEY];
  if (existing && existing.initialized) {
    if (typeof existing.scan === 'function') {
      existing.scan();
    }
    return;
  }

  const frames = new Map();

  const parseHeight = (value, fallback) => {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) {
      return Math.ceil(numeric);
    }
    return fallback;
  };

  const applyHeight = (frame, height, minHeight) => {
    if (!frame || !frame.style) {
      return;
    }
    const safeHeight = Math.max(parseHeight(height, minHeight), minHeight);
    frame.style.height = `${safeHeight}px`;
    frame.style.minHeight = `${minHeight}px`;
    frame.style.maxHeight = 'none';
    frame.style.overflow = 'hidden';
  };

  const registerFrame = (frame) => {
    if (!(frame instanceof HTMLIFrameElement)) {
      return;
    }

    if (frame.dataset.cdEmbedRegistered === 'true') {
      return;
    }

    const id = frame.dataset.cdEmbedId || frame.id || '';
    if (!id) {
      return;
    }

    const origin = frame.dataset.cdEmbedOrigin || '';
    const minHeight = Math.max(
      parseHeight(frame.dataset.cdEmbedMinHeight, DEFAULT_MIN_HEIGHT),
      DEFAULT_MIN_HEIGHT
    );

    frames.set(id, { frame, origin, minHeight });
    frame.dataset.cdEmbedRegistered = 'true';
    applyHeight(frame, minHeight, minHeight);
  };

  const scan = () => {
    const candidates = document.querySelectorAll(
      'iframe.cd-embed-frame[data-cd-embed-id]:not([data-cd-embed-registered="true"])'
    );
    candidates.forEach((frame) => registerFrame(frame));
  };

  const handleMessage = (event) => {
    const data = event?.data;
    if (!data || data.type !== RESIZE_MESSAGE_TYPE) {
      return;
    }

    const entry = frames.get(data.id);
    if (!entry) {
      return;
    }

    if (entry.origin && event.origin && entry.origin !== event.origin) {
      return;
    }

    applyHeight(entry.frame, data.height, entry.minHeight);
  };

  const host = {
    initialized: true,
    scan
  };

  window[GLOBAL_KEY] = host;

  if (typeof window.addEventListener === 'function') {
    window.addEventListener('message', handleMessage, false);
    window.addEventListener('load', () => scan());
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        scan();
      },
      { once: true }
    );
  } else {
    scan();
  }

  if (typeof MutationObserver === 'function') {
    const observer = new MutationObserver(() => scan());
    observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true
    });
  }
})();
