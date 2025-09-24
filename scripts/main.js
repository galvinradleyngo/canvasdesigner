const STORAGE_KEY = 'canvasdesigner-state';
const MAX_FLIP_CARDS = 8;

const clone = (value) => JSON.parse(JSON.stringify(value));

const defaultState = {
  widgetType: 'flip-card',
  flipCard: {
    width: 320,
    height: 200,
    frontColor: '#1b9aaa',
    backColor: '#ef767a',
    frontTextColor: '#ffffff',
    backTextColor: '#ffffff',
    cards: [
      {
        id: 1,
        frontText: '',
        backText: ''
      }
    ]
  },
  hotspot: {
    imageUrl: '',
    imageName: '',
    theme: 'light',
    hotspots: []
  }
};

let state = loadState();
let hotspotIdCounter = state.hotspot.hotspots.reduce((max, spot) => Math.max(max, spot.id || 0), 0);
let flipCardIdCounter = state.flipCard.cards.reduce((max, card) => Math.max(max, card.id || 0), 0);
let editingHotspotId = null;
let currentHotspotMap = null;
let currentHotspotEditorPanel = null;

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
  embedSection: document.getElementById('embedSection'),
  toggleEmbed: document.getElementById('toggleEmbed'),
  toast: document.getElementById('toast'),
  hotspotList: document.getElementById('hotspotList'),
  hotspotRowTemplate: document.getElementById('hotspotRowTemplate'),
  hotspotImageInfo: document.getElementById('hotspotImageInfo'),
  addHotspot: document.getElementById('addHotspot')
};

const flipCardFields = {
  width: document.getElementById('flipCardWidth'),
  height: document.getElementById('flipCardHeight'),
  frontColor: document.getElementById('flipFrontColor'),
  backColor: document.getElementById('flipBackColor'),
  frontTextColor: document.getElementById('flipFrontTextColor'),
  backTextColor: document.getElementById('flipBackTextColor')
};

const flipCardElements = {
  cardsList: document.getElementById('flipCardCardsList'),
  cardTemplate: document.getElementById('flipCardCardTemplate'),
  addCard: document.getElementById('addFlipCard')
};

const hotspotFields = {
  imageUrl: document.getElementById('hotspotImageUrl'),
  imageUpload: document.getElementById('hotspotImageUpload'),
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

    const flipCardSource = parsed.flipCard || {};
    const parsedCards = Array.isArray(flipCardSource.cards)
      ? flipCardSource.cards
      : [
          {
            id: 1,
            frontText: flipCardSource.frontText || '',
            backText: flipCardSource.backText || ''
          }
        ];

    const cards = parsedCards
      .map((card, index) => ({
        id: card.id ?? index + 1,
        frontText: card.frontText || '',
        backText: card.backText || ''
      }))
      .slice(0, MAX_FLIP_CARDS);

    if (cards.length === 0) {
      cards.push({ id: 1, frontText: '', backText: '' });
    }

    const { frontText, backText, cards: _unusedCards, ...flipCardRest } = flipCardSource;

    const hotspotSource = parsed.hotspot || {};
    const hotspots = Array.isArray(hotspotSource.hotspots)
      ? hotspotSource.hotspots.map((spot, index) => ({
          id: spot.id ?? index + 1,
          title: spot.title || '',
          description: spot.description || '',
          x: typeof spot.x === 'number' ? spot.x : 50,
          y: typeof spot.y === 'number' ? spot.y : 50
        }))
      : [];

    return {
      widgetType,
      flipCard: {
        ...defaultState.flipCard,
        ...flipCardRest,
        cards
      },
      hotspot: {
        ...defaultState.hotspot,
        ...hotspotSource,
        imageName: hotspotSource.imageName || '',
        theme: ['light', 'dark'].includes(hotspotSource.theme)
          ? hotspotSource.theme
          : defaultState.hotspot.theme,
        hotspots
      }
    };
  } catch (err) {
    console.warn('Unable to load saved design, using defaults.', err);
    return clone(defaultState);
  }
}

