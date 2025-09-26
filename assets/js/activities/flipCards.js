import { clone, uid, escapeHtml } from '../utils.js';

const DEFAULT_FRONT_COLORS = ['#eef2ff', '#fef3c7', '#fde68a', '#dcfce7'];
const DEFAULT_BACK_COLOR = '#ffffff';

const clampColumns = (value) => {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    return 3;
  }
  if (parsed < 2) {
    return 2;
  }
  if (parsed > 4) {
    return 4;
  }
  return parsed;
};

const formatColumnsLabel = (value) => (value === 1 ? '1 column' : `${value} columns`);

const createCard = (overrides = {}, index = 0) => {
  const paletteColor = DEFAULT_FRONT_COLORS[index % DEFAULT_FRONT_COLORS.length];
  const base = {
    id: uid('card'),
    front: 'Prompt',
    back: 'Answer',
    frontColor: paletteColor,
    backColor: DEFAULT_BACK_COLOR,
    frontImage: '',
    backImage: ''
  };
  const card = { ...base, ...overrides };
  if (!card.id) {
    card.id = uid('card');
  }
  if (typeof card.frontColor !== 'string' || card.frontColor.trim() === '') {
    card.frontColor = paletteColor;
  }
  if (typeof card.backColor !== 'string' || card.backColor.trim() === '') {
    card.backColor = DEFAULT_BACK_COLOR;
  }
  if (typeof card.frontImage !== 'string') {
    card.frontImage = '';
  }
  if (typeof card.backImage !== 'string') {
    card.backImage = '';
  }
  if (typeof card.front !== 'string') {
    card.front = '';
  }
  if (typeof card.back !== 'string') {
    card.back = '';
  }
  return card;
};

const normaliseCards = (cards) => {
  if (!Array.isArray(cards)) {
    return [];
  }
  return cards.map((card, index) => createCard(card, index));
};

const createSampleCards = () =>
  normaliseCards([
    {
      front: 'Photosynthesis',
      back: 'Plants convert sunlight, water, and CO₂ into glucose and oxygen.'
    },
    {
      front: 'Chlorophyll',
      back: 'The green pigment that captures light energy for photosynthesis.'
    },
    {
      front: 'Light-dependent reactions',
      back: 'Use sunlight to split water molecules and produce ATP and NADPH.'
    },
    {
      front: 'Calvin cycle',
      back: 'Uses ATP and NADPH to fix carbon dioxide into sugars.'
    }
  ]);

const template = () => ({
  columns: 3,
  cards: createSampleCards()
});

const example = () => ({
  columns: 3,
  cards: normaliseCards([
    {
      front: 'Photosynthesis overview',
      back: 'Plants turn light, water, and CO₂ into glucose (food) and oxygen.'
    },
    {
      front: 'Where it happens',
      back: 'Inside chloroplasts — mostly in the leaves of green plants.'
    },
    {
      front: 'Stage 1: Light reactions',
      back: 'Chlorophyll captures sunlight to make energy carriers (ATP & NADPH).'
    },
    {
      front: 'Stage 2: Calvin cycle',
      back: 'The plant uses ATP & NADPH to build sugars from carbon dioxide.'
    }
  ])
});

const ensureWorkingState = (data) => {
  const safeData = data ? clone(data) : {};
  return {
    columns: clampColumns(safeData.columns),
    cards: normaliseCards(safeData.cards)
  };
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    });
    reader.addEventListener('error', () => {
      reject(reader.error || new Error('Unable to read file'));
    });
    reader.readAsDataURL(file);
  });

