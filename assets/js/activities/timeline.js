import { clone, uid, escapeHtml } from '../utils.js';

const DEFAULT_ACCENT = '#6366f1';

const createEvent = (overrides = {}, index = 0) => {
  const base = {
    id: uid('timeline-event'),
    title: `Milestone ${index + 1}`,
    date: '',
    description: 'Describe what happens during this moment.'
  };
  const event = { ...base, ...overrides };
  if (!event.id) {
    event.id = uid('timeline-event');
  }
  if (typeof event.title !== 'string') {
    event.title = '';
  }
  if (typeof event.date !== 'string') {
    event.date = '';
  }
  if (typeof event.description !== 'string') {
    event.description = '';
  }
  return event;
};

const normaliseEvents = (events) => {
  if (!Array.isArray(events)) {
    return [];
  }
  return events.map((event, index) => createEvent(event, index));
};

const createSampleEvents = () =>
  normaliseEvents([
    {
      title: 'Kickoff',
      date: 'Week 1',
      description: 'Introduce the project, form teams, and clarify success criteria.'
    },
    {
      title: 'Research',
      date: 'Weeks 2-3',
      description: 'Gather sources, conduct interviews, and capture findings in the shared notebook.'
    },
    {
      title: 'Prototype + feedback',
      date: 'Week 4',
      description: 'Build a rough draft, collect peer feedback, and iterate before the final submission.'
    }
  ]);

const template = () => ({
  accentColor: DEFAULT_ACCENT,
  events: createSampleEvents()
});

const example = () => ({
  accentColor: '#0ea5e9',
  events: normaliseEvents([
    {
      title: 'Question launched',
      date: 'Monday',
      description: 'Students review the driving question and brainstorm what they already know.'
    },
    {
      title: 'Investigation',
      date: 'Tuesday – Wednesday',
      description: 'Teams collect evidence from labs, readings, or field work to answer the question.'
    },
    {
      title: 'Synthesis',
      date: 'Thursday',
      description: 'Groups organise findings into a story or argument using the evidence they gathered.'
    },
    {
      title: 'Showcase',
      date: 'Friday',
      description: 'Learners present their conclusions and reflect on new questions that emerged.'
    }
  ])
});

const ensureWorkingState = (data) => {
  const safe = data ? clone(data) : {};
  const accent =
    typeof safe.accentColor === 'string' && safe.accentColor.trim() ? safe.accentColor.trim() : DEFAULT_ACCENT;
  return {
    accentColor: accent,
    events: normaliseEvents(safe.events)
  };
};

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

    const appearanceItem = document.createElement('div');
    appearanceItem.className = 'editor-item';
    const appearanceField = document.createElement('label');
    appearanceField.className = 'field';
    appearanceField.innerHTML = '<span class="field-label">Accent color</span>';
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'color-input';
    colorInput.value = working.accentColor;
    colorInput.addEventListener('input', () => {
      working.accentColor = colorInput.value;
      emit(false);
    });
    appearanceField.append(colorInput);
    appearanceItem.append(appearanceField);
    container.append(appearanceItem);

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'ghost-button';
    addButton.textContent = 'Add event';
    addButton.addEventListener('click', () => {
      working.events.push(createEvent({ title: 'New milestone', description: '' }, working.events.length));
      emit();
    });

    if (!working.events.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<p>No timeline events yet. Click “Add event” to create one.</p>';
      container.append(empty);
    }

    working.events.forEach((event, index) => {
      const editorItem = document.createElement('div');
      editorItem.className = 'editor-item';

      const header = document.createElement('div');
      header.className = 'editor-item-header';
      header.innerHTML = `<span>Event ${index + 1}</span>`;

      const actions = document.createElement('div');
      actions.className = 'editor-item-actions';

      const duplicateBtn = document.createElement('button');
      duplicateBtn.type = 'button';
      duplicateBtn.className = 'muted-button';
      duplicateBtn.textContent = 'Duplicate';
      duplicateBtn.addEventListener('click', () => {
        const cloneSource = clone(event);
        working.events.splice(index + 1, 0, createEvent({ ...cloneSource, id: uid('timeline-event') }, index + 1));
        emit();
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'muted-button';
      deleteBtn.textContent = 'Remove';
      deleteBtn.addEventListener('click', () => {
        working.events.splice(index, 1);
        emit();
      });

      actions.append(duplicateBtn, deleteBtn);
      header.append(actions);

      const titleField = document.createElement('label');
      titleField.className = 'field';
      titleField.innerHTML = '<span class="field-label">Title</span>';
      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.className = 'text-input';
      titleInput.value = event.title;
      titleInput.placeholder = 'e.g. Draft submission';
      titleInput.addEventListener('input', () => {
        working.events[index].title = titleInput.value;
        emit(false);
      });
      titleField.append(titleInput);

      const dateField = document.createElement('label');
      dateField.className = 'field';
      dateField.innerHTML = '<span class="field-label">Date or label (optional)</span>';
      const dateInput = document.createElement('input');
      dateInput.type = 'text';
      dateInput.className = 'text-input';
      dateInput.value = event.date;
      dateInput.placeholder = 'e.g. Week 2 or 14 Sept';
      dateInput.addEventListener('input', () => {
        working.events[index].date = dateInput.value;
        emit(false);
      });
      dateField.append(dateInput);

      const descriptionField = document.createElement('label');
      descriptionField.className = 'field';
      descriptionField.innerHTML = '<span class="field-label">Description</span>';
      const descriptionInput = document.createElement('textarea');
      descriptionInput.rows = 3;
      descriptionInput.value = event.description;
      descriptionInput.placeholder = 'Summarise the key tasks, resources, or goals for this event.';
      descriptionInput.addEventListener('input', () => {
        working.events[index].description = descriptionInput.value;
        emit(false);
      });
      descriptionField.append(descriptionInput);

      editorItem.append(header, titleField, dateField, descriptionField);
      container.append(editorItem);
    });

    container.append(addButton);
  };

  rerender();
};

