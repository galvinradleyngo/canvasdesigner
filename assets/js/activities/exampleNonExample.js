import { clone, compressImageFile, escapeHtml } from '../utils.js';

const IMAGE_COMPRESSION = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.82
};

const ensureColumn = (column = {}, defaults = {}) => {
  const working = {
    title: '',
    description: '',
    imageUrl: '',
    altText: '',
    ...column
  };

  working.title = typeof working.title === 'string' ? working.title : '';
  working.description = typeof working.description === 'string' ? working.description : '';
  working.imageUrl = typeof working.imageUrl === 'string' ? working.imageUrl : '';
  working.altText = typeof working.altText === 'string' ? working.altText : '';

  if (defaults && typeof defaults === 'object') {
    working.title = working.title || defaults.title || '';
    working.description = working.description || defaults.description || '';
  }

  return working;
};

const ensureWorkingState = (data = {}) => {
  const safe = data ? clone(data) : {};
  return {
    intro:
      typeof safe.intro === 'string'
        ? safe.intro
        : 'Contrast a strong example with a common misconception so learners can spot the difference quickly.',
    example: ensureColumn(safe.example),
    nonExample: ensureColumn(safe.nonExample)
  };
};

const template = () =>
  ensureWorkingState({
    intro:
      'Compare a model response with a common pitfall so learners can name the critical differences before they practise.',
    example: {
      title: 'Example',
      description:
        'Lists a precise claim, cites evidence, and explains why it matters. The structure makes the reasoning easy to follow.',
      imageUrl:
        'https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=900&q=80',
      altText: 'Student presenting a project board covered in sticky notes.'
    },
    nonExample: {
      title: 'Non-example',
      description:
        'States the topic but never takes a stance. Lacks evidence and leaves readers unsure what action to take next.',
      imageUrl:
        'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=900&q=80',
      altText: 'Students looking uncertain while reviewing a blank flip chart.'
    }
  });

const example = () =>
  ensureWorkingState({
    intro:
      'Use this organiser to help facilitators evaluate inquiry proposals. Ask them to annotate the example and non-example with what they notice.',
    example: {
      title: 'Example: Insightful driving question',
      description:
        '“How can we redesign the library entrance so every student feels welcomed within five seconds?” This version names the audience, defines success, and invites prototyping.',
      imageUrl:
        'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80',
      altText: 'Educator pointing at sticky notes while leading a planning session.'
    },
    nonExample: {
      title: 'Non-example: Vague project idea',
      description:
        '“Improve the school library experience.” It is broad, lacks a user to empathise with, and offers no criteria for iteration, making feedback nearly impossible.',
      imageUrl:
        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=80',
      altText: 'Group of students appearing unsure while looking at a laptop.'
    }
  });

