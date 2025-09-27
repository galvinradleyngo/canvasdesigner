import { clone, uid, escapeHtml } from '../utils.js';

const createItem = (overrides = {}, index = 0) => {
  const base = {
    id: uid('accordion-item'),
    title: `Section ${index + 1}`,
    body: 'Add supporting details for learners.'
  };
  const item = { ...base, ...overrides };
  if (!item.id) {
    item.id = uid('accordion-item');
  }
  if (typeof item.title !== 'string') {
    item.title = '';
  }
  if (typeof item.body !== 'string') {
    item.body = '';
  }
  return item;
};

const normaliseItems = (items) => {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((item, index) => createItem(item, index));
};

const createSampleItems = () =>
  normaliseItems([
    {
      title: 'Key idea',
      body: 'Summarise the concept or introduce the topic you want learners to explore.'
    },
    {
      title: 'Deep dive',
      body: 'Offer extra context, worked examples, or a helpful mnemonic to remember.'
    },
    {
      title: 'Try this',
      body: 'Add a reflection question or quick challenge to check understanding.'
    }
  ]);

const template = () => ({
  items: createSampleItems()
});

const example = () => ({
  items: normaliseItems([
    {
      title: 'Step 1: Observe',
      body: 'Explore the image and note anything that stands out. Jot down questions that come to mind.'
    },
    {
      title: 'Step 2: Interpret',
      body: 'Connect your observations to prior knowledge. What explanations could fit what you see?'
    },
    {
      title: 'Step 3: Discuss',
      body: 'Share your ideas with a partner or small group. Build on each other’s thinking.'
    }
  ])
});

