import { clone, uid, escapeHtml } from '../utils.js';

const template = () => ({
  prompt: 'Sort each card into the matching category.',
  instructions: 'Drag items from the tray into the drop zones. There may be more than one correct answer per zone.',
  buckets: [
    { id: uid('bucket'), title: 'Category A', description: 'Use this zone for items that belong in group A.' },
    { id: uid('bucket'), title: 'Category B', description: 'Place group B items here.' }
  ],
  items: [
    { id: uid('item'), text: 'Example card 1', correctBucketId: null },
    { id: uid('item'), text: 'Example card 2', correctBucketId: null }
  ]
});

const example = () => ({
  prompt: 'Match each moon to the correct planet.',
  instructions: 'Drag every moon to the planet it orbits.',
  buckets: [
    { id: uid('bucket'), title: 'Mars', description: 'Moons that orbit the planet Mars.' },
    { id: uid('bucket'), title: 'Jupiter', description: 'Moons that orbit the planet Jupiter.' }
  ],
  items: [
    { id: uid('item'), text: 'Phobos', correctBucketId: null },
    { id: uid('item'), text: 'Deimos', correctBucketId: null },
    { id: uid('item'), text: 'Europa', correctBucketId: null },
    { id: uid('item'), text: 'Ganymede', correctBucketId: null }
  ]
});

const ensureDefaults = (working) => {
  working.prompt ||= '';
  working.instructions ||= '';
  working.buckets ||= [];
  working.items ||= [];
};

