import { test } from 'node:test';
import assert from 'node:assert/strict';

class FakeElement {
  constructor() {
    this.style = {};
    this.children = [];
    this.lastElementChild = null;
    this.scrollHeight = 0;
    this.offsetHeight = 0;
  }

  append(child) {
    this.children.push(child);
    this.lastElementChild = child;
  }

  getBoundingClientRect() {
    return this.__rect || { height: this.scrollHeight || 0 };
  }
}

const configureEnvironment = () => {
  const documentElement = new FakeElement();
  const body = new FakeElement();

  const document = {
    documentElement,
    body,
    readyState: 'complete',
    addEventListener() {},
    removeEventListener() {},
    getElementById() {
      return null;
    },
    createElement() {
      return new FakeElement();
    },
    createDocumentFragment() {
      return {
        children: [],
        append() {}
      };
    },
    head: new FakeElement(),
    fonts: {
      addEventListener() {},
      removeEventListener() {},
      ready: Promise.resolve()
    }
  };

  const listeners = new Map();
  const window = {
    document,
    location: new URL('https://example.com/docs/embed.html'),
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    requestAnimationFrame: (callback) => {
      return globalThis.setTimeout(() => callback(Date.now()), 16);
    },
    cancelAnimationFrame: (id) => {
      globalThis.clearTimeout(id);
    },
    addEventListener(type, handler) {
      const entries = listeners.get(type) || [];
      entries.push(handler);
      listeners.set(type, entries);
    },
    removeEventListener(type, handler) {
      const entries = listeners.get(type) || [];
      listeners.set(
        type,
        entries.filter((entry) => entry !== handler)
      );
    },
    dispatchEvent(type) {
      const entries = listeners.get(type) || [];
      entries.forEach((handler) => handler());
    }
  };

  window.getComputedStyle = (element) => ({ marginBottom: '0px' });

  class StubMutationObserver {
    constructor() {}
    observe() {}
    disconnect() {}
  }

  class StubResizeObserver {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {}
    disconnect() {}
  }

  window.MutationObserver = StubMutationObserver;
  window.ResizeObserver = StubResizeObserver;

  document.defaultView = window;

  globalThis.window = window;
  globalThis.document = document;
  globalThis.Element = FakeElement;
  globalThis.HTMLElement = FakeElement;
  globalThis.Node = FakeElement;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  globalThis.MutationObserver = StubMutationObserver;
  globalThis.ResizeObserver = StubResizeObserver;
  globalThis.requestAnimationFrame = window.requestAnimationFrame;
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame;

  return { window, document };
};

globalThis.__CANVAS_DESIGNER_DISABLE_BOOTSTRAP__ = true;
configureEnvironment();
const viewerModule = await import('../assets/js/embedViewer.js');

const resetEnvironment = () => configureEnvironment();

test('applyFrameHeight enforces minimum height and notifies parent', { concurrency: false }, () => {
  const { window, document } = resetEnvironment();
  const { applyFrameHeight } = viewerModule;

  const messages = [];
  window.parent = {
    postMessage(message) {
      messages.push(message);
    }
  };
  window.frameElement = { style: {} };

  applyFrameHeight(300, { embedId: 'frame-1' });

  assert.equal(document.documentElement.style.height, '420px');
  assert.equal(document.body.style.height, '420px');
  assert.equal(window.frameElement.style.height, '420px');
  assert.deepEqual(messages, [
    {
      type: 'canvas-designer:embed-resize',
      id: 'frame-1',
      height: 420
    }
  ]);
});

test('setupAutoResize measures container content and margins', { concurrency: false }, async () => {
  const { window, document } = resetEnvironment();
  const { setupAutoResize } = viewerModule;

  const root = new FakeElement();
  const container = new FakeElement();
  const child = new FakeElement();

  root.scrollHeight = 300;
  root.offsetHeight = 300;
  root.lastElementChild = container;

  container.scrollHeight = 500;
  container.offsetHeight = 480;
  container.__rect = { height: 450 };
  container.lastElementChild = child;

  child.scrollHeight = 120;
  child.offsetHeight = 120;

  document.body.scrollHeight = 310;
  document.body.offsetHeight = 310;
  document.body.lastElementChild = container;

  document.documentElement.scrollHeight = 320;
  document.documentElement.offsetHeight = 320;

  const margins = new Map([
    [root, '12px'],
    [container, '24px'],
    [child, '8px']
  ]);

  window.getComputedStyle = (element) => ({ marginBottom: margins.get(element) || '0px' });
  globalThis.getComputedStyle = window.getComputedStyle;

  const appliedHeights = [];
  setupAutoResize(root, container, {
    embedId: 'embed-1',
    applyHeight: (value) => {
      appliedHeights.push(value);
    }
  });

  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(appliedHeights.length > 0, true);
  assert.equal(appliedHeights[0], 540);
});
