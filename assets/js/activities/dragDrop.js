import { clone, uid, escapeHtml } from '../utils.js';

const createTemplateBuckets = () => {
  const bucketA = uid('bucket');
  const bucketB = uid('bucket');
  return {
    buckets: [
      {
        id: bucketA,
        title: 'Concepts',
        description: 'Big ideas, terms, or vocabulary.'
      },
      {
        id: bucketB,
        title: 'Examples',
        description: 'Real-world applications or evidence.'
      }
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
    return;
  }
  working.buckets = working.buckets.map((bucket, index) => ({
    id: bucket?.id || uid('bucket'),
    title: typeof bucket?.title === 'string' ? bucket.title : `Drop zone ${index + 1}`,
    description: typeof bucket?.description === 'string' ? bucket.description : ''
  }));
};

const ensureItems = (working) => {
  if (!Array.isArray(working.items)) {
    working.items = [];
  }
  if (working.items.length === 0) {
    working.items.push({
      id: uid('item'),
      text: 'New card',
      correctBucketId: working.buckets[0]?.id ?? null
    });
    return;
  }
  const bucketIds = new Set(working.buckets.map((bucket) => bucket.id));
  working.items = working.items.map((item, index) => ({
    id: item?.id || uid('item'),
    text: typeof item?.text === 'string' ? item.text : `Card ${index + 1}`,
    correctBucketId: bucketIds.has(item?.correctBucketId) ? item.correctBucketId : null
  }));
};

const ensureDefaults = (working) => {
  working.prompt = typeof working.prompt === 'string' ? working.prompt : '';
  working.instructions = typeof working.instructions === 'string' ? working.instructions : '';
  ensureBuckets(working);
  ensureItems(working);
};

const buildEditor = (container, data, onUpdate) => {
  const working = clone(data);
  ensureDefaults(working);

  const updateBucketOptions = () => {
    container.querySelectorAll('select[data-item-id]').forEach((select) => {
      const previousValue = select.value;
      const allowEmpty = select.dataset.allowEmpty === 'true';
      select.innerHTML = '';
      if (allowEmpty) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No correct answer';
        select.append(option);
      }
      working.buckets.forEach((bucket) => {
        const option = document.createElement('option');
        option.value = bucket.id;
        option.textContent = bucket.title?.trim() || 'Untitled drop zone';
        select.append(option);
      });
      if (previousValue && working.buckets.some((bucket) => bucket.id === previousValue)) {
        select.value = previousValue;
      } else {
        select.value = allowEmpty ? '' : working.buckets[0]?.id ?? '';
        const itemId = select.dataset.itemId;
        const itemIndex = working.items.findIndex((item) => item.id === itemId);
        if (itemIndex >= 0) {
          working.items[itemIndex].correctBucketId = select.value || null;
        }
      }
    });
  };

  const emit = (refresh = true) => {
    onUpdate(clone(working));
    if (refresh) {
      rerender();
    }
  };

  const rerender = () => {
    ensureDefaults(working);
    container.innerHTML = '';

    const promptField = document.createElement('label');
    promptField.className = 'field';
    promptField.innerHTML = '<span class="field-label">Prompt</span>';
    const promptInput = document.createElement('textarea');
    promptInput.rows = 2;
    promptInput.value = working.prompt;
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
    instructionInput.rows = 3;
    instructionInput.value = working.instructions;
    instructionInput.placeholder = 'Give learners a short instruction for the drag & drop task.';
    instructionInput.addEventListener('input', () => {
      working.instructions = instructionInput.value;
      emit(false);
    });
    instructionField.append(instructionInput);

    container.append(promptField, instructionField);

    const bucketGroup = document.createElement('div');
    bucketGroup.className = 'editor-group';
    const bucketHeader = document.createElement('div');
    bucketHeader.className = 'editor-item-header';
    bucketHeader.innerHTML = '<span>Drop zones</span>';

    const bucketActions = document.createElement('div');
    bucketActions.className = 'editor-item-actions';
    const addBucketBtn = document.createElement('button');
    addBucketBtn.type = 'button';
    addBucketBtn.className = 'ghost-button';
    addBucketBtn.textContent = 'Add drop zone';
    addBucketBtn.addEventListener('click', () => {
      working.buckets.push({
        id: uid('bucket'),
        title: `Drop zone ${working.buckets.length + 1}`,
        description: ''
      });
      emit();
    });
    bucketActions.append(addBucketBtn);
    bucketHeader.append(bucketActions);
    bucketGroup.append(bucketHeader);

    if (!working.buckets.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<p>No drop zones yet. Add at least one zone to start.</p>';
      bucketGroup.append(empty);
    }

    working.buckets.forEach((bucket, index) => {
      const bucketItem = document.createElement('div');
      bucketItem.className = 'editor-item';

      const itemHeader = document.createElement('div');
      itemHeader.className = 'editor-item-header';
      itemHeader.innerHTML = `<span>Drop zone ${index + 1}</span>`;

      const itemActions = document.createElement('div');
      itemActions.className = 'editor-item-actions';

      const duplicateBtn = document.createElement('button');
      duplicateBtn.type = 'button';
      duplicateBtn.className = 'muted-button';
      duplicateBtn.textContent = 'Duplicate';
      duplicateBtn.addEventListener('click', () => {
        const cloneBucket = {
          ...clone(bucket),
          id: uid('bucket'),
          title: `${bucket.title?.trim() || `Drop zone ${index + 1}`} (copy)`
        };
        working.buckets.splice(index + 1, 0, cloneBucket);
        emit();
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'muted-button';
      deleteBtn.textContent = 'Remove';
      deleteBtn.disabled = working.buckets.length <= 1;
      deleteBtn.addEventListener('click', () => {
        const removedId = working.buckets.splice(index, 1)[0]?.id;
        ensureBuckets(working);
        working.items = working.items.map((item) => {
          if (item.correctBucketId === removedId) {
            return { ...item, correctBucketId: working.buckets[0]?.id ?? null };
          }
          return item;
        });
        emit();
      });

      itemActions.append(duplicateBtn, deleteBtn);
      itemHeader.append(itemActions);
      bucketItem.append(itemHeader);

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

      bucketItem.append(titleField, descriptionField);
      bucketGroup.append(bucketItem);
    });

    container.append(bucketGroup);

    const itemGroup = document.createElement('div');
    itemGroup.className = 'editor-group';
    const itemHeader = document.createElement('div');
    itemHeader.className = 'editor-item-header';
    itemHeader.innerHTML = '<span>Draggable cards</span>';

    const itemActions = document.createElement('div');
    itemActions.className = 'editor-item-actions';
    const addItemBtn = document.createElement('button');
    addItemBtn.type = 'button';
    addItemBtn.className = 'ghost-button';
    addItemBtn.textContent = 'Add card';
    addItemBtn.addEventListener('click', () => {
      ensureBuckets(working);
      working.items.push({
        id: uid('item'),
        text: `Card ${working.items.length + 1}`,
        correctBucketId: working.buckets[0]?.id ?? null
      });
      emit();
    });
    itemActions.append(addItemBtn);
    itemHeader.append(itemActions);
    itemGroup.append(itemHeader);

    if (!working.items.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<p>No cards yet. Add draggable cards for learners to sort.</p>';
      itemGroup.append(empty);
    }

    working.items.forEach((item, index) => {
      const itemCard = document.createElement('div');
      itemCard.className = 'editor-item';

      const cardHeader = document.createElement('div');
      cardHeader.className = 'editor-item-header';
      cardHeader.innerHTML = `<span>Card ${index + 1}</span>`;

      const cardActions = document.createElement('div');
      cardActions.className = 'editor-item-actions';

      const duplicateBtn = document.createElement('button');
      duplicateBtn.type = 'button';
      duplicateBtn.className = 'muted-button';
      duplicateBtn.textContent = 'Duplicate';
      duplicateBtn.addEventListener('click', () => {
        const cloneItem = { ...clone(item), id: uid('item') };
        working.items.splice(index + 1, 0, cloneItem);
        emit();
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'muted-button';
      deleteBtn.textContent = 'Remove';
      deleteBtn.addEventListener('click', () => {
        working.items.splice(index, 1);
        if (!working.items.length) {
          ensureItems(working);
        }
        emit();
      });

      cardActions.append(duplicateBtn, deleteBtn);
      cardHeader.append(cardActions);
      itemCard.append(cardHeader);

      const textField = document.createElement('label');
      textField.className = 'field';
      textField.innerHTML = '<span class="field-label">Card text</span>';
      const textInput = document.createElement('textarea');
      textInput.rows = 2;
      textInput.value = item.text || '';
      textInput.placeholder = 'What should appear on the draggable card?';
      textInput.addEventListener('input', () => {
        working.items[index].text = textInput.value;
        emit(false);
      });
      textField.append(textInput);

      const correctField = document.createElement('label');
      correctField.className = 'field';
      correctField.innerHTML = '<span class="field-label">Correct drop zone (optional)</span>';
      const correctSelect = document.createElement('select');
      correctSelect.className = 'select-input';
      correctSelect.dataset.itemId = item.id;
      correctSelect.dataset.allowEmpty = 'true';
      correctSelect.addEventListener('change', () => {
        working.items[index].correctBucketId = correctSelect.value || null;
        emit(false);
      });
      correctField.append(correctSelect);

      itemCard.append(textField, correctField);
      itemGroup.append(itemCard);
    });

    container.append(itemGroup);
    updateBucketOptions();
  };

  rerender();
};

const EMPTY_PREVIEW_TEMPLATE = `
  <div class="preview-placeholder" role="status" aria-live="polite">
    <strong>Configure drop zones and cards</strong>
    <span>Add at least one drop zone and draggable card to generate a preview.</span>
  </div>
`;

const normalizePreviewData = (rawData = {}) => {
  const fallback = template();
  const fallbackBuckets = clone(fallback.buckets);
  const fallbackItems = clone(fallback.items);
  const sanitizeText = (value) => (typeof value === 'string' ? value.trim() : '');

  const rawBuckets = Array.isArray(rawData.buckets)
    ? rawData.buckets.filter((bucket) => bucket && bucket.id)
    : [];
  const bucketsSource = rawBuckets.length > 0 ? rawBuckets : fallbackBuckets;
  const buckets = bucketsSource.map((bucket, index) => ({
    ...bucket,
    id: bucket.id || uid('bucket'),
    title: sanitizeText(bucket.title) || `Drop zone ${index + 1}`,
    description: sanitizeText(bucket.description)
  }));

  const bucketIds = new Set(buckets.map((bucket) => bucket.id));
  const rawItems = Array.isArray(rawData.items)
    ? rawData.items.filter((item) => item && item.id)
    : [];
  const itemsSource = rawItems.length > 0 ? rawItems : fallbackItems;
  const items = itemsSource
    .map((item, index) => ({
      ...item,
      id: item.id || uid('item'),
      text: sanitizeText(item.text) || `Card ${index + 1}`,
      correctBucketId: bucketIds.has(item.correctBucketId) ? item.correctBucketId : null
    }))
    .filter((item) => item.text.length > 0);

  return {
    hasBuckets: rawBuckets.length > 0,
    hasItems: rawItems.length > 0,
    buckets,
    items,
    prompt: sanitizeText(rawData.prompt),
    instructions: sanitizeText(rawData.instructions)
  };
};

const renderPreview = (container, data) => {
  if (!container) return;
  container.innerHTML = '';

  const { hasBuckets, hasItems, buckets, items, prompt, instructions } = normalizePreviewData(data);

  if (!hasBuckets || !hasItems) {
    container.innerHTML = EMPTY_PREVIEW_TEMPLATE;
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'dragdrop-preview';

  if (prompt) {
    const promptEl = document.createElement('h3');
    promptEl.className = 'dragdrop-preview__prompt';
    promptEl.textContent = prompt;
    wrapper.append(promptEl);
  }

  if (instructions) {
    const instructionsEl = document.createElement('p');
    instructionsEl.className = 'dragdrop-preview__instructions';
    instructionsEl.textContent = instructions;
    wrapper.append(instructionsEl);
  }

  const board = document.createElement('div');
  board.className = 'dragdrop-preview__board';

  const bucketList = document.createElement('div');
  bucketList.className = 'dragdrop-preview__buckets';

  buckets.forEach((bucket) => {
    const bucketCard = document.createElement('article');
    bucketCard.className = 'dragdrop-preview__bucket';

    const heading = document.createElement('h4');
    heading.textContent = bucket.title;
    bucketCard.append(heading);

    if (bucket.description) {
      const desc = document.createElement('p');
      desc.textContent = bucket.description;
      bucketCard.append(desc);
    }

    const dropHint = document.createElement('span');
    dropHint.className = 'dragdrop-preview__hint';
    dropHint.textContent = 'Drop items here';
    bucketCard.append(dropHint);

    bucketList.append(bucketCard);
  });

  const tray = document.createElement('div');
  tray.className = 'dragdrop-preview__tray';
  tray.setAttribute('aria-label', 'Draggable items');

  items.forEach((item) => {
    const chip = document.createElement('span');
    chip.className = 'dragdrop-preview__item';
    chip.textContent = item.text;
    tray.append(chip);
  });

  board.append(bucketList, tray);
  wrapper.append(board);
  container.append(wrapper);
};

const renderBucketHtml = (bucket) => `
  <section class="cd-dragdrop-bucket" data-id="${escapeHtml(bucket.id)}">
    <header class="cd-dragdrop-bucket-header">
      <h3>${escapeHtml(bucket.title)}</h3>
      ${bucket.description ? `<p>${escapeHtml(bucket.description)}</p>` : ''}
    </header>
    <div class="cd-dragdrop-bucket-items" data-bucket-id="${escapeHtml(bucket.id)}" role="list" tabindex="0"></div>
  </section>
`;

const renderItemHtml = (item) => `
  <button class="cd-dragdrop-item" type="button" data-id="${escapeHtml(item.id)}" role="listitem">
    ${escapeHtml(item.text)}
  </button>
`;

const buildEmptyEmbed = (containerId) => ({
  html: `
    <div class="cd-dragdrop cd-dragdrop--empty" role="status" aria-live="polite">
      <strong>Configure drop zones and cards</strong>
      <p>Add at least one drop zone and draggable card to publish this activity.</p>
    </div>
  `,
  css: `
    #${containerId} .cd-dragdrop--empty {
      display: grid;
      gap: 0.5rem;
      padding: 1rem;
      border-radius: 1rem;
      border: 1px dashed rgba(99, 102, 241, 0.4);
      background: rgba(99, 102, 241, 0.08);
      color: rgba(15, 23, 42, 0.75);
      text-align: center;
      justify-items: center;
    }
    #${containerId} .cd-dragdrop--empty strong {
      font-size: 1.05rem;
    }
    #${containerId} .cd-dragdrop--empty p {
      margin: 0;
      font-size: 0.9rem;
      max-width: 24rem;
    }
  `,
  js: ''
});

const embedTemplate = (data, containerId) => {
  const { hasBuckets, hasItems, buckets, items, prompt, instructions } = normalizePreviewData(data);

  if (!hasBuckets || !hasItems) {
    return buildEmptyEmbed(containerId);
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
            const itemId = card.dataset.itemId;
            if (!itemId || !expected) {
              card.classList.remove('is-correct', 'is-incorrect');
              return;
            }
            total += 1;
            const placement = placements.get(itemId) || '';
            const isCorrect = placement === expected;
            card.classList.toggle('is-correct', isCorrect);
            card.classList.toggle('is-incorrect', !isCorrect);
            if (isCorrect) {
              correct += 1;
            }
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