function syncEditingHotspot() {
  if (!state.hotspot.hotspots.length) {
    editingHotspotId = null;
    return;
  }
  if (!editingHotspotId || !state.hotspot.hotspots.some((spot) => spot.id === editingHotspotId)) {
    editingHotspotId = state.hotspot.hotspots[0].id;
  }
}

function updateHotspotImageInfo() {
  if (!els.hotspotImageInfo) return;
  if (!state.hotspot.imageUrl) {
    els.hotspotImageInfo.textContent = '';
    return;
  }
  if (state.hotspot.imageName) {
    els.hotspotImageInfo.textContent = `Using uploaded image: ${state.hotspot.imageName}`;
  } else {
    els.hotspotImageInfo.textContent = 'Using linked image from the URL above.';
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
  flipCardIdCounter = state.flipCard.cards.reduce((max, card) => Math.max(max, card.id || 0), 0);
  editingHotspotId = null;
  currentHotspotMap = null;
  currentHotspotEditorPanel = null;
  if (els.embedSection) {
    els.embedSection.setAttribute('hidden', '');
  }
  if (els.toggleEmbed) {
    els.toggleEmbed.textContent = 'Show embed code';
    els.toggleEmbed.setAttribute('aria-expanded', 'false');
  }
  applyStateToControls();
  renderHotspotList();
  renderPreview();
  updateEmbedCode();
  showToast('Started a fresh design.');
}

function applyStateToControls() {
  els.widgetType.value = state.widgetType;

  Object.entries(flipCardFields).forEach(([key, input]) => {
    if (!input) return;
    input.value = state.flipCard[key];
  });

  if (hotspotFields.imageUrl) {
    hotspotFields.imageUrl.value = state.hotspot.imageName ? '' : state.hotspot.imageUrl;
  }
  if (hotspotFields.imageUpload) {
    hotspotFields.imageUpload.value = '';
  }
  hotspotFields.theme.value = state.hotspot.theme;

  updateHotspotImageInfo();

  toggleControlGroups();
  renderFlipCardList();
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
    if (!input) return;
    input.addEventListener('input', () => {
      if (input.type === 'number') {
        const value = parseInt(input.value, 10);
        if (!Number.isNaN(value)) {
          state.flipCard[key] = value;
        }
      } else {
        state.flipCard[key] = input.value;
      }
      renderPreview();
      updateEmbedCode();
    });
  });

  if (flipCardElements.addCard) {
    flipCardElements.addCard.addEventListener('click', () => addFlipCard());
  }
}

function bindHotspotEvents() {
  if (hotspotFields.imageUrl) {
    hotspotFields.imageUrl.addEventListener('change', () => {
      const url = hotspotFields.imageUrl.value.trim();
      state.hotspot.imageUrl = url;
      state.hotspot.imageName = '';
      updateHotspotImageInfo();
      renderPreview();
      updateEmbedCode();
    });
  }

  if (hotspotFields.imageUpload) {
    hotspotFields.imageUpload.addEventListener('change', () => {
      const [file] = hotspotFields.imageUpload.files || [];
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        state.hotspot.imageUrl = typeof reader.result === 'string' ? reader.result : '';
        state.hotspot.imageName = file.name || '';
        if (hotspotFields.imageUrl) {
          hotspotFields.imageUrl.value = '';
        }
        hotspotFields.imageUpload.value = '';
        updateHotspotImageInfo();
        renderPreview();
        updateEmbedCode();
      });
      reader.addEventListener('error', () => {
        console.error('Unable to read uploaded image.');
        showToast('Could not read that image. Try a different file.');
      });
      reader.readAsDataURL(file);
    });
  }

  hotspotFields.theme.addEventListener('change', () => {
    state.hotspot.theme = hotspotFields.theme.value;
    renderPreview();
    updateEmbedCode();
  });

  if (els.addHotspot) {
    els.addHotspot.addEventListener('click', () => {
      if (!state.hotspot.imageUrl) {
        showToast('Upload or link an image before creating hotspots.');
        return;
      }
      addHotspot({ x: 50, y: 50 });
    });
  }
}