const buildEditor = (container, data, onUpdate) => {
  const working = ensureWorkingState(data);

  const emit = (refresh = true) => {
    onUpdate(clone(working));
    if (refresh) {
      rerender();
    }
  };

  const handleImageUpload = async (key, file) => {
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file, IMAGE_COMPRESSION);
      working[key].imageUrl = dataUrl;
      emit();
    } catch (error) {
      console.error('Unable to process uploaded image.', error);
    }
  };

  const rerender = () => {
    container.innerHTML = '';

    const introField = document.createElement('label');
    introField.className = 'field';
    introField.innerHTML = '<span class="field-label">General description</span>';
    const introInput = document.createElement('textarea');
    introInput.rows = 3;
    introInput.className = 'text-input';
    introInput.placeholder = 'Set the scene and tell learners what to compare between the example and non-example.';
    introInput.value = working.intro;
    introInput.addEventListener('input', () => {
      working.intro = introInput.value;
      emit(false);
    });
    introField.append(introInput);
    container.append(introField);

    const columnsWrapper = document.createElement('div');
    columnsWrapper.className = 'example-nonexample-editor-grid';

    const buildColumnEditor = (key, label) => {
      const column = working[key];

      const section = document.createElement('section');
      section.className = 'example-nonexample-editor-section';

      const heading = document.createElement('h3');
      heading.className = 'example-nonexample-editor-heading';
      heading.textContent = label;
      section.append(heading);

      const titleField = document.createElement('label');
      titleField.className = 'field';
      titleField.innerHTML = '<span class="field-label">Headline</span>';
      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.className = 'text-input';
      titleInput.placeholder = label === 'Example' ? 'What makes this an exemplar?' : 'What misconception does this show?';
      titleInput.value = column.title;
      titleInput.addEventListener('input', () => {
        working[key].title = titleInput.value;
        emit(false);
      });
      titleField.append(titleInput);
      section.append(titleField);

      const descriptionField = document.createElement('label');
      descriptionField.className = 'field';
      descriptionField.innerHTML = '<span class="field-label">Supporting details</span>';
      const descriptionInput = document.createElement('textarea');
      descriptionInput.rows = 3;
      descriptionInput.className = 'text-input';
      descriptionInput.placeholder = 'List the cues that make this a strong or weak example.';
      descriptionInput.value = column.description;
      descriptionInput.addEventListener('input', () => {
        working[key].description = descriptionInput.value;
        emit(false);
      });
      descriptionField.append(descriptionInput);
      section.append(descriptionField);

      const preview = document.createElement('div');
      preview.className = 'example-nonexample-editor-preview';
      if (column.imageUrl) {
        const image = document.createElement('img');
        image.src = column.imageUrl;
        image.alt = column.altText || '';
        preview.append(image);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'example-nonexample-editor-placeholder';
        placeholder.textContent = 'Upload an image to reinforce the comparison.';
        preview.append(placeholder);
      }
      section.append(preview);

      const uploadField = document.createElement('label');
      uploadField.className = 'field';
      uploadField.innerHTML = '<span class="field-label">Upload image</span>';
      const uploadInput = document.createElement('input');
      uploadInput.type = 'file';
      uploadInput.accept = 'image/*';
      uploadInput.className = 'file-input';
      uploadInput.addEventListener('change', async (event) => {
        const [file] = event.target.files || [];
        if (!file) return;
        await handleImageUpload(key, file);
        event.target.value = '';
      });
      uploadField.append(uploadInput);
      section.append(uploadField);

      const imageField = document.createElement('label');
      imageField.className = 'field';
      imageField.innerHTML = '<span class="field-label">Image URL</span>';
      const imageInput = document.createElement('input');
      imageInput.type = 'url';
      imageInput.className = 'text-input';
      imageInput.placeholder = 'https://…';
      imageInput.value = column.imageUrl;
      imageInput.addEventListener('input', () => {
        working[key].imageUrl = imageInput.value;
        emit(false);
      });
      imageField.append(imageInput);
      section.append(imageField);

      const altField = document.createElement('label');
      altField.className = 'field';
      altField.innerHTML = '<span class="field-label">Alt text</span>';
      const altInput = document.createElement('textarea');
      altInput.rows = 2;
      altInput.className = 'text-input';
      altInput.placeholder = 'Describe what matters in this image for non-visual readers.';
      altInput.value = column.altText;
      altInput.addEventListener('input', () => {
        working[key].altText = altInput.value;
        emit(false);
      });
      altField.append(altInput);
      section.append(altField);

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'muted-button';
      removeButton.textContent = 'Remove image';
      removeButton.disabled = !column.imageUrl;
      removeButton.addEventListener('click', () => {
        if (!working[key].imageUrl) return;
        working[key].imageUrl = '';
        working[key].altText = '';
        emit();
      });
      section.append(removeButton);

      return section;
    };

    columnsWrapper.append(buildColumnEditor('example', 'Example'));
    columnsWrapper.append(buildColumnEditor('nonExample', 'Non-example'));
    container.append(columnsWrapper);
  };

  rerender();
};

const createColumnPreview = (column, label) => {
  const article = document.createElement('article');
  article.className = `example-nonexample-column ${label === 'Example' ? 'is-example' : 'is-nonexample'}`;

  const tag = document.createElement('span');
  tag.className = 'example-nonexample-tag';
  tag.textContent = label;
  article.append(tag);

  if (column.title) {
    const heading = document.createElement('h4');
    heading.className = 'example-nonexample-title';
    heading.textContent = column.title;
    article.append(heading);
  }

  if (column.imageUrl) {
    const figure = document.createElement('figure');
    figure.className = 'example-nonexample-figure';
    const image = document.createElement('img');
    image.src = column.imageUrl;
    image.alt = column.altText || '';
    figure.append(image);
    article.append(figure);
  }

  const description = document.createElement('p');
  description.className = 'example-nonexample-description';
  if (column.description) {
    description.textContent = column.description;
  } else {
    description.classList.add('is-placeholder');
    description.textContent =
      label === 'Example'
        ? 'Describe why this example succeeds so learners can replicate the move.'
        : 'Explain the misconception so learners know what to avoid.';
  }
  article.append(description);

  return article;
};

const renderPreview = (container, data) => {
  const working = ensureWorkingState(data);
  container.innerHTML = '';

  const section = document.createElement('section');
  section.className = 'example-nonexample-preview';

  if (working.intro) {
    const intro = document.createElement('p');
    intro.className = 'example-nonexample-intro';
    intro.textContent = working.intro;
    section.append(intro);
  }

  const grid = document.createElement('div');
  grid.className = 'example-nonexample-grid';
  grid.append(createColumnPreview(working.example, 'Example'));
  grid.append(createColumnPreview(working.nonExample, 'Non-example'));

  section.append(grid);
  container.append(section);
};

