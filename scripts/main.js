const STORAGE_KEY = 'canvasdesigner-state';

const clone = (value) => JSON.parse(JSON.stringify(value));

const defaultState = {
  widgetType: 'flip-card',
  flipCard: {
    width: 320,
    height: 200,
    frontText: '',
    backText: '',
    frontColor: '#1b9aaa',
    backColor: '#ef767a',
    frontTextColor: '#ffffff',
    backTextColor: '#ffffff'
  },
  hotspot: {
    imageUrl: '',
    theme: 'light',
    hotspots: []
  }
};

let state = loadState();
let hotspotIdCounter = state.hotspot.hotspots.reduce((max, spot) => Math.max(max, spot.id || 0), 0);

const els = {
  widgetType: document.getElementById('widgetType'),
  flipCardControls: document.getElementById('flipCardControls'),
  hotspotControls: document.getElementById('hotspotControls'),
  previewCanvas: document.getElementById('previewCanvas'),
  embedCode: document.getElementById('embedCode'),
  refreshPreview: document.getElementById('refreshPreview'),
  saveDesign: document.getElementById('saveDesign'),
  newDesign: document.getElementById('newDesign'),
  copyEmbed: document.getElementById('copyEmbed'),
  toast: document.getElementById('toast'),
  hotspotList: document.getElementById('hotspotList'),
  hotspotRowTemplate: document.getElementById('hotspotRowTemplate'),
  addHotspot: document.getElementById('addHotspot')
};

const flipCardFields = {
  width: document.getElementById('flipCardWidth'),
  height: document.getElementById('flipCardHeight'),
  frontText: document.getElementById('flipFrontText'),
  backText: document.getElementById('flipBackText'),
  frontColor: document.getElementById('flipFrontColor'),
  backColor: document.getElementById('flipBackColor'),
  frontTextColor: document.getElementById('flipFrontTextColor'),
  backTextColor: document.getElementById('flipBackTextColor')
};

const hotspotFields = {
  imageUrl: document.getElementById('hotspotImageUrl'),
  theme: document.getElementById('hotspotTheme')
};

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return clone(defaultState);
    const parsed = JSON.parse(stored);
    const widgetType = ['flip-card', 'hotspot'].includes(parsed.widgetType)
      ? parsed.widgetType
      : defaultState.widgetType;

    return {
      widgetType,
      flipCard: { ...defaultState.flipCard, ...(parsed.flipCard || {}) },
      hotspot: {
        ...defaultState.hotspot,
        ...(parsed.hotspot || {}),
        theme: ['light', 'dark'].includes(parsed?.hotspot?.theme)
          ? parsed.hotspot.theme
          : defaultState.hotspot.theme,
        hotspots: Array.isArray(parsed?.hotspot?.hotspots)
          ? parsed.hotspot.hotspots.map((spot, index) => ({
              id: spot.id ?? index + 1,
              title: spot.title || '',
              description: spot.description || '',
              x: typeof spot.x === 'number' ? spot.x : 50,
              y: typeof spot.y === 'number' ? spot.y : 50
            }))
          : []
      }
    };
  } catch (err) {
    console.warn('Unable to load saved design, using defaults.', err);
    return clone(defaultState);
  }
}

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    showToast('Design saved in this browser.');
  } catch (err) {
    console.error('Unable to save design', err);
    showToast('Unable to save design (storage may be full).');
  }
}

function resetState() {
  state = clone(defaultState);
  hotspotIdCounter = 0;
  applyStateToControls();
  renderHotspotList();
  renderPreview();
  updateEmbedCode();
  showToast('Started a fresh design.');
}

function applyStateToControls() {
  els.widgetType.value = state.widgetType;

  Object.entries(flipCardFields).forEach(([key, input]) => {
    input.value = state.flipCard[key];
  });

  hotspotFields.imageUrl.value = state.hotspot.imageUrl;
  hotspotFields.theme.value = state.hotspot.theme;

  toggleControlGroups();
}