const renderPreview = (container, data, options = {}) => {
  container.innerHTML = '';
  const working = ensureWorkingState(data);
  const playAnimations = options.playAnimations !== false;

  if (!working.events.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<p>Add timeline events to see the preview.</p>';
    container.append(empty);
    return;
  }

  const accent = working.accentColor || DEFAULT_ACCENT;
  const wrapper = document.createElement('div');
  wrapper.className = 'timeline';
  wrapper.style.setProperty('--timeline-accent', accent);

  working.events.forEach((event, index) => {
    const item = document.createElement('div');
    item.className = 'timeline-item';
    if (playAnimations) {
      item.classList.add('animate');
      item.style.setProperty('--item-index', String(index));
    }

    const marker = document.createElement('div');
    marker.className = 'timeline-marker';

    const content = document.createElement('div');
    content.className = 'timeline-content';

    if (event.date) {
      const date = document.createElement('span');
      date.className = 'timeline-date';
      date.textContent = event.date;
      content.append(date);
    }

    const title = document.createElement('h3');
    title.className = 'timeline-title';
    title.textContent = event.title || '';
    content.append(title);

    if (event.description) {
      const description = document.createElement('p');
      description.className = 'timeline-description';
      description.textContent = event.description;
      content.append(description);
    }

    item.append(marker, content);
    wrapper.append(item);
  });

  container.append(wrapper);
};

const embedTemplate = (data, containerId) => {
  const working = ensureWorkingState(data);
  const accent = working.accentColor || DEFAULT_ACCENT;
  const events = working.events.length ? working.events : createSampleEvents();
  return {
    html: `
    <div class="cd-timeline" style="--timeline-accent: ${escapeHtml(accent)};">
      ${events
        .map(
          (event, index) => `
        <div class="cd-timeline-item animate" style="--item-index: ${index};">
          <div class="cd-timeline-marker"></div>
          <div class="cd-timeline-content">
            ${event.date ? `<span class="cd-timeline-date">${escapeHtml(event.date)}</span>` : ''}
            <h3 class="cd-timeline-title">${
              typeof event.title === 'string' ? escapeHtml(event.title) : ''
            }</h3>
            ${
              event.description
                ? `<p class="cd-timeline-description">${escapeHtml(event.description)}</p>`
                : ''
            }
          </div>
        </div>`
        )
        .join('')}
    </div>
  `,
    css: `
    #${containerId} .cd-timeline {
      --timeline-accent: ${escapeHtml(accent)};
      position: relative;
      display: grid;
      gap: 1.5rem;
      padding-left: 1.6rem;
    }
    #${containerId} .cd-timeline::before {
      content: '';
      position: absolute;
      left: 0.55rem;
      top: 0.75rem;
      bottom: 0.75rem;
      width: 2px;
      background: linear-gradient(180deg, rgba(99, 102, 241, 0.35), rgba(99, 102, 241, 0.05));
    }
    #${containerId} .cd-timeline-item {
      position: relative;
      display: grid;
      grid-template-columns: min-content 1fr;
      gap: 1.2rem;
    }
    #${containerId} .cd-timeline-item.animate {
      animation: cd-timeline-reveal 460ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
      animation-delay: calc(var(--item-index, 0) * 110ms);
    }
    #${containerId} .cd-timeline-item::before {
      content: '';
      position: absolute;
      left: 0.55rem;
      top: 1.7rem;
      bottom: -1.5rem;
      width: 2px;
      background: linear-gradient(180deg, rgba(148, 163, 184, 0.4), rgba(148, 163, 184, 0));
    }
    #${containerId} .cd-timeline-item:last-child::before {
      display: none;
    }
    #${containerId} .cd-timeline-marker {
      width: 1.15rem;
      height: 1.15rem;
      border-radius: 999px;
      background: #ffffff;
      border: 3px solid var(--timeline-accent);
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
      margin-top: 0.4rem;
    }
    #${containerId} .cd-timeline-content {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 16px;
      padding: 1rem 1.3rem;
      border: 1px solid rgba(148, 163, 184, 0.25);
      box-shadow: 0 16px 32px rgba(15, 23, 42, 0.14);
    }
    #${containerId} .cd-timeline-date {
      display: inline-block;
      font-size: 0.82rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--timeline-accent);
      margin-bottom: 0.35rem;
    }
    #${containerId} .cd-timeline-title {
      margin: 0;
      font-size: 1.05rem;
      color: #0f172a;
    }
    #${containerId} .cd-timeline-description {
      margin: 0.45rem 0 0;
      color: rgba(15, 23, 42, 0.78);
      line-height: 1.6;
      white-space: pre-wrap;
    }
    @keyframes cd-timeline-reveal {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
    js: ''
  };
};

export const timeline = {
  id: 'timeline',
  label: 'Timeline',
  template,
  example,
  buildEditor,
  renderPreview,
  embedTemplate
};
