import { clone, compressImageFile, escapeHtml, uid } from '../utils.js';

const IMAGE_COMPRESSION = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.82
};

const LEFT_ARROW_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M14.7 5.3a1 1 0 0 1 0 1.4L10.41 11H18a1 1 0 1 1 0 2h-7.59l4.3 4.3a1 1 0 0 1-1.42 1.4l-6-6a1 1 0 0 1 0-1.4l6-6a1 1 0 0 1 1.42 0Z"/></svg>';
const RIGHT_ARROW_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M9.3 18.7a1 1 0 0 1 0-1.4L13.59 13H6a1 1 0 1 1 0-2h7.59L9.3 6.7a1 1 0 1 1 1.4-1.4l6 6a1 1 0 0 1 0 1.4l-6 6a1 1 0 0 1-1.4 0Z"/></svg>';

const defaultPrompts = [
  'What headline-worthy caption would help classmates notice the key idea?',
  'Summarise the action in one sentence that connects back to the concept.',
  'How would you describe this scene to someone who could not see it?',
  'Write a caption that spotlights the most important detail in this image.'
];

const createCaptionEntry = (overrides = {}, index = 0) => {
  const base = {
    id: uid('caption-entry'),
    text: index === 0 ? 'Add learner captions from the viewer. They will appear here.' : '',
    createdAt: new Date().toISOString()
  };
  const entry = { ...base, ...overrides };
  if (!entry.id) {
    entry.id = uid('caption-entry');
  }
  entry.text = typeof entry.text === 'string' ? entry.text : '';
  entry.createdAt = typeof entry.createdAt === 'string' ? entry.createdAt : new Date().toISOString();
  return entry;
};

const normaliseCaptions = (captions = []) => {
  if (!Array.isArray(captions)) {
    return [];
  }
  return captions
    .map((entry, index) => createCaptionEntry(entry, index))
    .filter((entry) => typeof entry.text === 'string');
};

const createImageItem = (overrides = {}, index = 0) => {
  const base = {
    id: uid('caption-image'),
    imageUrl: '',
    altText: '',
    prompt: defaultPrompts[index % defaultPrompts.length] || '',
    captions: []
  };
  const item = { ...base, ...overrides };
  if (!item.id) {
    item.id = uid('caption-image');
  }
  item.imageUrl = typeof item.imageUrl === 'string' ? item.imageUrl : '';
  item.altText = typeof item.altText === 'string' ? item.altText : '';
  item.prompt = typeof item.prompt === 'string' ? item.prompt : '';
  item.captions = normaliseCaptions(item.captions);
  return item;
};

const normaliseImages = (images = []) => {
  if (!Array.isArray(images)) {
    return [];
  }
  return images.map((image, index) => createImageItem(image, index));
};

const ensureWorkingState = (data) => {
  const safe = data ? clone(data) : {};
  const working = {
    prompt:
      typeof safe.prompt === 'string'
        ? safe.prompt
        : 'Invite learners to decode each image by writing a caption that spotlights the key idea.',
    images: normaliseImages(safe.images)
  };
  if (!working.images.length) {
    working.images.push(createImageItem({}, 0));
  }
  return working;
};

const template = () => ({
  prompt: 'Ask learners to write a compelling caption that captures the core concept in each image.',
  images: normaliseImages([
    {
      imageUrl:
        'https://images.unsplash.com/photo-1517520287167-4bbf64a00d66?auto=format&fit=crop&w=900&q=80',
      altText: 'Students analysing sticky notes on a wall during a design workshop',
      prompt: 'How could you caption this moment to highlight the collaborative strategy at play?',
      captions: []
    },
    {
      imageUrl:
        'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80',
      altText: 'Instructor guiding a small group discussion in a classroom',
      prompt: 'What caption would connect this scene to today\'s learning goal?',
      captions: []
    }
  ])
});

const example = () => ({
  prompt: 'Craft a caption for each photo that would help a future student recall the instructional move shown.',
  images: normaliseImages([
    {
      imageUrl:
        'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=900&q=80',
      altText: 'Students huddled around a laptop while prototyping a project',
      prompt: 'How does this team make their brainstorming visible?',
      captions: [
        {
          id: uid('caption-entry'),
          text: 'Team sync: documenting every idea before narrowing options keeps quieter voices in the mix.',
          createdAt: new Date().toISOString()
        },
        {
          id: uid('caption-entry'),
          text: 'Capturing feedback in a shared doc ensures iteration pathways stay transparent.',
          createdAt: new Date().toISOString()
        }
      ]
    },
    {
      imageUrl:
        'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=900&q=80',
      altText: 'Teacher facilitating a seminar with students seated around a table',
      prompt: 'What cues in this scene show that the discussion is student-driven?',
      captions: [
        {
          id: uid('caption-entry'),
          text: 'Facilitator fades while students cite peers to build a shared theory.',
          createdAt: new Date().toISOString()
        }
      ]
    }
  ])
});