function toggleControlGroups() {
  const isFlipCard = state.widgetType === 'flip-card';
  els.flipCardControls.hidden = !isFlipCard;
  els.hotspotControls.hidden = isFlipCard;
}

function showToast(message) {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.classList.add('visible');
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    els.toast.classList.remove('visible');
  }, 3200);
}

function handleWidgetTypeChange() {
  state.widgetType = els.widgetType.value;
  toggleControlGroups();
  renderPreview();
  updateEmbedCode();
}

function bindFlipCardEvents() {
  Object.entries(flipCardFields).forEach(([key, input]) => {
    input.addEventListener('input', () => {
      const value = input.type === 'number' ? parseInt(input.value, 10) : input.value;
      state.flipCard[key] = Number.isNaN(value) ? state.flipCard[key] : value;
      if (input.type !== 'number') {
        state.flipCard[key] = input.value;
      }
      renderPreview();
      updateEmbedCode();
    });
  });
}

function bindHotspotEvents() {
  hotspotFields.imageUrl.addEventListener('change', () => {
    state.hotspot.imageUrl = hotspotFields.imageUrl.value.trim();
    renderPreview();
    updateEmbedCode();
  });

  hotspotFields.theme.addEventListener('change', () => {
    state.hotspot.theme = hotspotFields.theme.value;
    renderPreview();
    updateEmbedCode();
  });

  if (els.addHotspot) {
    els.addHotspot.addEventListener('click', () => {
      if (!state.hotspot.imageUrl) {
        showToast('Add an image URL before creating hotspots.');
        return;
      }
      addHotspot({ x: 50, y: 50 });
    });
  }
}

function renderHotspotList() {
  els.hotspotList.innerHTML = '';
  if (state.hotspot.hotspots.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No hotspots yet. Add one from the preview or with the button above.';
    els.hotspotList.appendChild(empty);
    return;
  }
  state.hotspot.hotspots.forEach((spot, index) => {
    const fragment = els.hotspotRowTemplate.content.cloneNode(true);
    const row = fragment.querySelector('.hotspot-row');
    row.dataset.id = spot.id;
    row.querySelector('.hotspot-index').textContent = index + 1;
    const titleInput = row.querySelector('.hotspot-title');
    const descriptionInput = row.querySelector('.hotspot-description');
    const xInput = row.querySelector('.hotspot-x');
    const yInput = row.querySelector('.hotspot-y');

    titleInput.value = spot.title;
    descriptionInput.value = spot.description;
    xInput.value = spot.x;
    yInput.value = spot.y;

    titleInput.addEventListener('input', () => updateHotspot(spot.id, { title: titleInput.value }));
    descriptionInput.addEventListener('input', () =>
      updateHotspot(spot.id, { description: descriptionInput.value })
    );
    xInput.addEventListener('input', () => updateHotspot(spot.id, { x: clampPercent(xInput.value) }));
    yInput.addEventListener('input', () => updateHotspot(spot.id, { y: clampPercent(yInput.value) }));
    row.querySelector('.remove-hotspot').addEventListener('click', () => removeHotspot(spot.id));

    els.hotspotList.appendChild(fragment);
  });
}

function clampPercent(value) {
  const number = typeof value === 'number' ? value : parseFloat(value);
  if (Number.isNaN(number)) return 0;
  return Math.min(100, Math.max(0, Math.round(number * 10) / 10));
}

function updateHotspot(id, updates) {
  const hotspot = state.hotspot.hotspots.find((spot) => spot.id === id);
  if (!hotspot) return;
  Object.assign(hotspot, updates);
  renderPreview();
  updateEmbedCode();
}

function removeHotspot(id) {
  state.hotspot.hotspots = state.hotspot.hotspots.filter((spot) => spot.id !== id);
  renderHotspotList();
  renderPreview();
  updateEmbedCode();
}

function addHotspotFromClick(event, mapEl) {
  const rect = mapEl.getBoundingClientRect();
  const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
  const yPercent = ((event.clientY - rect.top) / rect.height) * 100;
  addHotspot({
    x: Math.round(xPercent * 10) / 10,
    y: Math.round(yPercent * 10) / 10
  });
}