function renderHotspotList() {
  syncEditingHotspot();
  if (!els.hotspotList) return;
  const previousScrollTop = els.hotspotList.scrollTop;
  els.hotspotList.innerHTML = '';
  if (state.hotspot.hotspots.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No hotspots yet. Add one from the preview or with the button above.';
    els.hotspotList.appendChild(empty);
    els.hotspotList.scrollTop = previousScrollTop;
    return;
  }
  state.hotspot.hotspots.forEach((spot, index) => {
    const fragment = els.hotspotRowTemplate.content.cloneNode(true);
    const row = fragment.querySelector('.hotspot-row');
    row.dataset.id = spot.id;
    if (spot.id === editingHotspotId) {
      row.classList.add('is-active');
    }
    row.querySelector('.hotspot-index').textContent = index + 1;
    const titleInput = row.querySelector('.hotspot-title');
    const descriptionInput = row.querySelector('.hotspot-description');
    const xInput = row.querySelector('.hotspot-x');
    const yInput = row.querySelector('.hotspot-y');

    titleInput.value = spot.title;
    descriptionInput.value = spot.description;
    xInput.value = spot.x;
    yInput.value = spot.y;

    const liveUpdateOptions = () => ({
      refreshList: false,
      skipPreview: Boolean(currentHotspotMap),
      mapEl: currentHotspotMap,
      editorPanel: currentHotspotEditorPanel
    });

    titleInput.addEventListener('input', () => {
      editingHotspotId = spot.id;
      updateHotspot(spot.id, { title: titleInput.value }, liveUpdateOptions());
    });
    descriptionInput.addEventListener('input', () => {
      editingHotspotId = spot.id;
      updateHotspot(spot.id, { description: descriptionInput.value }, liveUpdateOptions());
    });
    xInput.addEventListener('input', () => {
      editingHotspotId = spot.id;
      const value = clampPercent(xInput.value);
      xInput.value = value;
      updateHotspot(spot.id, { x: value }, liveUpdateOptions());
    });
    yInput.addEventListener('input', () => {
      editingHotspotId = spot.id;
      const value = clampPercent(yInput.value);
      yInput.value = value;
      updateHotspot(spot.id, { y: value }, liveUpdateOptions());
    });
    row.addEventListener('click', (event) => {
      if (event.target.closest('input, textarea, button')) return;
      editingHotspotId = spot.id;
      if (currentHotspotMap && currentHotspotEditorPanel) {
        selectHotspot(spot.id, currentHotspotMap, currentHotspotEditorPanel);
      } else {
        renderPreview();
        renderHotspotList();
      }
    });
    row.querySelector('.remove-hotspot').addEventListener('click', () => removeHotspot(spot.id));

    els.hotspotList.appendChild(fragment);
  });

  updateHotspotListActiveState();
  els.hotspotList.scrollTop = previousScrollTop;
}

function renderFlipCardList() {
  if (!flipCardElements.cardsList || !flipCardElements.cardTemplate) return;
  flipCardElements.cardsList.innerHTML = '';

  state.flipCard.cards.forEach((card, index) => {
    const fragment = flipCardElements.cardTemplate.content.cloneNode(true);
    const article = fragment.querySelector('.flipcard-card');
    article.dataset.id = card.id;
    article.querySelector('.flipcard-index').textContent = index + 1;

    const frontTextarea = article.querySelector('.flipcard-front');
    const backTextarea = article.querySelector('.flipcard-back');
    frontTextarea.value = card.frontText;
    backTextarea.value = card.backText;

    frontTextarea.addEventListener('input', () => updateFlipCardCard(card.id, { frontText: frontTextarea.value }));
    backTextarea.addEventListener('input', () => updateFlipCardCard(card.id, { backText: backTextarea.value }));

    const removeButton = article.querySelector('.remove-flip-card');
    removeButton.addEventListener('click', () => removeFlipCard(card.id));

    flipCardElements.cardsList.appendChild(fragment);
  });

  updateAddCardButtonState();
}

function updateFlipCardCard(id, updates) {
  const card = state.flipCard.cards.find((item) => item.id === id);
  if (!card) return;
  Object.assign(card, updates);
  renderPreview();
  updateEmbedCode();
}