const ensureWorkingState = (data) => {
  const safe = data ? clone(data) : {};
  return {
    items: normaliseItems(safe.items)
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

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'ghost-button';
    addButton.textContent = 'Add section';
    addButton.addEventListener('click', () => {
      working.items.push(createItem({ title: 'New section', body: '' }, working.items.length));
      emit();
    });

    if (!working.items.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<p>No sections yet. Click “Add section” to begin.</p>';
      container.append(empty);
    }

    working.items.forEach((item, index) => {
      const editorItem = document.createElement('div');
      editorItem.className = 'editor-item';

      const header = document.createElement('div');
      header.className = 'editor-item-header';
      header.innerHTML = `<span>Section ${index + 1}</span>`;

      const actions = document.createElement('div');
      actions.className = 'editor-item-actions';

      const duplicateBtn = document.createElement('button');
      duplicateBtn.type = 'button';
      duplicateBtn.className = 'muted-button';
      duplicateBtn.textContent = 'Duplicate';
      duplicateBtn.addEventListener('click', () => {
        const cloneSource = clone(item);
        working.items.splice(index + 1, 0, createItem({ ...cloneSource, id: uid('accordion-item') }, index + 1));
        emit();
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'muted-button';
      deleteBtn.textContent = 'Remove';
      deleteBtn.addEventListener('click', () => {
        working.items.splice(index, 1);
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
      titleInput.value = item.title;
      titleInput.placeholder = 'e.g. Why it matters';
      titleInput.addEventListener('input', () => {
        working.items[index].title = titleInput.value;
        emit(false);
      });
      titleField.append(titleInput);

      const bodyField = document.createElement('label');
      bodyField.className = 'field';
      bodyField.innerHTML = '<span class="field-label">Body text</span>';
      const bodyInput = document.createElement('textarea');
      bodyInput.rows = 3;
      bodyInput.value = item.body;
      bodyInput.placeholder = 'Add the supporting explanation or prompt for this section.';
      bodyInput.addEventListener('input', () => {
        working.items[index].body = bodyInput.value;
        emit(false);
      });
      bodyField.append(bodyInput);

      editorItem.append(header, titleField, bodyField);
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

  if (!working.items.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<p>Add accordion sections to see the preview.</p>';
    container.append(empty);
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'accordion';

  const items = working.items.map((item, index) => {
    const details = document.createElement('details');
    details.className = 'accordion-item';
    details.dataset.index = String(index);
    if (index === 0) {
      details.open = true;
    }
    if (playAnimations) {
      details.classList.add('animate');
      details.style.setProperty('--item-index', String(index));
    }

    const summary = document.createElement('summary');
    summary.className = 'accordion-summary';

    const title = document.createElement('span');
    title.className = 'accordion-title';
    title.textContent = typeof item.title === 'string' ? item.title : '';

    const icon = document.createElement('span');
    icon.className = 'accordion-icon';
    icon.setAttribute('aria-hidden', 'true');

    summary.append(title, icon);

    const content = document.createElement('div');
    content.className = 'accordion-content';
    const body = document.createElement('div');
    body.className = 'accordion-body';
    body.textContent = typeof item.body === 'string' ? item.body : '';
    content.append(body);

    details.append(summary, content);
    wrapper.append(details);
    return details;
  });

  wrapper.addEventListener('toggle', (event) => {
    const target = event.target;
    if (!target || target.tagName !== 'DETAILS' || !target.open) {
      return;
    }
    items.forEach((item) => {
      if (item !== target) {
        item.open = false;
      }
    });
  });

  container.append(wrapper);
};

const embedTemplate = (data, containerId) => {
  const working = ensureWorkingState(data);
  const items = working.items.length ? working.items : createSampleItems();
  return {
    html: `
    <div class="cd-accordion">
      ${items
        .map(
          (item, index) => `
        <details class="cd-accordion-item animate" ${index === 0 ? 'open' : ''}>
          <summary class="cd-accordion-summary">
            <span class="cd-accordion-title">${
              typeof item.title === 'string' ? escapeHtml(item.title) : ''
            }</span>
            <span class="cd-accordion-icon" aria-hidden="true"></span>
          </summary>
          <div class="cd-accordion-content">
            <div class="cd-accordion-body">${
              typeof item.body === 'string' ? escapeHtml(item.body) : ''
            }</div>
          </div>
        </details>`
        )
        .join('')}
    </div>
  `,
    css: `
    #${containerId} .cd-accordion {
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
    }
    #${containerId} .cd-accordion-item {
      border-radius: 16px;
      border: 1px solid rgba(99, 102, 241, 0.15);
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.9));
      box-shadow: 0 18px 38px rgba(15, 23, 42, 0.12);
      overflow: hidden;
      transition: box-shadow 200ms ease, border-color 200ms ease;
    }
    #${containerId} .cd-accordion-item[open] {
      border-color: rgba(99, 102, 241, 0.35);
      box-shadow: 0 20px 44px rgba(99, 102, 241, 0.18);
    }
    #${containerId} .cd-accordion-summary {
      position: relative;
      list-style: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.2rem;
      padding: 1.1rem 1.4rem;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
    }
    #${containerId} .cd-accordion-summary::-webkit-details-marker {
      display: none;
    }
    #${containerId} .cd-accordion-title {
      flex: 1;
      min-width: 0;
    }
    #${containerId} .cd-accordion-icon {
      width: 2rem;
      height: 2rem;
      border-radius: 999px;
      background: rgba(99, 102, 241, 0.12);
      color: #6366f1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: transform 220ms ease;
    }
    #${containerId} .cd-accordion-icon::before {
      content: '';
      width: 10px;
      height: 10px;
      border: 2px solid currentColor;
      border-top: 0;
      border-right: 0;
      transform: rotate(-45deg);
      margin-top: -2px;
    }
    #${containerId} .cd-accordion-item[open] .cd-accordion-icon {
      transform: rotate(180deg);
    }
    #${containerId} .cd-accordion-content {
      padding: 0 1.4rem 1.2rem;
      color: rgba(15, 23, 42, 0.8);
      font-size: 0.95rem;
    }
    #${containerId} .cd-accordion-body {
      margin: 0;
      white-space: pre-wrap;
      line-height: 1.55;
    }
    #${containerId} .cd-accordion-item.animate {
      animation: cd-accordion-reveal 420ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
      animation-delay: calc(var(--item-index, 0) * 90ms);
    }
    @keyframes cd-accordion-reveal {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
    js: `
    (function(){
      const root = document.getElementById('${containerId}');
      if (!root) return;
      const items = Array.from(root.querySelectorAll('.cd-accordion-item'));
      items.forEach((item) => {
        item.addEventListener('toggle', () => {
          if (!item.open) {
            return;
          }
          item.classList.remove('animate');
          items.forEach((other) => {
            if (other !== item) {
              other.removeAttribute('open');
            }
          });
        });
      });
    })();
  `
  };
};

const learningTip = {
  intro: 'Accordions break dense information into digestible bites while letting learners control the pace.',
  when: 'Use them to structure multi-step processes, FAQs, or concept comparisons where learners may explore sections in any order.',
  considerations: [
    'Write headings that read like summary statements so skim readers grasp the key idea before expanding.',
    'Balance the amount of media and text in each pane so no single section feels overwhelming.',
    'Layer in prompts, visuals, or follow-up questions inside panels to keep learners actively processing what they open.'
  ],
  examples: [
    'Course orientation: present syllabus highlights, grading policies, and support resources as expandable sections.',
    'Lab protocol: outline each experiment phase with embedded safety reminders in the relevant pane.',
    'Case study debrief: reveal context, evidence, and instructor analysis one panel at a time.'
  ]
};

export const accordion = {
  id: 'accordion',
  label: 'Accordion',
  template,
  example,
  buildEditor,
  renderPreview,
  embedTemplate,
  learningTip
};