const embedTemplate = (data, containerId) => {
  const working = ensureWorkingState(data);

  const columnHtml = (column, label) => `
    <article class="cd-example-nonexample-column ${
      label === 'Example' ? 'is-example' : 'is-nonexample'
    }">
      <span class="cd-example-nonexample-tag">${escapeHtml(label)}</span>
      ${column.title ? `<h4 class="cd-example-nonexample-title">${escapeHtml(column.title)}</h4>` : ''}
      ${
        column.imageUrl
          ? `<figure class="cd-example-nonexample-figure"><img src="${escapeHtml(column.imageUrl)}" alt="${escapeHtml(
              column.altText || ''
            )}" /></figure>`
          : ''
      }
      <p class="cd-example-nonexample-description">${escapeHtml(
        column.description ||
          (label === 'Example'
            ? 'Describe why this example succeeds so learners can replicate the move.'
            : 'Explain the misconception so learners know what to avoid.')
      )}</p>
    </article>
  `;

  return {
    html: `
      <section class="cd-example-nonexample" aria-label="Example and non-example comparison">
        ${
          working.intro
            ? `<p class="cd-example-nonexample-intro">${escapeHtml(working.intro)}</p>`
            : ''
        }
        <div class="cd-example-nonexample-grid">
          ${columnHtml(working.example, 'Example')}
          ${columnHtml(working.nonExample, 'Non-example')}
        </div>
      </section>
    `,
    css: `
      #${containerId} .cd-example-nonexample {
        display: grid;
        gap: 1.25rem;
        padding: 1.5rem;
        border-radius: 18px;
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(16, 185, 129, 0.08));
        border: 1px solid rgba(59, 130, 246, 0.18);
      }
      #${containerId} .cd-example-nonexample-intro {
        margin: 0;
        font-size: 1rem;
        line-height: 1.6;
        color: rgba(15, 23, 42, 0.85);
      }
      #${containerId} .cd-example-nonexample-grid {
        display: grid;
        gap: 1rem;
      }
      @media (min-width: 760px) {
        #${containerId} .cd-example-nonexample-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      #${containerId} .cd-example-nonexample-column {
        position: relative;
        display: grid;
        gap: 0.75rem;
        padding: 1.25rem;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid rgba(148, 163, 184, 0.45);
        box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
      }
      #${containerId} .cd-example-nonexample-column.is-example {
        border-color: rgba(16, 185, 129, 0.45);
      }
      #${containerId} .cd-example-nonexample-column.is-nonexample {
        border-color: rgba(239, 68, 68, 0.4);
      }
      #${containerId} .cd-example-nonexample-tag {
        display: inline-flex;
        align-self: flex-start;
        align-items: center;
        gap: 0.35rem;
        padding: 0.25rem 0.65rem;
        border-radius: 999px;
        font-size: 0.8rem;
        font-weight: 600;
        letter-spacing: 0.02em;
        background: rgba(59, 130, 246, 0.15);
        color: rgba(30, 64, 175, 0.95);
      }
      #${containerId} .cd-example-nonexample-column.is-example .cd-example-nonexample-tag {
        background: rgba(16, 185, 129, 0.18);
        color: rgba(6, 95, 70, 0.95);
      }
      #${containerId} .cd-example-nonexample-column.is-nonexample .cd-example-nonexample-tag {
        background: rgba(239, 68, 68, 0.18);
        color: rgba(153, 27, 27, 0.95);
      }
      #${containerId} .cd-example-nonexample-title {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 600;
        color: rgba(15, 23, 42, 0.9);
      }
      #${containerId} .cd-example-nonexample-figure {
        margin: 0;
        border-radius: 14px;
        overflow: hidden;
      }
      #${containerId} .cd-example-nonexample-figure img {
        display: block;
        width: 100%;
        height: auto;
      }
      #${containerId} .cd-example-nonexample-description {
        margin: 0;
        font-size: 0.95rem;
        line-height: 1.6;
        color: rgba(30, 41, 59, 0.85);
      }
    `,
    js: ''
  };
};

const learningTip = {
  intro:
    'Placing an example beside a non-example spotlights the criteria that matter most, helping learners diagnose quality before they practise.',
  when:
    'Use this when introducing rubrics, feedback guides, or problem-solving heuristics so students can immediately contrast strong and weak moves.',
  considerations: [
    'Annotate each column with the cues you want learners to notice, then ask them to add their own observations.',
    'Invite learners to predict how they would revise the non-example before revealing your reasoning.',
    'Encourage reflection: What patterns do they see across the examples collected over the term?'
  ],
  examples: [
    'Writing workshop: compare thesis statements before students craft their own claims.',
    'STEM lab: show a correctly labelled diagram beside one missing critical annotations.',
    'Facilitator training: contrast a strong discussion prompt with one that stalls participation.'
  ]
};

export const exampleNonExample = {
  id: 'exampleNonExample',
  label: 'Examples vs non-examples',
  template,
  example,
  buildEditor,
  renderPreview,
  embedTemplate,
  learningTip
};