function updateAddCardButtonState() {
  if (!flipCardElements.addCard) return;
  const atLimit = state.flipCard.cards.length >= MAX_FLIP_CARDS;
  flipCardElements.addCard.disabled = atLimit;
  flipCardElements.addCard.textContent = atLimit ? 'Maximum cards added' : 'Add another card';
}

function addFlipCard(initial = {}, options = {}) {
  if (state.flipCard.cards.length >= MAX_FLIP_CARDS) {
    showToast(`You can add up to ${MAX_FLIP_CARDS} cards.`);
    return;
  }
  flipCardIdCounter += 1;
  const newCard = {
    id: flipCardIdCounter,
    frontText: initial.frontText || '',
    backText: initial.backText || ''
  };
  state.flipCard.cards.push(newCard);
  renderFlipCardList();
  renderPreview();
  updateEmbedCode();
  if (!options.silent) {
    showToast('Added a flip card.');
  }
}

function removeFlipCard(id) {
  if (state.flipCard.cards.length <= 1) {
    showToast('Keep at least one card in the set.');
    return;
  }
  state.flipCard.cards = state.flipCard.cards.filter((card) => card.id !== id);
  renderFlipCardList();
  renderPreview();
  updateEmbedCode();
}

function clampPercent(value) {
  const number = typeof value === 'number' ? value : parseFloat(value);
  if (Number.isNaN(number)) return 0;
  return Math.min(100, Math.max(0, Math.round(number * 10) / 10));
}

function updateHotspot(id, updates, options = {}) {
  const { skipPreview = false, mapEl = null, refreshList = true, editorPanel = null } = options;
  const hotspot = state.hotspot.hotspots.find((spot) => spot.id === id);
  if (!hotspot) return;
  Object.assign(hotspot, updates);
  if (refreshList) {
    renderHotspotList();
  }
  if (skipPreview && mapEl) {
    refreshHotspotDom(mapEl, hotspot);
    if (editorPanel) {
      renderHotspotEditorPanel(editorPanel, state.hotspot, mapEl);
    }
  } else {
    renderPreview();
  }
  if (!refreshList) {
    updateHotspotListActiveState();
  }
  updateEmbedCode();
}

