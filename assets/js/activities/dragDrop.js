import { clone, uid, escapeHtml } from '../utils.js';

const createTemplateBuckets = () => {
  const bucketA = uid('bucket');
  const bucketB = uid('bucket');
  return {
    buckets: [
      { id: bucketA, title: 'Concepts', description: 'Big ideas, terms, or vocabulary.' },
      { id: bucketB, title: 'Examples', description: 'Real-world applications or evidence.' }
    ],
    items: [
      { id: uid('item'), text: 'Plate tectonics', correctBucketId: bucketA },
      { id: uid('item'), text: 'San Andreas Fault', correctBucketId: bucketB },
      { id: uid('item'), text: 'Divergent boundary', correctBucketId: bucketA },
      { id: uid('item'), text: 'Mid-Atlantic Ridge', correctBucketId: bucketB }
    ]
  };
};

const template = () => {
  const { buckets, items } = createTemplateBuckets();
  return {
    prompt: 'Describe the challenge learners should solve.',
    instructions: 'Give learners a short instruction for how to complete the drag & drop task.',
    buckets,
    items
  };
};

const example = () => {
  const bucketA = uid('bucket');
  const bucketB = uid('bucket');
  return {
    prompt: 'Sort each tectonic example into the matching plate boundary type.',
    instructions: 'Drag the cards into the correct drop zone, then use “Check answers” to get instant feedback.',
    buckets: [
      {
        id: bucketA,
        title: 'Convergent boundaries',
        description: 'Where plates collide and one may subduct beneath another.'
      },
      {
        id: bucketB,
        title: 'Divergent boundaries',
        description: 'Where plates move apart and new crust forms.'
      }
    ],
    items: [
      { id: uid('item'), text: 'Mariana Trench', correctBucketId: bucketA },
      { id: uid('item'), text: 'Mid-Atlantic Ridge', correctBucketId: bucketB },
      { id: uid('item'), text: 'Andes Mountains', correctBucketId: bucketA },
      { id: uid('item'), text: 'East African Rift', correctBucketId: bucketB }
    ]
  };
};

const ensureBuckets = (working) => {
  if (!Array.isArray(working.buckets) || working.buckets.length === 0) {
    const { buckets } = createTemplateBuckets();
    working.buckets = buckets;
  }
};

const ensureItems = (working) => {
  if (!Array.isArray(working.items)) {
    working.items = [];
  }
  ensureBuckets(working);
  if (working.items.length === 0) {
    working.items.push({
      id: uid('item'),
      text: 'New idea',
      correctBucketId: working.buckets[0]?.id ?? null
    });
  }
};