function addHotspot({ x, y }) {
  hotspotIdCounter += 1;
  const newHotspot = {
    id: hotspotIdCounter,
    title: `Hotspot ${state.hotspot.hotspots.length + 1}`,
    description: 'Describe this point...',
    x: typeof x === 'number' ? clampPercent(x) : 50,
    y: typeof y === 'number' ? clampPercent(y) : 50
  };
  state.hotspot.hotspots.push(newHotspot);
  renderHotspotList();
  renderPreview();
  updateEmbedCode();
  showToast('Added a hotspot. Update the details from the list.');
}

function renderPreview() {
  els.previewCanvas.innerHTML = '';

  if (state.widgetType === 'flip-card') {
    els.previewCanvas.appendChild(createFlipCardPreview(state.flipCard));
  } else if (state.widgetType === 'hotspot') {
    if (!state.hotspot.imageUrl) {
      const placeholder = document.createElement('div');
      placeholder.className = 'placeholder';
      placeholder.textContent = 'Paste an image URL to start placing hotspots.';
      els.previewCanvas.appendChild(placeholder);
      return;
    }
    const { element, mapEl } = createHotspotPreview(state.hotspot);
    els.previewCanvas.appendChild(element);
    mapEl.addEventListener('click', (event) => {
      if (event.target.closest('.canvasd-hotspot')) return;
      addHotspotFromClick(event, mapEl);
    });
  }
}

function createFlipCardPreview(config) {
  const wrapper = document.createElement('div');
  wrapper.className = 'flip-card-wrapper';
  const card = document.createElement('div');
  card.className = 'canvasd-flip-card';
  card.style.setProperty('--flip-width', `${config.width}px`);
  card.style.setProperty('--flip-height', `${config.height}px`);

  const inner = document.createElement('div');
  inner.className = 'canvasd-flip-card-inner';

  const front = document.createElement('div');
  front.className = 'canvasd-flip-face front';
  front.style.background = config.frontColor;
  front.style.color = config.frontTextColor;
  front.innerHTML = formatMultiline(escapeHTML(config.frontText || 'Front side content'));

  const back = document.createElement('div');
  back.className = 'canvasd-flip-face back';
  back.style.background = config.backColor;
  back.style.color = config.backTextColor;
  back.innerHTML = formatMultiline(escapeHTML(config.backText || 'Back side content'));

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'flip-toggle';
  toggle.textContent = 'Flip';

  inner.appendChild(front);
  inner.appendChild(back);
  card.appendChild(inner);
  card.appendChild(toggle);
  wrapper.appendChild(card);

  const toggleFlip = (event) => {
    event?.stopPropagation();
    card.classList.toggle('is-flipped');
  };

  card.addEventListener('click', toggleFlip);
  toggle.addEventListener('click', toggleFlip);

  return wrapper;
}

function createHotspotPreview(config) {
  const wrapper = document.createElement('div');
  wrapper.className = 'canvasd-hotspot-wrapper';

  const map = document.createElement('div');
  map.className = 'canvasd-hotspot-map';

  const img = document.createElement('img');
  img.src = config.imageUrl;
  img.alt = '';

  map.appendChild(img);

  config.hotspots.forEach((spot, index) => {
    map.appendChild(createHotspotElement(spot, index, config.theme));
  });

  wrapper.appendChild(map);

  return { element: wrapper, mapEl: map };
}

function createHotspotElement(spot, index, theme) {
  const hotspot = document.createElement('button');
  hotspot.type = 'button';
  hotspot.className = `canvasd-hotspot ${theme === 'dark' ? 'dark' : ''}`.trim();
  hotspot.style.left = `${spot.x}%`;
  hotspot.style.top = `${spot.y}%`;
  hotspot.setAttribute('aria-label', `${spot.title || `Hotspot ${index + 1}`}`);
  hotspot.title = spot.title || `Hotspot ${index + 1}`;
  hotspot.innerHTML = `<span>${index + 1}</span>`;

  const tooltip = document.createElement('div');
  tooltip.className = 'canvasd-hotspot-tooltip';
  tooltip.innerHTML = `
    <h4>${escapeHTML(spot.title || `Hotspot ${index + 1}`)}</h4>
    <p>${escapeHTML(spot.description || 'Add a description to explain this point.')}</p>
  `;

  hotspot.appendChild(tooltip);
  hotspot.addEventListener('click', (event) => {
    event.stopPropagation();
    hotspot.classList.toggle('is-active');
  });

  return hotspot;
}