function removeHotspot(id) {
  const wasActive = editingHotspotId === id;
  state.hotspot.hotspots = state.hotspot.hotspots.filter((spot) => spot.id !== id);
  if (wasActive) {
    editingHotspotId = null;
  }
  syncEditingHotspot();
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

function addHotspot({ x, y }, options = {}) {
  hotspotIdCounter += 1;
  const newHotspot = {
    id: hotspotIdCounter,
    title: `Hotspot ${state.hotspot.hotspots.length + 1}`,
    description: 'Describe this point...',
    x: typeof x === 'number' ? clampPercent(x) : 50,
    y: typeof y === 'number' ? clampPercent(y) : 50
  };
  state.hotspot.hotspots.push(newHotspot);
  editingHotspotId = options.select === false ? editingHotspotId : newHotspot.id;
  syncEditingHotspot();
  renderHotspotList();
  renderPreview();
  updateEmbedCode();
  if (!options.silent) {
    showToast('Added a hotspot. Use the preview to fine-tune it.');
  }
}

function getHotspotIndex(id) {
  return state.hotspot.hotspots.findIndex((spot) => spot.id === id) + 1;
}

function refreshHotspotDom(mapEl, hotspot) {
  if (!mapEl) return;
  const hotspotEl = mapEl.querySelector(`.canvasd-hotspot[data-id="${hotspot.id}"]`);
  if (!hotspotEl) return;
  hotspotEl.style.left = `${hotspot.x}%`;
  hotspotEl.style.top = `${hotspot.y}%`;
  const index = getHotspotIndex(hotspot.id);
  const title = hotspot.title || `Hotspot ${index}`;
  hotspotEl.setAttribute('aria-label', title);
  hotspotEl.title = title;
  const badge = hotspotEl.querySelector('span');
  if (badge) {
    badge.textContent = index;
  }
  const tooltip = hotspotEl.querySelector('.canvasd-hotspot-tooltip');
  if (tooltip) {
    const heading = tooltip.querySelector('h4');
    const paragraph = tooltip.querySelector('p');
    if (heading) heading.textContent = title;
    if (paragraph)
      paragraph.textContent = hotspot.description || 'Add a description to explain this point.';
  }
}

function renderPreview() {
  els.previewCanvas.innerHTML = '';
  currentHotspotMap = null;
  currentHotspotEditorPanel = null;

  if (state.widgetType === 'flip-card') {
    els.previewCanvas.appendChild(createFlipCardPreview(state.flipCard));
  } else if (state.widgetType === 'hotspot') {
    if (!state.hotspot.imageUrl) {
      const placeholder = document.createElement('div');
      placeholder.className = 'placeholder';
      placeholder.textContent = 'Upload or paste an image to start placing hotspots.';
      els.previewCanvas.appendChild(placeholder);
      return;
    }
    syncEditingHotspot();
    const { element, mapEl, editorPanel } = createHotspotPreview(state.hotspot);
    currentHotspotMap = mapEl;
    currentHotspotEditorPanel = editorPanel;
    els.previewCanvas.appendChild(element);
  }
}

function createFlipCardPreview(config) {
  const grid = document.createElement('div');
  grid.className = 'flip-card-collection';
  grid.style.setProperty('--card-width', `${config.width}px`);
  if (config.cards.length > 1) {
    grid.classList.add('has-multiple');
  }

  config.cards.forEach((cardConfig, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'flip-card-wrapper';

    const card = document.createElement('div');
    card.className = 'canvasd-flip-card';
    card.style.setProperty('--flip-width', `${config.width}px`);
    card.style.setProperty('--flip-height', `${config.height}px`);
    card.style.aspectRatio = `${config.width} / ${config.height}`;

    const inner = document.createElement('div');
    inner.className = 'canvasd-flip-card-inner';

    const front = document.createElement('div');
    front.className = 'canvasd-flip-face front';
    front.style.background = config.frontColor;
    front.style.color = config.frontTextColor;
    front.innerHTML = formatMultiline(
      escapeHTML(cardConfig.frontText || `Front of card ${index + 1}`)
    );

    const back = document.createElement('div');
    back.className = 'canvasd-flip-face back';
    back.style.background = config.backColor;
    back.style.color = config.backTextColor;
    back.innerHTML = formatMultiline(
      escapeHTML(cardConfig.backText || `Back of card ${index + 1}`)
    );

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'flip-toggle';
    toggle.textContent = 'Flip';

    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);
    card.appendChild(toggle);
    wrapper.appendChild(card);
    grid.appendChild(wrapper);

    const toggleFlip = (event) => {
      event?.stopPropagation();
      card.classList.toggle('is-flipped');
    };

    card.addEventListener('click', toggleFlip);
    toggle.addEventListener('click', toggleFlip);
  });

  return grid;
}

function createHotspotPreview(config) {
  const wrapper = document.createElement('div');
  wrapper.className = 'canvasd-hotspot-wrapper';

  const map = document.createElement('div');
  map.className = 'canvasd-hotspot-map';

  const img = document.createElement('img');
  img.src = config.imageUrl;
  img.alt = config.imageName ? `Hotspot map – ${config.imageName}` : 'Hotspot map';

  map.appendChild(img);

  const editorPanel = document.createElement('div');
  editorPanel.className = 'hotspot-editor-panel';

  config.hotspots.forEach((spot, index) => {
    const hotspot = createHotspotElement(spot, index, config.theme);
    map.appendChild(hotspot);
  });

  map.addEventListener('click', (event) => {
    if (event.target.closest('.canvasd-hotspot')) return;
    addHotspotFromClick(event, map);
  });

  wrapper.appendChild(map);
  wrapper.appendChild(editorPanel);

  updateHotspotSelection(map);
  renderHotspotEditorPanel(editorPanel, config, map);

  const hotspotButtons = Array.from(map.querySelectorAll('.canvasd-hotspot'));
  hotspotButtons.forEach((button) => {
    const id = parseInt(button.dataset.id, 10);
    if (Number.isNaN(id)) return;
    enableHotspotDrag(button, id, map, editorPanel);
  });

  return { element: wrapper, mapEl: map, editorPanel };
}