const buildEditor = (container, data, onUpdate) => {
  const working = clone(data);
  ensureBuckets(working);
  ensureItems(working);

  const emit = (refresh = true) => {
    onUpdate(clone(working));
    if (refresh) {
      rerender();
    }
  };

  const updateBucketOptions = () => {
    container
      .querySelectorAll('select[data-item-id]')
      .forEach((select) => {
        const currentValue = select.value;
        select.innerHTML = '';
        working.buckets.forEach((bucket) => {
          const option = document.createElement('option');
          option.value = bucket.id;
          option.textContent = bucket.title?.trim() || 'Untitled drop zone';
          select.append(option);
        });
        if (currentValue && working.buckets.some((bucket) => bucket.id === currentValue)) {
          select.value = currentValue;
        } else {
          select.selectedIndex = 0;
          const itemId = select.dataset.itemId;
          const itemIndex = working.items.findIndex((item) => item.id === itemId);
          if (itemIndex >= 0) {
            working.items[itemIndex].correctBucketId = select.value || working.buckets[0]?.id ?? null;
          }
        }
      });
  };

  const rerender = () => {
    container.innerHTML = '';

    const promptField = document.createElement('label');
    promptField.className = 'field';
    promptField.innerHTML = '<span class="field-label">Prompt</span>';
    const promptInput = document.createElement('textarea');
    promptInput.rows = 2;
    promptInput.value = working.prompt || '';
    promptInput.placeholder = 'What should learners do?';
    promptInput.addEventListener('input', () => {
      working.prompt = promptInput.value;
      emit(false);
    });
    promptField.append(promptInput);

    const instructionField = document.createElement('label');
    instructionField.className = 'field';
    instructionField.innerHTML = '<span class="field-label">Instructions</span>';
    const instructionInput = document.createElement('textarea');
    instructionInput.rows = 2;
    instructionInput.value = working.instructions || '';
    instructionInput.placeholder = 'Give learners a short instruction for the drag & drop task.';
    instructionInput.addEventListener('input', () => {
      working.instructions = instructionInput.value;
      emit(false);
    });
    instructionField.append(instructionInput);

    const zonesSection = document.createElement('section');
    zonesSection.className = 'dragdrop-editor-section';

    const zonesHeader = document.createElement('div');
    zonesHeader.className = 'dragdrop-editor-header';
    zonesHeader.innerHTML = '<h3>Drop zones</h3>';
    const addZoneButton = document.createElement('button');
    addZoneButton.type = 'button';
    addZoneButton.className = 'ghost-button';
    addZoneButton.textContent = 'Add drop zone';
    addZoneButton.addEventListener('click', () => {
      working.buckets.push({
        id: uid('bucket'),
        title: `Drop zone ${working.buckets.length + 1}`,
        description: ''
      });
      emit();
    });
    zonesHeader.append(addZoneButton);

    zonesSection.append(zonesHeader);

    working.buckets.forEach((bucket, index) => {
      const item = document.createElement('div');
      item.className = 'editor-item dragdrop-editor-item';

      const header = document.createElement('div');
      header.className = 'editor-item-header';
      const label = document.createElement('span');
      label.textContent = `Drop zone ${index + 1}`;
      const actions = document.createElement('div');
      actions.className = 'editor-item-actions';
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'muted-button';
      deleteBtn.textContent = 'Remove';
      deleteBtn.disabled = working.buckets.length <= 1;
      deleteBtn.addEventListener('click', () => {
        const removedId = bucket.id;
        working.buckets.splice(index, 1);
        if (working.buckets.length === 0) {
          ensureBuckets(working);
        }
        working.items = working.items.map((card) => {
          if (card.correctBucketId === removedId) {
            return {
              ...card,
              correctBucketId: working.buckets[0]?.id ?? null
            };
          }
          return card;
        });
        emit();
      });
      actions.append(deleteBtn);
      header.append(label, actions);

      const titleField = document.createElement('label');
      titleField.className = 'field';
      titleField.innerHTML = '<span class="field-label">Title</span>';
      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.className = 'text-input';
      titleInput.value = bucket.title || '';
      titleInput.placeholder = 'e.g. Key concept';
      titleInput.addEventListener('input', () => {
        working.buckets[index].title = titleInput.value;
        emit(false);
        updateBucketOptions();
      });
      titleField.append(titleInput);

      const descriptionField = document.createElement('label');
      descriptionField.className = 'field';
      descriptionField.innerHTML = '<span class="field-label">Helper text (optional)</span>';
      const descriptionInput = document.createElement('textarea');
      descriptionInput.rows = 2;
      descriptionInput.value = bucket.description || '';
      descriptionInput.placeholder = 'Give a short hint or definition.';
      descriptionInput.addEventListener('input', () => {
        working.buckets[index].description = descriptionInput.value;
        emit(false);
      });
      descriptionField.append(descriptionInput);

      item.append(header, titleField, descriptionField);
      zonesSection.append(item);
    });

    const itemsSection = document.createElement('section');
    itemsSection.className = 'dragdrop-editor-section';

    const itemsHeader = document.createElement('div');
    itemsHeader.className = 'dragdrop-editor-header';
    itemsHeader.innerHTML = '<h3>Draggable cards</h3>';
    const addItemButton = document.createElement('button');
    addItemButton.type = 'button';
    addItemButton.className = 'ghost-button';
    addItemButton.textContent = 'Add card';
    addItemButton.addEventListener('click', () => {
      ensureBuckets(working);
      working.items.push({
        id: uid('item'),
        text: `Card ${working.items.length + 1}`,
        correctBucketId: working.buckets[0]?.id ?? null
      });
      emit();
    });
    itemsHeader.append(addItemButton);

    itemsSection.append(itemsHeader);

    working.items.forEach((card, index) => {
      const row = document.createElement('div');
      row.className = 'editor-item dragdrop-editor-item';

      const header = document.createElement('div');
      header.className = 'editor-item-header';
      const title = document.createElement('span');
      title.textContent = `Card ${index + 1}`;
      const actions = document.createElement('div');
      actions.className = 'editor-item-actions';
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'muted-button';
      deleteBtn.textContent = 'Remove';
      deleteBtn.addEventListener('click', () => {
        working.items.splice(index, 1);
        if (working.items.length === 0) {
          ensureItems(working);
        }
        emit();
      });
      actions.append(deleteBtn);
      header.append(title, actions);

      const textField = document.createElement('label');
      textField.className = 'field';
      textField.innerHTML = '<span class="field-label">Card text</span>';
      const textInput = document.createElement('textarea');
      textInput.rows = 2;
      textInput.value = card.text || '';
      textInput.placeholder = 'What should appear on the draggable card?';
      textInput.addEventListener('input', () => {
        working.items[index].text = textInput.value;
        emit(false);
      });
      textField.append(textInput);

      const answerField = document.createElement('label');
      answerField.className = 'field';
      answerField.innerHTML = '<span class="field-label">Correct drop zone</span>';
      const answerSelect = document.createElement('select');
      answerSelect.dataset.itemId = card.id;
      answerSelect.className = 'select-input';
      working.buckets.forEach((bucket) => {
        const option = document.createElement('option');
        option.value = bucket.id;
        option.textContent = bucket.title?.trim() || 'Untitled drop zone';
        answerSelect.append(option);
      });
      answerSelect.value = card.correctBucketId && working.buckets.some((bucket) => bucket.id === card.correctBucketId)
        ? card.correctBucketId
        : working.buckets[0]?.id ?? '';
      working.items[index].correctBucketId = answerSelect.value || null;
      answerSelect.addEventListener('change', () => {
        working.items[index].correctBucketId = answerSelect.value || null;
        emit(false);
      });
      answerField.append(answerSelect);

      row.append(header, textField, answerField);
      itemsSection.append(row);
    });

    container.append(promptField, instructionField, zonesSection, itemsSection);

    updateBucketOptions();
  };

  rerender();
};