const buildEditor = (container, data, onUpdate) => {
  const working = ensureWorkingState(data);

  const emit = (refresh = true) => {
    onUpdate(clone(working));
    if (refresh) {
      rerender();
    }
  };

  const rerender = () => {
    container.innerHTML = '';

    const layoutItem = document.createElement('div');
    layoutItem.className = 'editor-item';

    const layoutLabel = document.createElement('label');
    layoutLabel.className = 'field';
    layoutLabel.innerHTML = '<span class="field-label">Number of columns</span>';

    const layoutControls = document.createElement('div');
    layoutControls.className = 'range-field';

    const columnsInput = document.createElement('input');
    columnsInput.type = 'range';
    columnsInput.min = '2';
    columnsInput.max = '4';
    columnsInput.step = '1';
    columnsInput.value = String(working.columns);
    columnsInput.className = 'range-input';

    const columnsValue = document.createElement('span');
    columnsValue.className = 'range-value';
    columnsValue.textContent = formatColumnsLabel(working.columns);

    columnsInput.addEventListener('input', () => {
      const value = clampColumns(columnsInput.value);
      working.columns = value;
      columnsValue.textContent = formatColumnsLabel(value);
      emit(false);
    });

    layoutControls.append(columnsInput, columnsValue);
    layoutLabel.append(layoutControls);
    layoutItem.append(layoutLabel);
    container.append(layoutItem);

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'ghost-button';
    addButton.textContent = 'Add card';
    addButton.addEventListener('click', () => {
      working.cards.push(createCard({ front: 'New prompt', back: 'Answer' }, working.cards.length));
      emit();
    });

    if (!working.cards.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<p>No cards yet. Click “Add card” to get started.</p>';
      container.append(empty);
    }

    working.cards.forEach((card, index) => {
      const item = document.createElement('div');
      item.className = 'editor-item';

      const header = document.createElement('div');
      header.className = 'editor-item-header';
      header.innerHTML = `<span>Card ${index + 1}</span>`;

      const actions = document.createElement('div');
      actions.className = 'editor-item-actions';

      const duplicateBtn = document.createElement('button');
      duplicateBtn.type = 'button';
      duplicateBtn.className = 'muted-button';
      duplicateBtn.textContent = 'Duplicate';
      duplicateBtn.addEventListener('click', () => {
        const cloneSource = clone(card);
        working.cards.splice(index + 1, 0, createCard({ ...cloneSource, id: uid('card') }, index + 1));
        emit();
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'muted-button';
      deleteBtn.textContent = 'Remove';
      deleteBtn.addEventListener('click', () => {
        working.cards.splice(index, 1);
        emit();
      });

      actions.append(duplicateBtn, deleteBtn);
      header.append(actions);

      const frontLabel = document.createElement('label');
      frontLabel.className = 'field';
      frontLabel.innerHTML = '<span class="field-label">Front text</span>';
      const frontInput = document.createElement('textarea');
      frontInput.value = card.front;
      frontInput.rows = 2;
      frontInput.addEventListener('input', () => {
        working.cards[index].front = frontInput.value;
        emit(false);
      });
      frontLabel.append(frontInput);

      const backLabel = document.createElement('label');
      backLabel.className = 'field';
      backLabel.innerHTML = '<span class="field-label">Back text</span>';
      const backInput = document.createElement('textarea');
      backInput.value = card.back;
      backInput.rows = 3;
      backInput.addEventListener('input', () => {
        working.cards[index].back = backInput.value;
        emit(false);
      });
      backLabel.append(backInput);

      const appearanceRow = document.createElement('div');
      appearanceRow.className = 'card-appearance-row';

      const createFaceControls = (faceKey, labelText) => {
        const faceContainer = document.createElement('div');
        faceContainer.className = 'card-face-controls';

        const colorField = document.createElement('label');
        colorField.className = 'field card-color-field';
        colorField.innerHTML = `<span class="field-label">${labelText} color</span>`;
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.className = 'color-input';
        const colorValue = card[`${faceKey}Color`];
        colorInput.value = typeof colorValue === 'string' && colorValue.trim() !== '' ? colorValue : faceKey === 'front' ? DEFAULT_FRONT_COLORS[index % DEFAULT_FRONT_COLORS.length] : DEFAULT_BACK_COLOR;
        colorInput.addEventListener('input', () => {
          working.cards[index][`${faceKey}Color`] = colorInput.value;
          emit(false);
        });
        colorField.append(colorInput);

        const imageField = document.createElement('div');
        imageField.className = 'field card-image-field';
        const imageLabel = document.createElement('span');
        imageLabel.className = 'field-label';
        imageLabel.textContent = `${labelText} image (optional)`;

        const imageControls = document.createElement('div');
        imageControls.className = 'image-input-group';
        const imageInput = document.createElement('input');
        imageInput.type = 'file';
        imageInput.accept = 'image/*';
        imageInput.className = 'file-input';

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'muted-button';
        removeButton.textContent = 'Remove image';

        const preview = document.createElement('div');
        preview.className = 'image-preview';

        const updatePreview = () => {
          const currentCard = working.cards[index];
          const value = currentCard[`${faceKey}Image`];
          preview.innerHTML = '';
          preview.dataset.empty = value ? 'false' : 'true';
          if (value) {
            const img = document.createElement('img');
            img.src = value;
            img.alt = '';
            preview.append(img);
          } else {
            const placeholder = document.createElement('span');
            placeholder.textContent = 'No image';
            preview.append(placeholder);
          }
          removeButton.disabled = !value;
        };

        removeButton.addEventListener('click', () => {
          working.cards[index][`${faceKey}Image`] = '';
          imageInput.value = '';
          updatePreview();
          emit(false);
        });

        imageInput.addEventListener('change', () => {
          if (!imageInput.files || !imageInput.files.length) {
            return;
          }
          const file = imageInput.files[0];
          if (!file) {
            return;
          }
          readFileAsDataUrl(file)
            .then((result) => {
              working.cards[index][`${faceKey}Image`] = result;
              updatePreview();
              emit();
            })
            .catch((error) => {
              console.error('Unable to read image', error);
            });
        });

        updatePreview();

        imageControls.append(imageInput, removeButton);
        imageField.append(imageLabel, imageControls, preview);

        faceContainer.append(colorField, imageField);
        return faceContainer;
      };

      appearanceRow.append(
        createFaceControls('front', 'Front'),
        createFaceControls('back', 'Back')
      );

      item.append(header, frontLabel, backLabel, appearanceRow);
      container.append(item);
    });

    container.append(addButton);
  };

  rerender();
};

const renderPreview = (container, data, options = {}) => {
  container.innerHTML = '';
  const working = ensureWorkingState(data);
  const playAnimations = Boolean(options && options.playAnimations);
  if (!working.cards.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<p>Add cards to see a live preview.</p>';
    container.append(empty);https://github.com/galvinradleyngo/canvasdesigner/pull/19/conflict?name=assets%252Fjs%252Factivities%252FflipCards.js&ancestor_oid=ffc6d3109be2aa873f3e15d84f88273f7022824f&base_oid=94743a8a927078736600e5f57b55d523b6f40c13&head_oid=394b7a520d6cffa994f5ba87105526248d823524
    return;
  }
  const grid = document.createElement('div');
  grid.className = 'flipcard-grid';
  grid.style.gridTemplateColumns = `repeat(${working.columns}, minmax(0, 1fr))`;

  working.cards.forEach((card, index) => {
    const cardWrapper = document.createElement('div');
    cardWrapper.className = 'flipcard';
    cardWrapper.style.setProperty('--card-index', String(index));

    const inner = document.createElement('div');
    inner.className = 'flipcard-inner';
    if (playAnimations) {
      inner.classList.add('animate');
    }

    const createFace = (faceKey, fallbackText) => {
      const face = document.createElement('div');
      face.className = `flipcard-face flipcard-${faceKey}`;
      const color = card[`${faceKey}Color`];
      face.style.background = color || (faceKey === 'front' ? DEFAULT_FRONT_COLORS[index % DEFAULT_FRONT_COLORS.length] : DEFAULT_BACK_COLOR);
      const imageValue = card[`${faceKey}Image`];
      if (imageValue) {
        face.classList.add('has-image');
        const img = document.createElement('img');
        img.src = imageValue;
        img.alt = '';
        face.append(img);
      }
      const textWrapper = document.createElement('div');
      textWrapper.className = 'flipcard-face-content';
      const paragraph = document.createElement('p');
      paragraph.textContent = card[faceKey] || fallbackText;
      textWrapper.append(paragraph);
      face.append(textWrapper);
      return face;
    };

    const front = createFace('front', 'Front');
    const back = createFace('back', 'Back');
    back.classList.add('flipcard-back');

    inner.append(front, back);
    cardWrapper.append(inner);

    const setFlipState = (flipped) => {
      if (flipped) {
        cardWrapper.classList.add('flipped');
        if (playAnimations) {
          inner.classList.remove('animate');
        }
      } else {
        cardWrapper.classList.remove('flipped');
        if (playAnimations) {
          inner.classList.add('animate');
        }
      }
      cardWrapper.setAttribute('aria-pressed', flipped ? 'true' : 'false');
    };

    const toggleFlip = () => {
      const nextState = !cardWrapper.classList.contains('flipped');
      setFlipState(nextState);
    };

    cardWrapper.addEventListener('click', toggleFlip);
    cardWrapper.addEventListener('keypress', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleFlip();
      }
    });
    cardWrapper.setAttribute('tabindex', '0');
    cardWrapper.setAttribute('role', 'button');
    setFlipState(false);

    grid.append(cardWrapper);
  });

  container.append(grid);
};