function createHotspotElement(spot, index, theme) {
  const hotspot = document.createElement('button');
  hotspot.type = 'button';
  hotspot.className = `canvasd-hotspot ${theme === 'dark' ? 'dark' : ''}`.trim();
  hotspot.style.left = `${spot.x}%`;
  hotspot.style.top = `${spot.y}%`;
  hotspot.dataset.id = spot.id;
  const label = spot.title || `Hotspot ${index + 1}`;
  hotspot.setAttribute('aria-label', `${label}`);
  hotspot.title = label;
  hotspot.innerHTML = `<span>${index + 1}</span>`;

  const tooltip = document.createElement('div');
  tooltip.className = 'canvasd-hotspot-tooltip';
  tooltip.innerHTML = `
    <h4>${escapeHTML(spot.title || `Hotspot ${index + 1}`)}</h4>
    <p>${escapeHTML(spot.description || 'Add a description to explain this point.')}</p>
  `;

  hotspot.appendChild(tooltip);

  return hotspot;
}

function selectHotspot(id, mapEl, editorPanel) {
  editingHotspotId = id;
  updateHotspotSelection(mapEl);
  updateHotspotListActiveState();
  renderHotspotEditorPanel(editorPanel, state.hotspot, mapEl);
}

function updateHotspotSelection(mapEl) {
  if (!mapEl) return;
  const buttons = Array.from(mapEl.querySelectorAll('.canvasd-hotspot'));
  buttons.forEach((button) => {
    const buttonId = parseInt(button.dataset.id, 10);
    button.classList.toggle('is-active', buttonId === editingHotspotId);
  });
}

function updateHotspotListActiveState() {
  if (!els.hotspotList) return;
  const rows = Array.from(els.hotspotList.querySelectorAll('.hotspot-row'));
  rows.forEach((row) => {
    const rowId = parseInt(row.dataset.id, 10);
    row.classList.toggle('is-active', rowId === editingHotspotId);
  });
}