const createEmptyPlaceholder = (message) => `
  <div class="preview-placeholder" role="status" aria-live="polite">
    <strong>Configure drop zones and cards</strong>
    <span>${message}</span>
  </div>
`;

const EMPTY_PREVIEW_TEMPLATE = createEmptyPlaceholder(
  'Add at least one drop zone and draggable card to generate a preview.'
);
const EMPTY_EMBED_TEMPLATE = createEmptyPlaceholder(
  'Add at least one drop zone and draggable card to embed this activity.'
);

const sanitizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const normalizeAuthoringData = (rawData = {}) => {
  const fallback = template();
  const fallbackBuckets = clone(fallback.buckets);
  const rawBuckets = Array.isArray(rawData.buckets)
    ? rawData.buckets.filter((bucket) => bucket && bucket.id)
    : [];
  const bucketsSource = rawBuckets.length > 0 ? rawBuckets : fallbackBuckets;
  const buckets = bucketsSource.map((bucket, index) => ({
    ...bucket,
    title: sanitizeText(bucket.title) || `Drop zone ${index + 1}`,
    description: sanitizeText(bucket.description)
  }));

  const bucketIds = new Set(buckets.map((bucket) => bucket.id));
  const rawItems = Array.isArray(rawData.items)
    ? rawData.items.filter((item) => item && item.id)
    : [];
  const items = rawItems
    .map((item) => ({
      ...item,
      text: sanitizeText(item.text),
      correctBucketId: bucketIds.has(item.correctBucketId) ? item.correctBucketId : null
    }))
    .filter((item) => item.text.length > 0);

  return {
    hasBuckets: rawBuckets.length > 0,
    hasItems: items.length > 0,
    buckets,
    items,
    prompt: sanitizeText(rawData.prompt),
    instructions: sanitizeText(rawData.instructions)
  };
};