const buildEditor = (container, data, onUpdate) => {
  const working = clone(data);
  ensureDefaults(working);

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
    promptInput.placeholder = 'Describe the matching task.';
    promptInput.addEventListener('input', () => {
      working.prompt = promptInput.value;
      emit(false);
    });
    promptField.append(promptInput);
    container.append(promptField);

    const instructionsField = document.createElement('label');
    instructionsField.className = 'field';
    instructionsField.innerHTML = '<span class="field-label">Learner instructions</span>';
    const instructionsInput = document.createElement('textarea');
    instructionsInput.rows = 3;
    instructionsInput.value = working.instructions;
    instructionsInput.placeholder = 'Tell learners how to complete the activity.';
    instructionsInput.addEventListener('input', () => {
      working.instructions = instructionsInput.value;
      emit(false);
    });
    instructionsField.append(instructionsInput);
    container.append(instructionsField);

    const bucketGroup = document.createElement('div');
    bucketGroup.className = 'editor-group';
    const bucketHeader = document.createElement('div');
    bucketHeader.className = 'editor-item-header';
    bucketHeader.innerHTML = '<span>Drop zones</span>';

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

    const bucketHeaderActions = document.createElement('div');
    bucketHeaderActions.className = 'editor-item-actions';
    bucketHeaderActions.append(addBucketBtn);
    bucketHeader.append(bucketHeaderActions);
    bucketGroup.append(bucketHeader);

    if (working.buckets.length === 0) {
      const emptyBuckets = document.createElement('div');
      emptyBuckets.className = 'empty-state';
      emptyBuckets.innerHTML = '<p>No drop zones yet. Add at least one zone to start.</p>';
      bucketGroup.append(emptyBuckets);
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
        working.buckets.splice(index + 1, 0, {
          ...clone(bucket),
          id: uid('bucket'),
          title: `${bucket.title || `Drop zone ${index + 1}`} (copy)`
        });
        emit();
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'muted-button';
      deleteBtn.textContent = 'Remove';
      deleteBtn.addEventListener('click', () => {
        const removed = working.buckets.splice(index, 1)[0];
        working.items = working.items.map((item) =>
          item.correctBucketId === removed.id ? { ...item, correctBucketId: null } : item
        );
        emit();
      });

      itemActions.append(duplicateBtn, deleteBtn);
      itemHeader.append(itemActions);
      bucketItem.append(itemHeader);

      const titleField = document.createElement('label');
      titleField.className = 'field';
      titleField.innerHTML = '<span class="field-label">Title</span>';
      const titleInput = document.createElement('input');
      titleInput.className = 'text-input';
      titleInput.type = 'text';
      titleInput.value = bucket.title || '';
      titleInput.placeholder = `Drop zone ${index + 1}`;
      titleInput.addEventListener('input', () => {
        working.buckets[index].title = titleInput.value;
        emit(false);
      });
      titleField.append(titleInput);

      const descriptionField = document.createElement('label');
      descriptionField.className = 'field';
      descriptionField.innerHTML = '<span class="field-label">Description (optional)</span>';
      const descriptionInput = document.createElement('textarea');
      descriptionInput.rows = 2;
      descriptionInput.value = bucket.description || '';
      descriptionInput.placeholder = 'Explain what belongs in this drop zone.';
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
    itemHeader.innerHTML = '<span>Draggable items</span>';

    const addItemBtn = document.createElement('button');
    addItemBtn.type = 'button';
    addItemBtn.className = 'ghost-button';
    addItemBtn.textContent = 'Add item';
    addItemBtn.addEventListener('click', () => {
      working.items.push({ id: uid('item'), text: 'New item', correctBucketId: null });
      emit();
    });

    const itemHeaderActions = document.createElement('div');
    itemHeaderActions.className = 'editor-item-actions';
    itemHeaderActions.append(addItemBtn);
    itemHeader.append(itemHeaderActions);
    itemGroup.append(itemHeader);

    if (working.items.length === 0) {
      const emptyItems = document.createElement('div');
      emptyItems.className = 'empty-state';
      emptyItems.innerHTML = '<p>No items yet. Add draggable cards for learners to sort.</p>';
      itemGroup.append(emptyItems);
    }

    const bucketOptions = working.buckets.map((bucket) => ({ id: bucket.id, title: bucket.title }));

    working.items.forEach((item, index) => {
      const itemCard = document.createElement('div');
      itemCard.className = 'editor-item';

      const cardHeader = document.createElement('div');
      cardHeader.className = 'editor-item-header';
      cardHeader.innerHTML = `<span>Item ${index + 1}</span>`;

      const cardActions = document.createElement('div');
      cardActions.className = 'editor-item-actions';

      const duplicateItemBtn = document.createElement('button');
      duplicateItemBtn.type = 'button';
      duplicateItemBtn.className = 'muted-button';
      duplicateItemBtn.textContent = 'Duplicate';
      duplicateItemBtn.addEventListener('click', () => {
        working.items.splice(index + 1, 0, { ...clone(item), id: uid('item') });
        emit();
      });

      const deleteItemBtn = document.createElement('button');
      deleteItemBtn.type = 'button';
      deleteItemBtn.className = 'muted-button';
      deleteItemBtn.textContent = 'Remove';
      deleteItemBtn.addEventListener('click', () => {
        working.items.splice(index, 1);
        emit();
      });

      cardActions.append(duplicateItemBtn, deleteItemBtn);
      cardHeader.append(cardActions);
      itemCard.append(cardHeader);

      const textField = document.createElement('label');
      textField.className = 'field';
      textField.innerHTML = '<span class="field-label">Item text</span>';
      const textInput = document.createElement('textarea');
      textInput.rows = 2;
      textInput.value = item.text || '';
      textInput.placeholder = 'e.g. An example learners must sort';
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
      const noOption = document.createElement('option');
      noOption.value = '';
      noOption.textContent = 'No correct answer';
      correctSelect.append(noOption);
      bucketOptions.forEach((option) => {
        const opt = document.createElement('option');
        opt.value = option.id;
        opt.textContent = option.title || 'Drop zone';
        correctSelect.append(opt);
      });
      correctSelect.value = item.correctBucketId || '';
      correctSelect.addEventListener('change', () => {
        working.items[index].correctBucketId = correctSelect.value || null;
        emit(false);
      });
      correctField.append(correctSelect);

      itemCard.append(textField, correctField);
      itemGroup.append(itemCard);
    });

    container.append(itemGroup);
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
    title: sanitizeText(bucket.title) || `Drop zone ${index + 1}`,
    description: sanitizeText(bucket.description)
  }));

  const bucketIds = new Set(buckets.map((bucket) => bucket.id));
  const rawItems = Array.isArray(rawData.items)
    ? rawData.items.filter((item) => item && item.id)
    : [];
  const itemsSource = rawItems.length > 0 ? rawItems : fallbackItems;
  const items = itemsSource
    .map((item) => ({
      ...item,
      text: sanitizeText(item.text),
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

const embedTemplate = (data, containerId) => {
  const { buckets, items, prompt, instructions } = normalizePreviewData(data);

  const html = `
    <div class="cd-dragdrop" aria-live="polite">
      ${prompt ? `<div class=\"cd-dragdrop-prompt\">${escapeHtml(prompt)}</div>` : ''}
      ${instructions ? `<p class=\"cd-dragdrop-instructions\">${escapeHtml(instructions)}</p>` : ''}
      <div class="cd-dragdrop-board">
        <div class="cd-dragdrop-pool" role="list" aria-label="Unplaced items">
          ${items.map((item) => renderItemHtml(item)).join('')}
        </div>
        <div class="cd-dragdrop-buckets" role="list">
          ${buckets.map((bucket) => renderBucketHtml(bucket)).join('')}
        </div>
      </div>
    </div>
  `;

  const css = `
    #${containerId} .cd-dragdrop {
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(148, 163, 184, 0.35);
      border-radius: 1.25rem;
      padding: 1.5rem;
      box-shadow: 0 24px 48px -28px rgba(15, 23, 42, 0.35);
      display: grid;
      gap: 1.5rem;
    }
    #${containerId} .cd-dragdrop-prompt {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0;
    }
    #${containerId} .cd-dragdrop-instructions {
      margin: 0;
      color: rgba(15, 23, 42, 0.72);
    }
    #${containerId} .cd-dragdrop-board {
      display: grid;
      gap: 1.5rem;
    }
    #${containerId} .cd-dragdrop-pool {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      border: 2px dashed rgba(99, 102, 241, 0.35);
      border-radius: 1rem;
      padding: 1rem;
      background: rgba(99, 102, 241, 0.05);
      min-height: 3.75rem;
      transition: border-color 0.2s ease, background 0.2s ease;
    }
    #${containerId} .cd-dragdrop-pool.is-hovered {
      border-color: rgba(99, 102, 241, 0.6);
      background: rgba(99, 102, 241, 0.12);
    }
    #${containerId} .cd-dragdrop-pool:empty::before {
      content: 'All items placed';
      color: rgba(15, 23, 42, 0.55);
      font-size: 0.875rem;
    }
    #${containerId} .cd-dragdrop-item {
      border: 1px solid rgba(148, 163, 184, 0.55);
      border-radius: 999px;
      background: white;
      padding: 0.5rem 0.9rem;
      font-size: 0.95rem;
      cursor: grab;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      box-shadow: 0 12px 28px -22px rgba(15, 23, 42, 0.6);
    }
    #${containerId} .cd-dragdrop-item:focus {
      outline: 2px solid rgba(99, 102, 241, 0.6);
      outline-offset: 2px;
    }
    #${containerId} .cd-dragdrop-item.is-dragging {
      opacity: 0.6;
      transform: scale(0.98);
    }
    #${containerId} .cd-dragdrop-buckets {
      display: grid;
      gap: 1.2rem;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    }
    #${containerId} .cd-dragdrop-bucket {
      background: rgba(249, 250, 251, 0.92);
      border: 1px solid rgba(148, 163, 184, 0.35);
      border-radius: 1.1rem;
      padding: 1.1rem;
      display: grid;
      gap: 0.75rem;
      box-shadow: 0 20px 40px -30px rgba(15, 23, 42, 0.45);
    }
    #${containerId} .cd-dragdrop-bucket h3 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 600;
    }
    #${containerId} .cd-dragdrop-bucket p {
      margin: 0;
      font-size: 0.9rem;
      color: rgba(15, 23, 42, 0.65);
    }
    #${containerId} .cd-dragdrop-bucket-items {
      border: 2px dashed rgba(99, 102, 241, 0.35);
      border-radius: 0.9rem;
      padding: 0.85rem;
      min-height: 4rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.6rem;
      align-content: flex-start;
      background: rgba(255, 255, 255, 0.72);
      transition: border-color 0.2s ease, background 0.2s ease;
    }
    #${containerId} .cd-dragdrop-bucket-items.is-hovered {
      border-color: rgba(99, 102, 241, 0.6);
      background: rgba(99, 102, 241, 0.1);
    }
    #${containerId} .cd-dragdrop-bucket-items:empty::before {
      content: 'Drop items here';
      color: rgba(15, 23, 42, 0.55);
      font-size: 0.85rem;
    }
    @media (min-width: 900px) {
      #${containerId} .cd-dragdrop-board {
        grid-template-columns: minmax(240px, 1fr) 2fr;
        align-items: start;
      }
    }
  `;

  const js = `
    (function(){
      const root = document.getElementById('${containerId}');
      if (!root) return;

      const pool = root.querySelector('.cd-dragdrop-pool');
      let draggedId = null;

      const toggleHover = (target, value) => {
        target.classList.toggle('is-hovered', value);
      };

      const registerDropTarget = (target) => {
        target.addEventListener('dragover', (event) => {
          event.preventDefault();
          toggleHover(target, true);
        });
        target.addEventListener('dragleave', () => {
          toggleHover(target, false);
        });
        target.addEventListener('drop', (event) => {
          event.preventDefault();
          toggleHover(target, false);
          if (!draggedId) return;
          const item = root.querySelector('.cd-dragdrop-item[data-id="' + draggedId + '"]');
          if (item) {
            target.appendChild(item);
            item.focus({ preventScroll: false });
          }
        });
      };

      const items = Array.from(root.querySelectorAll('.cd-dragdrop-item'));
      items.forEach((item) => {
        item.setAttribute('draggable', 'true');
        item.addEventListener('dragstart', () => {
          draggedId = item.dataset.id;
          item.classList.add('is-dragging');
        });
        item.addEventListener('dragend', () => {
          draggedId = null;
          item.classList.remove('is-dragging');
        });
        item.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' && pool) {
            pool.appendChild(item);
            item.focus();
          }
        });
      });

      if (pool) {
        registerDropTarget(pool);
      }

      root.querySelectorAll('.cd-dragdrop-bucket-items').forEach((bucket) => {
        registerDropTarget(bucket);
      });
    })();
  `;

  return { html, css, js };
};

export const dragdrop = {
  id: 'dragdrop',
  label: 'Drag & Drop',
  template,
  example,
  buildEditor,
  renderPreview,
  embedTemplate
};