function renderHotspotEditorPanel(panel, config, mapEl) {
  if (!panel) return;
  panel.innerHTML = '';
  if (!config.hotspots.length) {
    panel.classList.add('hotspot-editor-empty');
    panel.textContent = 'Add a hotspot from the image to edit its content.';
    return;
  }
  panel.classList.remove('hotspot-editor-empty');
  const hotspot =
    config.hotspots.find((spot) => spot.id === editingHotspotId) || config.hotspots[0];
  if (!hotspot) return;
  editingHotspotId = hotspot.id;
  updateHotspotSelection(mapEl);
  updateHotspotListActiveState();
  const index = getHotspotIndex(hotspot.id);

  const header = document.createElement('header');
  const headerTitle = document.createElement('div');
  headerTitle.textContent = hotspot.title || `Hotspot ${index}`;
  header.appendChild(headerTitle);

  const actions = document.createElement('div');
  actions.className = 'editor-actions';
  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'ghost';
  removeButton.textContent = 'Remove';
  removeButton.addEventListener('click', () => removeHotspot(hotspot.id));
  actions.appendChild(removeButton);
  header.appendChild(actions);
  panel.appendChild(header);

  const titleField = document.createElement('div');
  titleField.className = 'field';
  const titleLabel = document.createElement('label');
  titleLabel.textContent = 'Title';
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.value = hotspot.title;
  titleInput.placeholder = 'Label shown on hover';
  titleInput.addEventListener('input', () => {
    updateHotspot(hotspot.id, { title: titleInput.value }, { skipPreview: true, mapEl });
    headerTitle.textContent = titleInput.value || `Hotspot ${index}`;
  });
  titleField.appendChild(titleLabel);
  titleField.appendChild(titleInput);
  panel.appendChild(titleField);

  const descriptionField = document.createElement('div');
  descriptionField.className = 'field';
  const descriptionLabel = document.createElement('label');
  descriptionLabel.textContent = 'Description';
  const descriptionInput = document.createElement('textarea');
  descriptionInput.rows = 3;
  descriptionInput.value = hotspot.description;
  descriptionInput.placeholder = 'Details shown on click';
  descriptionInput.addEventListener('input', () => {
    updateHotspot(
      hotspot.id,
      { description: descriptionInput.value },
      { skipPreview: true, mapEl }
    );
  });
  descriptionField.appendChild(descriptionLabel);
  descriptionField.appendChild(descriptionInput);
  panel.appendChild(descriptionField);

  const coordinatesField = document.createElement('div');
  coordinatesField.className = 'field split';

  const xWrapper = document.createElement('div');
  const xLabel = document.createElement('label');
  xLabel.textContent = 'X (%)';
  const xInput = document.createElement('input');
  xInput.type = 'number';
  xInput.className = 'hotspot-edit-x';
  xInput.min = '0';
  xInput.max = '100';
  xInput.step = '0.1';
  xInput.value = hotspot.x;
  xInput.addEventListener('input', () => {
    const value = clampPercent(xInput.value);
    updateHotspot(hotspot.id, { x: value }, { skipPreview: true, mapEl });
    xInput.value = value;
  });
  xWrapper.appendChild(xLabel);
  xWrapper.appendChild(xInput);

  const yWrapper = document.createElement('div');
  const yLabel = document.createElement('label');
  yLabel.textContent = 'Y (%)';
  const yInput = document.createElement('input');
  yInput.type = 'number';
  yInput.className = 'hotspot-edit-y';
  yInput.min = '0';
  yInput.max = '100';
  yInput.step = '0.1';
  yInput.value = hotspot.y;
  yInput.addEventListener('input', () => {
    const value = clampPercent(yInput.value);
    updateHotspot(hotspot.id, { y: value }, { skipPreview: true, mapEl });
    yInput.value = value;
  });
  yWrapper.appendChild(yLabel);
  yWrapper.appendChild(yInput);

  coordinatesField.appendChild(xWrapper);
  coordinatesField.appendChild(yWrapper);
  panel.appendChild(coordinatesField);

  const helperText = document.createElement('p');
  helperText.className = 'hint';
  helperText.textContent = 'Drag a hotspot on the image or fine-tune the position with the fields above.';
  panel.appendChild(helperText);
}