const renderPreview = (container, data) => {
  if (!container) return;
  container.innerHTML = '';

  const { hasBuckets, hasItems, buckets, items, prompt, instructions } = normalizeAuthoringData(data);

  if (!hasBuckets || !hasItems) {
    container.innerHTML = EMPTY_PREVIEW_TEMPLATE;
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'cd-dragdrop';

  if (prompt) {
    const promptEl = document.createElement('h3');
    promptEl.className = 'cd-dragdrop-prompt';
    promptEl.textContent = prompt;
    wrapper.append(promptEl);
  }

  if (instructions) {
    const instructionsEl = document.createElement('p');
    instructionsEl.className = 'cd-dragdrop-instructions';
    instructionsEl.textContent = instructions;
    wrapper.append(instructionsEl);
  }

  const board = document.createElement('div');
  board.className = 'cd-dragdrop-board';

  const pool = document.createElement('div');
  pool.className = 'cd-dragdrop-pool';
  const poolLabel = document.createElement('h4');
  poolLabel.className = 'cd-dragdrop-subtitle';
  poolLabel.textContent = 'Card bank';
  const poolBody = document.createElement('div');
  poolBody.className = 'cd-dragdrop-zone-body';
  poolBody.dataset.dropZone = 'pool';
  pool.append(poolLabel, poolBody);

  const zonesContainer = document.createElement('div');
  zonesContainer.className = 'cd-dragdrop-zones';

  const placements = new Map();
  const cards = new Map();

  const placeItem = (itemId, bucketId) => {
    const cardEl = cards.get(itemId);
    if (!cardEl) return;
    cardEl.classList.remove('is-correct', 'is-incorrect');
    const target = bucketId ? zonesContainer.querySelector(`[data-drop-zone="${bucketId}"]`) : poolBody;
    if (!target) return;
    target.append(cardEl);
    placements.set(itemId, bucketId);
  };

  const makeDropTarget = (element, bucketId) => {
    element.addEventListener('dragover', (event) => {
      event.preventDefault();
      element.classList.add('is-over');
    });
    element.addEventListener('dragleave', () => {
      element.classList.remove('is-over');
    });
    element.addEventListener('drop', (event) => {
      event.preventDefault();
      element.classList.remove('is-over');
      const itemId = event.dataTransfer.getData('text/plain');
      if (!itemId) return;
      placeItem(itemId, bucketId);
    });
  };

  makeDropTarget(poolBody, null);

  buckets.forEach((bucket) => {
    const zone = document.createElement('div');
    zone.className = 'cd-dragdrop-zone';

    const header = document.createElement('div');
    header.className = 'cd-dragdrop-zone-header';
    const title = document.createElement('h4');
    title.className = 'cd-dragdrop-zone-title';
    title.textContent = bucket.title?.trim() || 'Drop zone';
    header.append(title);

    if (bucket.description) {
      const description = document.createElement('p');
      description.className = 'cd-dragdrop-zone-description';
      description.textContent = bucket.description;
      header.append(description);
    }

    const body = document.createElement('div');
    body.className = 'cd-dragdrop-zone-body';
    body.dataset.dropZone = bucket.id;

    makeDropTarget(body, bucket.id);

    zone.append(header, body);
    zonesContainer.append(zone);
  });

  const feedback = document.createElement('p');
  feedback.className = 'cd-dragdrop-feedback';
  feedback.hidden = true;

  const actions = document.createElement('div');
  actions.className = 'cd-dragdrop-actions';
  const checkButton = document.createElement('button');
  checkButton.type = 'button';
  checkButton.className = 'primary-button';
  checkButton.textContent = 'Check answers';
  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'ghost-button';
  resetButton.textContent = 'Reset';

  const evaluate = () => {
    let correctCount = 0;
    let placedCount = 0;
    items.forEach((item) => {
      const card = cards.get(item.id);
      if (!card) return;
      const placement = placements.get(item.id) ?? null;
      if (!placement) {
        card.classList.remove('is-correct', 'is-incorrect');
        return;
      }
      placedCount += 1;
      const isCorrect = placement === item.correctBucketId;
      card.classList.toggle('is-correct', isCorrect);
      card.classList.toggle('is-incorrect', !isCorrect);
      if (isCorrect) {
        correctCount += 1;
      }
    });
    feedback.hidden = false;
    if (!items.length) {
      feedback.textContent = 'Add cards to see feedback here.';
    } else if (placedCount === 0) {
      feedback.textContent = 'Drag a card into a drop zone to get feedback.';
    } else {
      feedback.textContent = `You placed ${correctCount} of ${items.length} cards correctly.`;
    }
  };

  const resetBoard = () => {
    items.forEach((item) => {
      placeItem(item.id, null);
    });
    feedback.hidden = true;
  };

  checkButton.addEventListener('click', evaluate);
  resetButton.addEventListener('click', resetBoard);

  const createCard = (item) => {
    const card = document.createElement('div');
    card.className = 'cd-dragdrop-item';
    card.draggable = true;
    card.dataset.itemId = item.id;
    card.textContent = item.text?.trim() || 'Card';
    card.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', item.id);
      requestAnimationFrame(() => card.classList.add('is-dragging'));
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('is-dragging');
    });
    cards.set(item.id, card);
    placements.set(item.id, null);
    return card;
  };

  items.forEach((item) => {
    const card = createCard(item);
    poolBody.append(card);
  });

  actions.append(checkButton, resetButton);
  board.append(pool, zonesContainer);
  wrapper.append(board, actions, feedback);

  container.append(wrapper);
};