const embedTemplate = (data, containerId) => {
  const working = ensureWorkingState(data);
  const columns = working.columns;
  return {
    html: `
    <div class="cd-flipcard-grid" style="grid-template-columns: repeat(${columns}, minmax(0, 1fr));">
      ${working.cards
        .map(
          (card, index) => `
          <div class="cd-flipcard" tabindex="0" role="button" aria-pressed="false" style="--card-index: ${index};">
            <div class="cd-flipcard-inner animate">
              <div class="cd-flipcard-face cd-flipcard-front${card.frontImage ? ' has-image' : ''}" style="background: ${escapeHtml(
                card.frontColor || DEFAULT_FRONT_COLORS[index % DEFAULT_FRONT_COLORS.length]
              )};">
                ${card.frontImage ? `<img src="${escapeHtml(card.frontImage)}" alt="" />` : ''}
                <div class="cd-flipcard-face-content"><p>${escapeHtml(card.front || 'Front')}</p></div>
              </div>
              <div class="cd-flipcard-face cd-flipcard-back${card.backImage ? ' has-image' : ''}" style="background: ${escapeHtml(
                card.backColor || DEFAULT_BACK_COLOR
              )};">
                ${card.backImage ? `<img src="${escapeHtml(card.backImage)}" alt="" />` : ''}
                <div class="cd-flipcard-face-content"><p>${escapeHtml(card.back || 'Back')}</p></div>
              </div>
            </div>
          </div>`
        )
        .join('')}
    </div>
  `,
    css: `
    #${containerId} .cd-flipcard-grid {
      display: grid;
      gap: 1.2rem;
    }
    #${containerId} .cd-flipcard {
      perspective: 1000px;
      cursor: pointer;
      position: relative;
      opacity: 0;
      transform: translateY(18px) scale(0.98);
      animation: cd-flipcard-reveal 420ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
      animation-delay: calc(var(--card-index, 0) * 120ms);
    }
    #${containerId} .cd-flipcard-inner {
      position: relative;
      width: 100%;
      transform-style: preserve-3d;
      transition: transform 0.6s cubic-bezier(0.22, 0.61, 0.36, 1);
      min-height: 160px;
    }
    #${containerId} .cd-flipcard-inner.animate {
      animation: cd-pulse-card 12s ease-in-out infinite;
    }
    #${containerId} .cd-flipcard.flipped .cd-flipcard-inner {
      transform: rotateY(180deg);
      animation: none;
    }
    #${containerId} .cd-flipcard:focus-visible .cd-flipcard-inner,
    #${containerId} .cd-flipcard:hover .cd-flipcard-inner {
      box-shadow: 0 16px 32px rgba(99, 102, 241, 0.25);
    }
    #${containerId} .cd-flipcard-face {
      position: absolute;
      inset: 0;
      backface-visibility: hidden;
      border-radius: 14px;
      padding: 1.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 1rem;
      box-shadow: 0 14px 24px rgba(15, 23, 42, 0.16);
      overflow: hidden;
      color: #0f172a;
    }
    #${containerId} .cd-flipcard-face.has-image {
      color: #f8fafc;
      text-shadow: 0 1px 3px rgba(15, 23, 42, 0.5);
    }
    #${containerId} .cd-flipcard-face img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      z-index: 1;
    }
    #${containerId} .cd-flipcard-face::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.4), transparent 55%);
      opacity: 0;
      transform: translateY(12%);
      transition: opacity 200ms ease, transform 260ms ease;
      z-index: 2;
      pointer-events: none;
    }
    #${containerId} .cd-flipcard:hover .cd-flipcard-face::after,
    #${containerId} .cd-flipcard:focus-visible .cd-flipcard-face::after {
      opacity: 1;
      transform: translateY(0);
    }
    #${containerId} .cd-flipcard-face-content {
      position: relative;
      z-index: 3;
      width: 100%;
      white-space: pre-wrap;
    }
    #${containerId} .cd-flipcard-face-content p {
      margin: 0;
      line-height: 1.4;
    }
    #${containerId} .cd-flipcard-back {
      transform: rotateY(180deg);
    }
    @keyframes cd-flipcard-reveal {
      from {
        opacity: 0;
        transform: translateY(18px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    @keyframes cd-pulse-card {
      0%,
      100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-6px);
      }
    }
  `,
    js: `
    (function(){
      const root = document.getElementById('${containerId}');
      if (!root) return;
      root.querySelectorAll('.cd-flipcard').forEach((card) => {
        const inner = card.querySelector('.cd-flipcard-inner');
        const setState = (flipped) => {
          card.classList.toggle('flipped', flipped);
          if (inner) {
            if (flipped) {
              inner.classList.remove('animate');
            } else {
              inner.classList.add('animate');
            }
          }
          card.setAttribute('aria-pressed', String(flipped));
        };
        setState(false);
        const toggle = () => {
          const nextState = !card.classList.contains('flipped');
          setState(nextState);
        };
        card.addEventListener('click', toggle);
        card.addEventListener('keypress', function(event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggle();
          }
        });
      });
    })();
  `
  };
};

export const flipCards = {
  id: 'flipCards',
  label: 'Flip cards',
  template,
  example,
  buildEditor,
  renderPreview,
  embedTemplate
};