function enableHotspotDrag(button, id, mapEl, editorPanel) {
  let dragging = false;
  let pointerId = null;

  const handleMove = (event) => {
    if (event.pointerId !== pointerId) return;
    dragging = true;
    const rect = mapEl.getBoundingClientRect();
    const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((event.clientY - rect.top) / rect.height) * 100;
    editingHotspotId = id;
    updateHotspot(
      id,
      { x: clampPercent(xPercent), y: clampPercent(yPercent) },
      { skipPreview: true, mapEl, refreshList: false }
    );
    updateHotspotSelection(mapEl);
    updateHotspotListActiveState();
    const active = state.hotspot.hotspots.find((spot) => spot.id === id);
    if (active) {
      const xInput = editorPanel.querySelector('.hotspot-edit-x');
      const yInput = editorPanel.querySelector('.hotspot-edit-y');
      if (xInput) xInput.value = active.x;
      if (yInput) yInput.value = active.y;
      const listRow = els.hotspotList?.querySelector(`.hotspot-row[data-id="${id}"]`);
      if (listRow) {
        const listX = listRow.querySelector('.hotspot-x');
        const listY = listRow.querySelector('.hotspot-y');
        if (listX) listX.value = active.x;
        if (listY) listY.value = active.y;
      }
    }
  };

  const handleUp = (event) => {
    if (event.pointerId !== pointerId) return;
    button.releasePointerCapture(pointerId);
    window.removeEventListener('pointermove', handleMove);
    window.removeEventListener('pointerup', handleUp);
    window.removeEventListener('pointercancel', handleUp);
    if (!dragging) {
      selectHotspot(id, mapEl, editorPanel);
    }
    dragging = false;
    pointerId = null;
  };

  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragging = false;
    pointerId = event.pointerId;
    button.setPointerCapture(pointerId);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
  });

  button.addEventListener('click', (event) => {
    if (dragging) {
      event.preventDefault();
      event.stopPropagation();
      dragging = false;
      return;
    }
    event.stopPropagation();
    selectHotspot(id, mapEl, editorPanel);
  });
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
  const cards = config.cards.length
    ? config.cards
    : [
        {
          frontText: 'Front side content',
          backText: 'Back side content'
        }
      ];

  const cardsHtml = cards
    .map((card, index) => {
      const front = formatMultiline(
        escapeHTML(card.frontText || `Front of card ${index + 1}`)
      );
      const back = formatMultiline(escapeHTML(card.backText || `Back of card ${index + 1}`));
      return `
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
      </div>`;
    })
    .join('');

  return `
<div id="${id}" class="canvasd-embed">
  <style>
    #${id} {
      display: block;
      width: 100%;
    }
    #${id} .canvasd-flip-grid {
      display: grid;
      gap: 1.25rem;
      justify-content: center;
      grid-template-columns: repeat(auto-fit, minmax(${config.width}px, 1fr));
    }
    #${id} .canvasd-flip-card {
      position: relative;
      width: min(${config.width}px, 100%);
      aspect-ratio: ${config.width} / ${config.height};
      height: auto;
      margin: 0 auto;
      perspective: 1600px;
    }
    #${id} .canvasd-flip-card-inner,
    #${id} .canvasd-flip-face {
      position: relative;
      width: 100%;
      height: 100%;
    }
    #${id} .canvasd-flip-card-inner {
      transition: transform 0.8s;
      transform-style: preserve-3d;
    }
    #${id} .canvasd-flip-card.is-flipped .canvasd-flip-card-inner {
      transform: rotateY(180deg);
    }
    #${id} .canvasd-flip-face {
      position: absolute;
      inset: 0;
      border-radius: 16px;
      backface-visibility: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
      font-size: 1rem;
      line-height: 1.5;
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.25);
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
  <div class="canvasd-flip-grid">
    ${cardsHtml}
  </div>
  <script>
    (function() {
      const root = document.getElementById('${id}');
      if (!root) return;
      const cards = Array.from(root.querySelectorAll('.canvasd-flip-card'));
      cards.forEach((card) => {
        const toggle = card.querySelector('.flip-toggle');
        const toggleFlip = function(event) {
          event?.stopPropagation();
          card.classList.toggle('is-flipped');
        };
        card.addEventListener('click', toggleFlip);
        if (toggle) {
          toggle.addEventListener('click', toggleFlip);
        }
      });
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
  const altText = escapeAttribute(
    config.imageName ? `Hotspot map – ${config.imageName}` : 'Hotspot map'
  );
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
    <img src="${escapeAttribute(config.imageUrl)}" alt="${altText}" />
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

function toggleEmbedVisibility() {
  if (!els.embedSection || !els.toggleEmbed) return;
  const isHidden = els.embedSection.hasAttribute('hidden');
  if (isHidden) {
    els.embedSection.removeAttribute('hidden');
    els.toggleEmbed.textContent = 'Hide embed code';
    els.toggleEmbed.setAttribute('aria-expanded', 'true');
    els.embedSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    els.embedSection.setAttribute('hidden', '');
    els.toggleEmbed.textContent = 'Show embed code';
    els.toggleEmbed.setAttribute('aria-expanded', 'false');
  }
}

function bindGlobalActions() {
  els.refreshPreview.addEventListener('click', renderPreview);
  els.saveDesign.addEventListener('click', persistState);
  els.newDesign.addEventListener('click', () => {
    if (confirm('Start a new design? Unsaved changes will be lost.')) {
      resetState();
    }
  });

  if (els.toggleEmbed && els.embedSection) {
    els.toggleEmbed.addEventListener('click', () => {
      toggleEmbedVisibility();
    });
  }

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
  if (els.toggleEmbed) {
    els.toggleEmbed.setAttribute('aria-expanded', 'false');
  }
  bindFlipCardEvents();
  bindHotspotEvents();
  bindGlobalActions();
  renderHotspotList();
  renderPreview();
  updateEmbedCode();

  els.widgetType.addEventListener('change', handleWidgetTypeChange);
}

initialize();