const embedTemplate = (data, containerId) => {
  const { hasBuckets, hasItems, buckets, items, prompt, instructions } = normalizeAuthoringData(data);

  if (!hasBuckets || !hasItems) {
    return {
      html: `
        <div class="cd-dragdrop cd-dragdrop--empty" data-widget="dragdrop">
          ${EMPTY_EMBED_TEMPLATE}
        </div>
      `,
      css: '',
      js: ''
    };
  }

  const cardsHtml = items
    .map(
      (item) => `
        <div class="cd-dragdrop-item" draggable="true" data-item-id="${escapeHtml(item.id)}" data-correct="${escapeHtml(
          item.correctBucketId || ''
        )}">
          ${escapeHtml(item.text || '')}
        </div>
      `
    )
    .join('');

  const zonesHtml = buckets
    .map(
      (bucket) => `
        <div class="cd-dragdrop-zone">
          <div class="cd-dragdrop-zone-header">
            <h4 class="cd-dragdrop-zone-title">${escapeHtml(bucket.title || 'Drop zone')}</h4>
            ${bucket.description ? `<p class="cd-dragdrop-zone-description">${escapeHtml(bucket.description)}</p>` : ''}
          </div>
          <div class="cd-dragdrop-zone-body" data-drop-zone="${escapeHtml(bucket.id)}"></div>
        </div>
      `
    )
    .join('');

  return {
    html: `
      <div class="cd-dragdrop" data-widget="dragdrop">
        ${prompt ? `<h3 class="cd-dragdrop-prompt">${escapeHtml(prompt)}</h3>` : ''}
        ${instructions ? `<p class="cd-dragdrop-instructions">${escapeHtml(instructions)}</p>` : ''}
        <div class="cd-dragdrop-board">
          <div class="cd-dragdrop-pool">
            <h4 class="cd-dragdrop-subtitle">Card bank</h4>
            <div class="cd-dragdrop-zone-body" data-drop-zone="pool">
              ${cardsHtml}
            </div>
          </div>
          <div class="cd-dragdrop-zones">
            ${zonesHtml}
          </div>
        </div>
        <div class="cd-dragdrop-actions">
          <button type="button" data-action="check">Check answers</button>
          <button type="button" data-action="reset">Reset</button>
        </div>
        <p class="cd-dragdrop-feedback" data-feedback hidden></p>
      </div>
    `,
    css: `
      #${containerId} .cd-dragdrop {
        display: grid;
        gap: 1rem;
        background: rgba(15, 23, 42, 0.02);
        padding: 1.25rem;
        border-radius: 16px;
        border: 1px solid rgba(15, 23, 42, 0.08);
      }
      #${containerId} .cd-dragdrop-prompt {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
      }
      #${containerId} .cd-dragdrop-instructions {
        margin: 0;
        color: rgba(15, 23, 42, 0.7);
      }
      #${containerId} .cd-dragdrop-board {
        display: grid;
        gap: 1rem;
      }
      @media (min-width: 720px) {
        #${containerId} .cd-dragdrop-board {
          grid-template-columns: minmax(0, 220px) 1fr;
        }
      }
      #${containerId} .cd-dragdrop-pool,
      #${containerId} .cd-dragdrop-zone {
        background: rgba(255, 255, 255, 0.92);
        border-radius: 14px;
        border: 1px solid rgba(15, 23, 42, 0.08);
        box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 1rem;
      }
      #${containerId} .cd-dragdrop-subtitle {
        margin: 0;
        font-size: 0.95rem;
        font-weight: 600;
        color: rgba(15, 23, 42, 0.75);
      }
      #${containerId} .cd-dragdrop-zone-title {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
      }
      #${containerId} .cd-dragdrop-zone-description {
        margin: 0.25rem 0 0;
        font-size: 0.9rem;
        color: rgba(15, 23, 42, 0.65);
      }
      #${containerId} .cd-dragdrop-zone-body {
        min-height: 120px;
        display: grid;
        gap: 0.6rem;
        align-content: flex-start;
        background: rgba(99, 102, 241, 0.05);
        border-radius: 12px;
        padding: 0.75rem;
        border: 1px dashed rgba(99, 102, 241, 0.3);
        transition: border 160ms ease, background 160ms ease;
      }
      #${containerId} .cd-dragdrop-zone-body.is-over {
        border-color: rgba(79, 70, 229, 0.8);
        background: rgba(79, 70, 229, 0.08);
      }
      #${containerId} .cd-dragdrop-item {
        padding: 0.6rem 0.75rem;
        border-radius: 10px;
        background: rgba(79, 70, 229, 0.12);
        border: 1px solid rgba(79, 70, 229, 0.28);
        font-weight: 500;
        cursor: grab;
        transition: transform 120ms ease, box-shadow 120ms ease;
      }
      #${containerId} .cd-dragdrop-item.is-dragging {
        opacity: 0.75;
        transform: scale(1.02);
        box-shadow: 0 16px 30px rgba(15, 23, 42, 0.18);
      }
      #${containerId} .cd-dragdrop-item.is-correct {
        border-color: rgba(34, 197, 94, 0.6);
        background: rgba(34, 197, 94, 0.12);
      }
      #${containerId} .cd-dragdrop-item.is-incorrect {
        border-color: rgba(239, 68, 68, 0.6);
        background: rgba(239, 68, 68, 0.12);
      }
      #${containerId} .cd-dragdrop-actions {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      #${containerId} .cd-dragdrop-actions button {
        border-radius: 999px;
        border: none;
        padding: 0.55rem 1.25rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 160ms ease, transform 120ms ease;
      }
      #${containerId} .cd-dragdrop-actions button[data-action='check'] {
        background: rgba(79, 70, 229, 1);
        color: white;
      }
      #${containerId} .cd-dragdrop-actions button[data-action='check']:hover {
        background: rgba(67, 56, 202, 1);
      }
      #${containerId} .cd-dragdrop-actions button[data-action='reset'] {
        background: rgba(15, 23, 42, 0.08);
        color: rgba(15, 23, 42, 0.85);
      }
      #${containerId} .cd-dragdrop-actions button[data-action='reset']:hover {
        background: rgba(15, 23, 42, 0.12);
      }
      #${containerId} .cd-dragdrop-feedback {
        margin: 0;
        font-weight: 500;
        color: rgba(15, 23, 42, 0.75);
      }
    `,
    js: `
      (function(){
        const root = document.getElementById('${containerId}');
        if (!root) return;
        const widget = root.querySelector('[data-widget="dragdrop"]');
        if (!widget) return;
        const placements = new Map();
        const dropTargets = new Map();

        const cards = widget.querySelectorAll('.cd-dragdrop-item');
        cards.forEach((card) => {
          const itemId = card.dataset.itemId;
          placements.set(itemId, null);
          card.addEventListener('dragstart', (event) => {
            event.dataTransfer.setData('text/plain', itemId);
            requestAnimationFrame(() => card.classList.add('is-dragging'));
          });
          card.addEventListener('dragend', () => {
            card.classList.remove('is-dragging');
          });
        });

        const bodies = widget.querySelectorAll('.cd-dragdrop-zone-body');
        bodies.forEach((zone) => {
          const bucketId = zone.dataset.dropZone === 'pool' ? null : zone.dataset.dropZone;
          dropTargets.set(bucketId, zone);
          zone.addEventListener('dragover', (event) => {
            event.preventDefault();
            zone.classList.add('is-over');
          });
          zone.addEventListener('dragleave', () => {
            zone.classList.remove('is-over');
          });
          zone.addEventListener('drop', (event) => {
            event.preventDefault();
            zone.classList.remove('is-over');
            const itemId = event.dataTransfer.getData('text/plain');
            if (!itemId) return;
            placeItem(itemId, bucketId);
          });
        });

        const placeItem = (itemId, bucketId) => {
          const card = widget.querySelector('[data-item-id="' + itemId + '"]');
          const target = dropTargets.get(bucketId) || dropTargets.get(null);
          if (!card || !target) return;
          card.classList.remove('is-correct', 'is-incorrect');
          target.appendChild(card);
          placements.set(itemId, bucketId);
        };

        const feedback = widget.querySelector('[data-feedback]');
        const checkBtn = widget.querySelector('button[data-action="check"]');
        const resetBtn = widget.querySelector('button[data-action="reset"]');

        const evaluate = () => {
          let total = 0;
          let correct = 0;
          cards.forEach((card) => {
            const expected = card.dataset.correct || '';
            const placement = placements.get(card.dataset.itemId) || '';
            if (!expected) return;
            total += 1;
            if (!placement) {
              card.classList.remove('is-correct', 'is-incorrect');
              return;
            }
            const isCorrect = placement === expected;
            card.classList.toggle('is-correct', isCorrect);
            card.classList.toggle('is-incorrect', !isCorrect);
            if (isCorrect) correct += 1;
          });
          if (feedback) {
            feedback.hidden = false;
            if (total === 0) {
              feedback.textContent = 'Add cards to this activity to enable feedback.';
            } else {
              feedback.textContent = 'You placed ' + correct + ' of ' + total + ' cards correctly.';
            }
          }
        };

        const reset = () => {
          cards.forEach((card) => {
            placeItem(card.dataset.itemId, null);
          });
          if (feedback) {
            feedback.hidden = true;
            feedback.textContent = '';
          }
        };

        if (checkBtn) {
          checkBtn.addEventListener('click', evaluate);
        }
        if (resetBtn) {
          resetBtn.addEventListener('click', reset);
        }

        reset();
      })();
    `
  };
};

export const dragDrop = {
  id: 'dragDrop',
  label: 'Drag & Drop',
  template,
  example,
  buildEditor,
  renderPreview,
  embedTemplate
};