function updateEmbedCode() {
  let code = '';
  if (state.widgetType === 'flip-card') {
    code = generateFlipCardEmbed(state.flipCard);
  } else if (state.widgetType === 'hotspot') {
    code = generateHotspotEmbed(state.hotspot);
  }
  els.embedCode.value = code.trim();
}

function generateFlipCardEmbed(config) {
  const id = `canvasd-flip-${Date.now()}`;
  const front = formatMultiline(escapeHTML(config.frontText || 'Front side content'));
  const back = formatMultiline(escapeHTML(config.backText || 'Back side content'));

  return `
<div id="${id}" class="canvasd-embed">
  <style>
    #${id} {
      display: inline-block;
      perspective: 1600px;
    }
    #${id} .canvasd-flip-card {
      position: relative;
      width: ${config.width}px;
      height: ${config.height}px;
    }
    #${id} .canvasd-flip-card-inner {
      position: relative;
      width: 100%;
      height: 100%;
      transition: transform 0.8s;
      transform-style: preserve-3d;
    }
    #${id} .canvasd-flip-card.is-flipped .canvasd-flip-card-inner {
      transform: rotateY(180deg);
    }
    #${id} .canvasd-flip-face {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 16px;
      backface-visibility: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      font-size: 1rem;
      line-height: 1.5;
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.35);
    }
    #${id} .canvasd-flip-face.back {
      transform: rotateY(180deg);
    }
    #${id} .flip-toggle {
      position: absolute;
      bottom: 1.25rem;
      right: 1.25rem;
      background: rgba(15, 23, 42, 0.65);
      color: #fff;
      border: none;
      border-radius: 999px;
      padding: 0.45rem 1rem;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
    }
  </style>
  <div class="canvasd-flip-card">
    <div class="canvasd-flip-card-inner">
      <div class="canvasd-flip-face front" style="background: ${config.frontColor}; color: ${config.frontTextColor};">
        ${front}
      </div>
      <div class="canvasd-flip-face back" style="background: ${config.backColor}; color: ${config.backTextColor};">
        ${back}
      </div>
    </div>
    <button type="button" class="flip-toggle">Flip</button>
  </div>
  <script>
    (function() {
      const root = document.getElementById('${id}');
      if (!root) return;
      const card = root.querySelector('.canvasd-flip-card');
      const toggle = root.querySelector('.flip-toggle');
      const toggleFlip = function(event) {
        event?.stopPropagation();
        card.classList.toggle('is-flipped');
      };
      card.addEventListener('click', toggleFlip);
      toggle.addEventListener('click', toggleFlip);
    })();
  </script>
</div>
`.trim();
}