const buildEditor = (container, data, onUpdate) => {
  const working = ensureWorkingState(data);

  const emit = (refresh = true) => {
    onUpdate(clone(working));
    if (refresh) {
      rerender();
    }
  };

  const handleImageUpload = async (index, file) => {
    if (!file) {
      return;
    }
    try {
      const dataUrl = await compressImageFile(file, IMAGE_COMPRESSION);
      working.images[index].imageUrl = dataUrl;
      emit();
    } catch (error) {
      console.error('Unable to process uploaded image.', error);
    }
  };

  const rerender = () => {
    container.innerHTML = '';

    const instructionsField = document.createElement('label');
    instructionsField.className = 'field';
    instructionsField.innerHTML = '<span class="field-label">Instructions for learners</span>';
    const instructionsInput = document.createElement('textarea');
    instructionsInput.rows = 2;
    instructionsInput.placeholder = 'Tell learners what to pay attention to as they write captions.';
    instructionsInput.value = working.prompt;
    instructionsInput.addEventListener('input', () => {
      working.prompt = instructionsInput.value;
      emit(false);
    });
    instructionsField.append(instructionsInput);
    container.append(instructionsField);

    working.images.forEach((image, index) => {
      const item = document.createElement('div');
      item.className = 'editor-item';

      const header = document.createElement('div');
      header.className = 'editor-item-header';
      header.innerHTML = `<span>Image ${index + 1}</span>`;

      const actions = document.createElement('div');
      actions.className = 'editor-item-actions';

      const createIconButton = (label, pathData) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'muted-button icon-button';
        button.setAttribute('aria-label', label);
        button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="${pathData}" /></svg>`;
        return button;
      };

      const upButton = createIconButton('Move image up', 'M12 6L7 11h10l-5-5z');
      upButton.disabled = index === 0;
      upButton.addEventListener('click', () => {
        if (index === 0) return;
        const [entry] = working.images.splice(index, 1);
        working.images.splice(index - 1, 0, entry);
        emit();
      });

      const downButton = createIconButton('Move image down', 'M12 18l5-5H7l5 5z');
      downButton.disabled = index === working.images.length - 1;
      downButton.addEventListener('click', () => {
        if (index >= working.images.length - 1) return;
        const [entry] = working.images.splice(index, 1);
        working.images.splice(index + 1, 0, entry);
        emit();
      });

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'muted-button';
      deleteButton.textContent = 'Delete';
      deleteButton.disabled = working.images.length <= 1;
      deleteButton.addEventListener('click', () => {
        if (working.images.length <= 1) {
          return;
        }
        working.images.splice(index, 1);
        emit();
      });

      actions.append(upButton, downButton, deleteButton);
      header.append(actions);
      item.append(header);

      const preview = document.createElement('div');
      preview.className = 'caption-editor-preview';
      if (image.imageUrl) {
        preview.innerHTML = `<img src="${escapeHtml(image.imageUrl)}" alt="" />`;
      } else {
        preview.innerHTML = '<div class="caption-editor-placeholder">Upload an image to see it here.</div>';
      }
      item.append(preview);

      const uploadField = document.createElement('label');
      uploadField.className = 'field';
      uploadField.innerHTML = '<span class="field-label">Upload image</span>';
      const uploadInput = document.createElement('input');
      uploadInput.type = 'file';
      uploadInput.accept = 'image/*';
      uploadInput.addEventListener('change', async (event) => {
        const [file] = event.target.files || [];
        if (!file) return;
        await handleImageUpload(index, file);
        event.target.value = '';
      });
      uploadField.append(uploadInput);

      const imageField = document.createElement('label');
      imageField.className = 'field';
      imageField.innerHTML = '<span class="field-label">Image URL</span>';
      const imageInput = document.createElement('input');
      imageInput.type = 'url';
      imageInput.placeholder = 'https://…';
      imageInput.value = image.imageUrl;
      imageInput.addEventListener('input', () => {
        working.images[index].imageUrl = imageInput.value;
        emit(false);
      });
      imageField.append(imageInput);

      const altField = document.createElement('label');
      altField.className = 'field';
      altField.innerHTML = '<span class="field-label">Alt text</span>';
      const altInput = document.createElement('textarea');
      altInput.rows = 2;
      altInput.placeholder = 'Describe what is essential in this image for non-visual readers.';
      altInput.value = image.altText;
      altInput.addEventListener('input', () => {
        working.images[index].altText = altInput.value;
        emit(false);
      });
      altField.append(altInput);

      const promptField = document.createElement('label');
      promptField.className = 'field';
      promptField.innerHTML = '<span class="field-label">Caption prompt</span>';
      const promptInput = document.createElement('textarea');
      promptInput.rows = 2;
      promptInput.placeholder = 'Guide learners on what to notice or explain in their caption.';
      promptInput.value = image.prompt;
      promptInput.addEventListener('input', () => {
        working.images[index].prompt = promptInput.value;
        emit(false);
      });
      promptField.append(promptInput);

      item.append(uploadField, imageField, altField, promptField);

      if (image.captions.length) {
        const archive = document.createElement('details');
        archive.className = 'caption-editor-archive';

        const summary = document.createElement('summary');
        summary.className = 'caption-editor-archive-summary';
        summary.textContent = `${image.captions.length} saved caption${image.captions.length === 1 ? '' : 's'}`;
        archive.append(summary);

        const list = document.createElement('ul');
        list.className = 'caption-editor-archive-list';
        image.captions.forEach((caption, captionIndex) => {
          const entry = document.createElement('li');
          entry.className = 'caption-editor-archive-item';

          const text = document.createElement('p');
          text.textContent = caption.text || '(Empty caption)';
          entry.append(text);

          if (caption.createdAt) {
            const meta = document.createElement('p');
            meta.className = 'caption-editor-archive-meta';
            meta.textContent = `Saved ${new Date(caption.createdAt).toLocaleString()}`;
            entry.append(meta);
          }

          const remove = document.createElement('button');
          remove.type = 'button';
          remove.className = 'muted-button';
          remove.textContent = 'Remove';
          remove.addEventListener('click', () => {
            working.images[index].captions.splice(captionIndex, 1);
            emit();
          });
          entry.append(remove);

          list.append(entry);
        });
        archive.append(list);
        item.append(archive);
      }

      container.append(item);
    });

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'ghost-button';
    addBtn.textContent = 'Add image';
    addBtn.addEventListener('click', () => {
      working.images.push(createImageItem({}, working.images.length));
      emit();
    });
    container.append(addBtn);
  };

  rerender();
};

const renderPreview = (container, data) => {
  container.innerHTML = '';
  const working = ensureWorkingState(data);
  const images = working.images.map((image) => ({
    id: image.id,
    imageUrl: image.imageUrl,
    altText: image.altText,
    prompt: image.prompt,
    captions: image.captions.map((caption) => ({
      id: caption.id,
      text: caption.text,
      createdAt: caption.createdAt
    }))
  }));

  const wrapper = document.createElement('div');
  wrapper.className = 'caption-this-preview';

  if (working.prompt) {
    const intro = document.createElement('p');
    intro.className = 'caption-this-prompt';
    intro.textContent = working.prompt;
    wrapper.append(intro);
  }

  const stage = document.createElement('div');
  stage.className = 'caption-this-stage';

  const prevButton = document.createElement('button');
  prevButton.type = 'button';
  prevButton.className = 'caption-this-nav';
  prevButton.innerHTML = LEFT_ARROW_ICON;
  stage.append(prevButton);

  const figure = document.createElement('figure');
  figure.className = 'caption-this-figure';

  const imageEl = document.createElement('img');
  imageEl.className = 'caption-this-image';
  imageEl.hidden = true;

  const placeholder = document.createElement('div');
  placeholder.className = 'caption-this-placeholder';
  placeholder.textContent = 'Add image URLs in the editor to see them in the preview.';

  const imagePrompt = document.createElement('figcaption');
  imagePrompt.className = 'caption-this-image-prompt';
  imagePrompt.hidden = true;

  figure.append(imageEl, placeholder, imagePrompt);
  stage.append(figure);

  const nextButton = document.createElement('button');
  nextButton.type = 'button';
  nextButton.className = 'caption-this-nav';
  nextButton.innerHTML = RIGHT_ARROW_ICON;
  stage.append(nextButton);

  wrapper.append(stage);

  const indicator = document.createElement('div');
  indicator.className = 'caption-this-indicator';
  indicator.hidden = !images.length;
  wrapper.append(indicator);

  const actions = document.createElement('div');
  actions.className = 'caption-this-actions';

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'caption-this-button';
  addButton.textContent = 'Add a caption';

  const toggleButton = document.createElement('button');
  toggleButton.type = 'button';
  toggleButton.className = 'caption-this-button';
  toggleButton.textContent = 'View captions';
  toggleButton.setAttribute('aria-expanded', 'false');

  actions.append(addButton, toggleButton);
  wrapper.append(actions);

  const form = document.createElement('form');
  form.className = 'caption-this-form';
  form.hidden = true;
  form.noValidate = true;

  const label = document.createElement('label');
  label.className = 'caption-this-form-label';
  label.innerHTML = '<span>Write your caption</span>';

  const textarea = document.createElement('textarea');
  textarea.rows = 3;
  textarea.maxLength = 240;
  textarea.placeholder = 'Describe what you notice or why it matters.';
  textarea.required = true;
  label.append(textarea);

  const formActions = document.createElement('div');
  formActions.className = 'caption-this-form-actions';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.textContent = 'Submit';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Cancel';

  formActions.append(submitBtn, cancelBtn);
  form.append(label, formActions);
  wrapper.append(form);

  const listWrapper = document.createElement('div');
  listWrapper.className = 'caption-this-list';
  listWrapper.hidden = true;

  const emptyState = document.createElement('p');
  emptyState.className = 'caption-this-empty';
  emptyState.textContent = 'No captions yet. Learners will see their submissions here.';

  const list = document.createElement('ul');
  list.className = 'caption-this-captions';

  listWrapper.append(emptyState, list);
  wrapper.append(listWrapper);

  container.append(wrapper);

  const state = {
    index: 0,
    showForm: false,
    showList: false,
    images
  };

  const getActiveImage = () => state.images[state.index] || null;

  const syncIndex = () => {
    if (state.index >= state.images.length) {
      state.index = Math.max(0, state.images.length - 1);
    }
  };

  const renderIndicator = () => {
    if (!state.images.length) {
      indicator.hidden = true;
      indicator.textContent = '';
      return;
    }
    indicator.hidden = false;
    indicator.textContent = `${state.index + 1} of ${state.images.length}`;
  };

  const renderImage = () => {
    const active = getActiveImage();
    if (!active || !active.imageUrl) {
      imageEl.hidden = true;
      imageEl.src = '';
      placeholder.hidden = false;
      placeholder.textContent = state.images.length
        ? 'Add an image URL in the editor to see it in the preview.'
        : 'Add image URLs in the editor to see them in the preview.';
    } else {
      imageEl.hidden = false;
      imageEl.src = active.imageUrl;
      imageEl.alt = active.altText || '';
      placeholder.hidden = true;
    }
    if (active && active.prompt) {
      imagePrompt.hidden = false;
      imagePrompt.textContent = active.prompt;
    } else {
      imagePrompt.hidden = true;
      imagePrompt.textContent = '';
    }

    prevButton.disabled = state.index <= 0 || state.images.length <= 1;
    nextButton.disabled = state.index >= state.images.length - 1 || state.images.length <= 1;
    addButton.disabled = !active;
    toggleButton.disabled = !active;
    if (!active) {
      state.showForm = false;
      state.showList = false;
    }
  };

  const renderCaptions = () => {
    const active = getActiveImage();
    list.innerHTML = '';
    if (!active || !active.captions.length) {
      emptyState.hidden = false;
    } else {
      emptyState.hidden = true;
      active.captions.forEach((caption) => {
        const entry = document.createElement('li');
        entry.className = 'caption-this-caption';
        const text = document.createElement('p');
        text.textContent = caption.text;
        entry.append(text);
        if (caption.createdAt) {
          const meta = document.createElement('p');
          meta.className = 'caption-this-caption-meta';
          const time = new Date(caption.createdAt);
          meta.textContent = Number.isFinite(time.valueOf())
            ? `Saved ${time.toLocaleString()}`
            : 'Saved caption';
          entry.append(meta);
        }
        list.append(entry);
      });
    }
    listWrapper.hidden = !state.showList || !active;
    toggleButton.textContent = state.showList ? 'Hide captions' : 'View captions';
    toggleButton.setAttribute('aria-expanded', state.showList ? 'true' : 'false');
  };

  const updateForm = () => {
    form.hidden = !state.showForm || !getActiveImage();
    if (form.hidden) {
      textarea.value = '';
    } else {
      requestAnimationFrame(() => textarea.focus());
    }
  };

  const render = () => {
    syncIndex();
    renderIndicator();
    renderImage();
    renderCaptions();
    updateForm();
  };

  prevButton.addEventListener('click', () => {
    if (state.index > 0) {
      state.index -= 1;
      state.showForm = false;
      state.showList = false;
      render();
    }
  });

  nextButton.addEventListener('click', () => {
    if (state.index < state.images.length - 1) {
      state.index += 1;
      state.showForm = false;
      state.showList = false;
      render();
    }
  });

  addButton.addEventListener('click', () => {
    if (!getActiveImage()) {
      return;
    }
    state.showForm = true;
    state.showList = false;
    render();
  });

  toggleButton.addEventListener('click', () => {
    if (!getActiveImage()) {
      return;
    }
    state.showList = !state.showList;
    if (state.showList) {
      state.showForm = false;
    }
    render();
  });

  cancelBtn.addEventListener('click', () => {
    state.showForm = false;
    textarea.value = '';
    render();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = textarea.value.trim();
    if (!value) {
      return;
    }
    const active = getActiveImage();
    if (!active) {
      return;
    }
    active.captions.push({ id: uid('preview-caption'), text: value, createdAt: new Date().toISOString() });
    textarea.value = '';
    state.showForm = false;
    state.showList = true;
    render();
  });

  render();
};

const serializeForScript = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

const embedTemplate = (data, containerId, context = {}) => {
  const working = ensureWorkingState(data);
  const images = working.images.map((image) => ({
    id: image.id,
    imageUrl: image.imageUrl,
    altText: image.altText,
    prompt: image.prompt,
    captions: image.captions.map((caption) => ({
      id: caption.id,
      text: caption.text,
      createdAt: caption.createdAt
    }))
  }));

  const projectKey =
    typeof context.projectId === 'string' && context.projectId.trim()
      ? context.projectId.trim()
      : typeof context.payload?.id === 'string'
      ? context.payload.id
      : null;
  const storageKey = projectKey ? `canvas-designer:caption-this:${projectKey}` : null;

  const scriptData = {
    prompt: working.prompt,
    images,
    storageKey
  };

  const html = `
    <section class="cd-caption-this" aria-live="polite">
      ${
        working.prompt
          ? `<p class="cd-caption-intro">${escapeHtml(working.prompt)}</p>`
          : ''
      }
      <div class="cd-caption-frame">
        <button type="button" class="cd-caption-nav cd-caption-prev" aria-label="Previous image">${LEFT_ARROW_ICON}</button>
        <figure class="cd-caption-figure" data-figure>
          <img data-image alt="" hidden />
          <div class="cd-caption-placeholder" data-placeholder hidden>Loading image…</div>
          <figcaption class="cd-caption-image-prompt" data-image-prompt hidden></figcaption>
        </figure>
        <button type="button" class="cd-caption-nav cd-caption-next" aria-label="Next image">${RIGHT_ARROW_ICON}</button>
      </div>
      <div class="cd-caption-indicator" data-indicator ${
        images.length ? '' : 'hidden'
      }>${images.length ? `1 of ${images.length}` : ''}</div>
      <div class="cd-caption-actions">
        <button type="button" class="cd-caption-button" data-add>Add a caption</button>
        <button type="button" class="cd-caption-button" data-toggle aria-expanded="false">View captions</button>
      </div>
      <form class="cd-caption-form" data-form novalidate hidden>
        <label class="cd-caption-form-label">
          <span>Write your caption</span>
          <textarea rows="3" maxlength="240" placeholder="Describe what you notice or why it matters." required></textarea>
        </label>
        <div class="cd-caption-form-actions">
          <button type="submit">Submit</button>
          <button type="button" data-cancel>Cancel</button>
        </div>
      </form>
      <div class="cd-caption-list" data-list hidden>
        <p class="cd-caption-empty">No captions yet. Be the first to share one.</p>
        <ul class="cd-caption-items" data-items></ul>
      </div>
      <script type="application/json" data-caption-this>${serializeForScript(scriptData)}</script>
    </section>
  `;

  const css = `
    #${containerId} [hidden] {
      display: none !important;
    }
    #${containerId} .cd-caption-this {
      display: grid;
      gap: 1.25rem;
    }
    #${containerId} .cd-caption-intro {
      margin: 0;
      font-size: 0.98rem;
      color: rgba(15, 23, 42, 0.82);
    }
    #${containerId} .cd-caption-frame {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 0.75rem;
    }
    #${containerId} .cd-caption-nav {
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 999px;
      border: 1px solid rgba(79, 70, 229, 0.3);
      background: rgba(79, 70, 229, 0.1);
      color: #4338ca;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
    }
    #${containerId} .cd-caption-nav:hover,
    #${containerId} .cd-caption-nav:focus-visible {
      transform: translateY(-1px);
      box-shadow: 0 12px 22px rgba(79, 70, 229, 0.25);
      background: rgba(79, 70, 229, 0.18);
    }
    #${containerId} .cd-caption-nav[disabled] {
      opacity: 0.45;
      pointer-events: none;
    }
    #${containerId} .cd-caption-figure {
      margin: 0;
      position: relative;
      display: grid;
      gap: 0.75rem;
      text-align: center;
    }
    #${containerId} .cd-caption-figure img {
      width: 100%;
      max-height: 360px;
      object-fit: cover;
      border-radius: 16px;
    }
    #${containerId} .cd-caption-placeholder {
      min-height: 200px;
      display: grid;
      place-items: center;
      padding: 1.5rem;
      border-radius: 16px;
      border: 1px dashed rgba(148, 163, 184, 0.6);
      color: rgba(30, 41, 59, 0.7);
      font-size: 0.95rem;
      background: rgba(241, 245, 249, 0.7);
    }
    #${containerId} .cd-caption-image-prompt {
      margin: 0;
      padding: 0.75rem 1rem;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid rgba(148, 163, 184, 0.35);
      font-weight: 600;
      color: rgba(15, 23, 42, 0.82);
    }
    #${containerId} .cd-caption-indicator {
      text-align: center;
      font-weight: 600;
      color: rgba(15, 23, 42, 0.82);
    }
    #${containerId} .cd-caption-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.75rem;
    }
    #${containerId} .cd-caption-button {
      border-radius: 999px;
      border: 1px solid rgba(14, 165, 233, 0.4);
      padding: 0.55rem 1.4rem;
      background: rgba(14, 165, 233, 0.12);
      color: #0f172a;
      font-weight: 600;
      cursor: pointer;
      transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
    }
    #${containerId} .cd-caption-button:hover,
    #${containerId} .cd-caption-button:focus-visible {
      transform: translateY(-1px);
      background: rgba(14, 165, 233, 0.2);
      box-shadow: 0 10px 20px rgba(14, 165, 233, 0.24);
    }
    #${containerId} .cd-caption-button[disabled] {
      opacity: 0.5;
      pointer-events: none;
    }
    #${containerId} .cd-caption-form {
      display: grid;
      gap: 0.75rem;
      padding: 1rem;
      border-radius: 14px;
      border: 1px dashed rgba(14, 165, 233, 0.45);
      background: rgba(59, 130, 246, 0.08);
    }
    #${containerId} .cd-caption-form-label {
      display: grid;
      gap: 0.4rem;
      font-size: 0.92rem;
      color: rgba(15, 23, 42, 0.8);
    }
    #${containerId} .cd-caption-form textarea {
      border-radius: 10px;
      border: 1px solid rgba(148, 163, 184, 0.55);
      padding: 0.6rem 0.75rem;
      font-family: inherit;
      resize: vertical;
      min-height: 90px;
    }
    #${containerId} .cd-caption-form-actions {
      display: flex;
      gap: 0.6rem;
      justify-content: flex-end;
    }
    #${containerId} .cd-caption-form-actions button {
      border-radius: 999px;
      border: none;
      padding: 0.45rem 1.1rem;
      font-weight: 600;
      cursor: pointer;
    }
    #${containerId} .cd-caption-form-actions button[type='submit'] {
      background: rgba(59, 130, 246, 0.95);
      color: #fff;
    }
    #${containerId} .cd-caption-form-actions button[data-cancel] {
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid rgba(148, 163, 184, 0.4);
      color: rgba(30, 41, 59, 0.78);
    }
    #${containerId} .cd-caption-list {
      display: grid;
      gap: 0.75rem;
      border-radius: 14px;
      border: 1px solid rgba(148, 163, 184, 0.28);
      background: rgba(255, 255, 255, 0.95);
      padding: 1rem;
    }
    #${containerId} .cd-caption-empty {
      margin: 0;
      font-size: 0.92rem;
      color: rgba(71, 85, 105, 0.72);
    }
    #${containerId} .cd-caption-items {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.6rem;
    }
    #${containerId} .cd-caption-entry,
    #${containerId} .cd-caption-items li {
      border-radius: 12px;
      border: 1px solid rgba(99, 102, 241, 0.22);
      background: rgba(99, 102, 241, 0.06);
      padding: 0.75rem 0.9rem;
      text-align: left;
    }
    #${containerId} .cd-caption-items li p {
      margin: 0;
      color: rgba(15, 23, 42, 0.85);
    }
    #${containerId} .cd-caption-items li .cd-caption-meta {
      margin: 0.35rem 0 0;
      font-size: 0.8rem;
      color: rgba(30, 41, 59, 0.62);
    }
    @media (max-width: 640px) {
      #${containerId} .cd-caption-frame {
        grid-template-columns: 1fr;
      }
      #${containerId} .cd-caption-nav {
        width: 2.5rem;
        height: 2.5rem;
        justify-self: center;
      }
      #${containerId} .cd-caption-figure {
        order: -1;
      }
    }
  `;

  const js = `(() => {
    const root = document.getElementById('${containerId}');
    if (!root) return;
    const dataNode = root.querySelector('[data-caption-this]');
    if (!dataNode) return;
    let data;
    try {
      data = JSON.parse(dataNode.textContent || '{}');
    } catch (error) {
      console.warn('Unable to parse caption data', error);
      return;
    }
    dataNode.remove();
    const images = Array.isArray(data.images)
      ? data.images.map((image) => ({
          id: image.id,
          imageUrl: image.imageUrl,
          altText: image.altText,
          prompt: image.prompt,
          captions: Array.isArray(image.captions)
            ? image.captions.map((caption) => ({
                id: caption.id,
                text: caption.text,
                createdAt: caption.createdAt,
                source: 'author'
              }))
            : []
        }))
      : [];

    const storageKey = typeof data.storageKey === 'string' ? data.storageKey : null;

    const loadStored = () => {
      if (!storageKey) return null;
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return null;
        return parsed;
      } catch (error) {
        console.warn('Unable to load saved captions', error);
        return null;
      }
    };

    const mergeStored = (stored) => {
      if (!Array.isArray(stored)) return;
      stored.forEach((entry) => {
        const image = images.find((item) => item.id === entry.id);
        if (!image || !Array.isArray(entry.captions)) return;
        entry.captions.forEach((caption) => {
          if (!caption || typeof caption.text !== 'string') return;
          image.captions.push({
            id: caption.id || 'caption-' + Math.random().toString(36).slice(2),
            text: caption.text,
            createdAt: caption.createdAt || new Date().toISOString(),
            source: 'learner'
          });
        });
      });
    };

    const saveStored = () => {
      if (!storageKey) return;
      try {
        const payload = images.map((image) => ({
          id: image.id,
          captions: image.captions
            .filter((caption) => caption.source === 'learner')
            .map((caption) => ({
              id: caption.id,
              text: caption.text,
              createdAt: caption.createdAt
            }))
        }));
        window.localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch (error) {
        console.warn('Unable to save captions', error);
      }
    };

    mergeStored(loadStored());

    const figure = root.querySelector('[data-figure]');
    const imageEl = figure ? figure.querySelector('[data-image]') : null;
    const placeholder = figure ? figure.querySelector('[data-placeholder]') : null;
    const prompt = figure ? figure.querySelector('[data-image-prompt]') : null;
    const indicator = root.querySelector('[data-indicator]');
    const addButton = root.querySelector('[data-add]');
    const toggleButton = root.querySelector('[data-toggle]');
    const form = root.querySelector('[data-form]');
    const textarea = form ? form.querySelector('textarea') : null;
    const cancelButton = form ? form.querySelector('[data-cancel]') : null;
    const listWrapper = root.querySelector('[data-list]');
    const list = listWrapper ? listWrapper.querySelector('[data-items]') : null;
    const emptyState = listWrapper ? listWrapper.querySelector('.cd-caption-empty') : null;
    const prevButton = root.querySelector('.cd-caption-prev');
    const nextButton = root.querySelector('.cd-caption-next');

    if (!indicator || !addButton || !toggleButton || !form || !textarea || !cancelButton || !listWrapper || !list) {
      return;
    }

    const state = {
      index: 0,
      showForm: false,
      showList: false
    };

    const getActive = () => images[state.index] || null;

    const ensureIndex = () => {
      if (state.index >= images.length) {
        state.index = Math.max(0, images.length - 1);
      }
    };

    const formatTimestamp = (value) => {
      const date = value ? new Date(value) : null;
      if (!date || !Number.isFinite(date.valueOf())) {
        return '';
      }
      try {
        return new Intl.DateTimeFormat(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short'
        }).format(date);
      } catch (error) {
        return date.toLocaleString();
      }
    };

    const renderIndicator = () => {
      if (!images.length) {
        indicator.hidden = true;
        indicator.textContent = '';
        return;
      }
      indicator.hidden = false;
      indicator.textContent = (state.index + 1) + ' of ' + images.length;
    };

    const renderImage = () => {
      const active = getActive();
      if (!imageEl || !placeholder || !prompt) return;
      if (!active || !active.imageUrl) {
        imageEl.hidden = true;
        imageEl.removeAttribute('src');
        placeholder.hidden = false;
        placeholder.textContent = images.length
          ? 'Add an image URL in the authoring view to display it here.'
          : 'No images available yet.';
      } else {
        imageEl.hidden = false;
        imageEl.src = active.imageUrl;
        imageEl.alt = active.altText || '';
        placeholder.hidden = true;
      }
      if (active && active.prompt) {
        prompt.hidden = false;
        prompt.textContent = active.prompt;
      } else {
        prompt.hidden = true;
        prompt.textContent = '';
      }
      if (prevButton) {
        prevButton.disabled = state.index <= 0 || images.length <= 1;
      }
      if (nextButton) {
        nextButton.disabled = state.index >= images.length - 1 || images.length <= 1;
      }
      addButton.disabled = !active;
      toggleButton.disabled = !active;
      if (!active) {
        state.showForm = false;
        state.showList = false;
      }
    };

    const renderCaptions = () => {
      const active = getActive();
      list.innerHTML = '';
      if (!active || !active.captions.length) {
        if (emptyState) emptyState.hidden = false;
      } else {
        if (emptyState) emptyState.hidden = true;
        active.captions.forEach((caption) => {
          if (!caption || typeof caption.text !== 'string') return;
          const item = document.createElement('li');
          item.className = 'cd-caption-entry';
          const text = document.createElement('p');
          text.textContent = caption.text;
          item.append(text);
          const formatted = formatTimestamp(caption.createdAt);
          if (formatted) {
            const meta = document.createElement('p');
            meta.className = 'cd-caption-meta';
            meta.textContent = 'Saved ' + formatted;
            item.append(meta);
          }
          list.append(item);
        });
      }
      listWrapper.hidden = !state.showList || !active;
      toggleButton.textContent = state.showList ? 'Hide captions' : 'View captions';
      toggleButton.setAttribute('aria-expanded', state.showList ? 'true' : 'false');
    };

    const updateForm = () => {
      const active = getActive();
      form.hidden = !state.showForm || !active;
      if (form.hidden) {
        textarea.value = '';
      } else {
        setTimeout(() => textarea.focus({ preventScroll: true }), 0);
      }
    };

    const render = () => {
      ensureIndex();
      renderIndicator();
      renderImage();
      renderCaptions();
      updateForm();
    };

    if (prevButton) {
      prevButton.addEventListener('click', () => {
        if (state.index > 0) {
          state.index -= 1;
          state.showForm = false;
          state.showList = false;
          render();
        }
      });
    }

    if (nextButton) {
      nextButton.addEventListener('click', () => {
        if (state.index < images.length - 1) {
          state.index += 1;
          state.showForm = false;
          state.showList = false;
          render();
        }
      });
    }

    addButton.addEventListener('click', () => {
      if (!getActive()) return;
      state.showForm = true;
      state.showList = false;
      render();
    });

    toggleButton.addEventListener('click', () => {
      if (!getActive()) return;
      state.showList = !state.showList;
      if (state.showList) {
        state.showForm = false;
      }
      render();
    });

    cancelButton.addEventListener('click', () => {
      state.showForm = false;
      textarea.value = '';
      render();
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = textarea.value.trim();
      if (!value) return;
      const active = getActive();
      if (!active) return;
      const entry = {
        id:
          'caption-' +
          Date.now().toString(36) +
          '-' +
          Math.random()
            .toString(36)
            .slice(2, 6),
        text: value,
        createdAt: new Date().toISOString(),
        source: 'learner'
      };
      active.captions.push(entry);
      textarea.value = '';
      state.showForm = false;
      state.showList = true;
      saveStored();
      render();
    });

    render();
  })();`;

  return { html, css, js };
};

const learningTip = {
  intro: 'Learners decode imagery and surface key ideas by composing captions that connect visuals to course concepts.',
  when: 'Use Caption This after demonstrations, lab walkthroughs, or field observations so students articulate what matters most in each moment.',
  considerations: [
    'Model a caption that names the technique or principle you want learners to highlight.',
    'Encourage pairs to compare captions and note which ideas or vocabulary surfaced.',
    'Invite a quick share-out where the class chooses a caption that best explains the scene for future students.'
  ],
  examples: [
    'Science lab: caption each step of a titration to reinforce safety and measurement precision.',
    'History seminar: write captions that frame primary source photos with the relevant context or point of view.',
    'Clinical simulations: describe the critical patient cue or care decision visible in the still image.'
  ]
};

export const captionThis = {
  id: 'captionThis',
  label: 'Caption this',
  template,
  example,
  buildEditor,
  renderPreview,
  embedTemplate,
  learningTip
};