function generateHotspotEmbed(config) {
  if (!config.imageUrl) {
    return '<!-- Add an image URL to generate hotspot embed code -->';
  }

  const id = `canvasd-hotspot-${Date.now()}`;
  const hotspotsHtml = config.hotspots
    .map((spot, index) => {
      const title = escapeHTML(spot.title || `Hotspot ${index + 1}`);
      const description = escapeHTML(spot.description || 'Describe this point.');
      return `
      <button type="button" class="canvasd-hotspot ${config.theme === 'dark' ? 'dark' : ''}" style="left: ${spot.x}%; top: ${spot.y}%;" aria-label="${title}" title="${title}">
        <span>${index + 1}</span>
        <div class="canvasd-hotspot-tooltip">
          <h4>${title}</h4>
          <p>${description}</p>
        </div>
      </button>`;
    })
    .join('');

  return `
<div id="${id}" class="canvasd-embed">
  <style>
    #${id} {
      display: inline-block;
      position: relative;
      max-width: 100%;
      font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    }
    #${id} .canvasd-hotspot-map {
      position: relative;
      border-radius: 16px;
      overflow: hidden;
    }
    #${id} img {
      display: block;
      width: 100%;
      height: auto;
    }
    #${id} .canvasd-hotspot {
      position: absolute;
      width: 32px;
      height: 32px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      transform: translate(-50%, -50%);
      border: 2px solid rgba(255, 255, 255, 0.8);
      background: linear-gradient(135deg, rgba(37, 99, 235, 0.95), rgba(59, 130, 246, 0.95));
      color: white;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.45);
      transition: transform 0.2s ease;
    }
    #${id} .canvasd-hotspot.dark {
      background: linear-gradient(135deg, rgba(30, 64, 175, 0.9), rgba(79, 70, 229, 0.95));
      border-color: rgba(15, 23, 42, 0.6);
    }
    #${id} .canvasd-hotspot:hover {
      transform: translate(-50%, -50%) scale(1.05);
    }
    #${id} .canvasd-hotspot-tooltip {
      position: absolute;
      min-width: 200px;
      max-width: 260px;
      background: rgba(15, 23, 42, 0.92);
      color: rgba(226, 232, 240, 0.95);
      border-radius: 12px;
      padding: 1rem;
      border: 1px solid rgba(148, 163, 184, 0.35);
      box-shadow: 0 22px 40px rgba(15, 23, 42, 0.45);
      transform: translate(-50%, calc(-100% - 22px));
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
      z-index: 5;
    }
    #${id} .canvasd-hotspot.is-active .canvasd-hotspot-tooltip,
    #${id} .canvasd-hotspot:hover .canvasd-hotspot-tooltip {
      opacity: 1;
    }
    #${id} .canvasd-hotspot-tooltip::after {
      content: '';
      position: absolute;
      width: 12px;
      height: 12px;
      background: inherit;
      border-left: inherit;
      border-bottom: inherit;
      bottom: -6px;
      left: 50%;
      transform: translateX(-50%) rotate(45deg);
    }
  </style>
  <div class="canvasd-hotspot-map">
    <img src="${escapeAttribute(config.imageUrl)}" alt="Hotspot map" />
    ${hotspotsHtml}
  </div>
  <script>
    (function() {
      const root = document.getElementById('${id}');
      if (!root) return;
      const hotspots = Array.from(root.querySelectorAll('.canvasd-hotspot'));
      hotspots.forEach((spot) => {
        spot.addEventListener('click', function(event) {
          event.stopPropagation();
          const alreadyActive = spot.classList.contains('is-active');
          hotspots.forEach((other) => other.classList.remove('is-active'));
          if (!alreadyActive) {
            spot.classList.add('is-active');
          }
        });
      });
      document.addEventListener('click', function(event) {
        if (!root.contains(event.target)) {
          hotspots.forEach((spot) => spot.classList.remove('is-active'));
        }
      });
    })();
  </script>
</div>
`.trim();
}

function formatMultiline(text) {
  if (!text) return '';
  return text
    .split('\n')
    .map((line) => `<p>${line || '&nbsp;'}</p>`)
    .join('');
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function bindGlobalActions() {
  els.refreshPreview.addEventListener('click', renderPreview);
  els.saveDesign.addEventListener('click', persistState);
  els.newDesign.addEventListener('click', () => {
    if (confirm('Start a new design? Unsaved changes will be lost.')) {
      resetState();
    }
  });

  els.copyEmbed.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(els.embedCode.value);
      showToast('Embed code copied to clipboard.');
    } catch (err) {
      console.error('Clipboard copy failed', err);
      showToast('Select the embed code and copy it manually (Ctrl/Cmd+C).');
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 's' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      persistState();
    }
  });
}

function initialize() {
  applyStateToControls();
  bindFlipCardEvents();
  bindHotspotEvents();
  bindGlobalActions();
  renderHotspotList();
  renderPreview();
  updateEmbedCode();

  els.widgetType.addEventListener('change', handleWidgetTypeChange);
}

initialize();
