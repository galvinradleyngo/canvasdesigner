import { clone, uid, escapeHtml } from '../utils.js';

const template = () => ({
  sections: [
    { id: uid('section'), title: 'Section title', content: 'Add details here.' }
  ]
});

const example = () => ({
  sections: [
    {
      id: uid('section'),
      title: '1. Earth\'s crust',
      content: 'The thin outer shell composed of tectonic plates that float on the mantle.'
    },
    {
      id: uid('section'),
      title: '2. Mantle',
      content: 'A thick layer of hot, semi-solid rock that convects and drives plate movement.'
    },
    {
      id: uid('section'),
      title: '3. Core',
      content: 'Made of iron and nickel; the outer core is liquid while the inner core is solid.'
    }
  ]
});

const buildEditor = (container, data, onUpdate) => {
  const working = clone(data);

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
      working.sections.push({
        id: uid('section'),
        title: `Section ${working.sections.length + 1}`,
        content: 'Add supporting information here.'
      });
      emit();
    });

    if (working.sections.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<p>No sections yet. Click “Add section” to create one.</p>';
      container.append(empty);
    }

    working.sections.forEach((section, index) => {
      const item = document.createElement('div');
      item.className = 'editor-item';

      const header = document.createElement('div');
      header.className = 'editor-item-header';
      header.innerHTML = `<span>Section ${index + 1}</span>`;

      const actions = document.createElement('div');
      actions.className = 'editor-item-actions';

      const moveUp = document.createElement('button');
      moveUp.type = 'button';
      moveUp.className = 'muted-button';
      moveUp.textContent = 'Move up';
      moveUp.disabled = index === 0;
      moveUp.addEventListener('click', () => {
        const [current] = working.sections.splice(index, 1);
        working.sections.splice(index - 1, 0, current);
        emit();
      });

      const moveDown = document.createElement('button');
      moveDown.type = 'button';
      moveDown.className = 'muted-button';
      moveDown.textContent = 'Move down';
      moveDown.disabled = index === working.sections.length - 1;
      moveDown.addEventListener('click', () => {
        const [current] = working.sections.splice(index, 1);
        working.sections.splice(index + 1, 0, current);
        emit();
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'muted-button';
      deleteBtn.textContent = 'Remove';
      deleteBtn.addEventListener('click', () => {
        working.sections.splice(index, 1);
        emit();
      });

      actions.append(moveUp, moveDown, deleteBtn);
      header.append(actions);

      const titleLabel = document.createElement('label');
      titleLabel.className = 'field';
      titleLabel.innerHTML = `<span class="field-label">Heading</span>`;
      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.className = 'text-input';
      titleInput.value = section.title;
      titleInput.addEventListener('input', () => {
        working.sections[index].title = titleInput.value;
        emit(false);
      });
      titleLabel.append(titleInput);

      const contentLabel = document.createElement('label');
      contentLabel.className = 'field';
      contentLabel.innerHTML = `<span class="field-label">Details</span>`;
      const contentInput = document.createElement('textarea');
      contentInput.rows = 3;
      contentInput.value = section.content;
      contentInput.addEventListener('input', () => {
        working.sections[index].content = contentInput.value;
        emit(false);
      });
      contentLabel.append(contentInput);

      item.append(header, titleLabel, contentLabel);
      container.append(item);
    });

    container.append(addButton);
  };

  rerender();
};

const renderPreview = (container, data) => {
  container.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'accordion';

  data.sections.forEach((section, index) => {
    const item = document.createElement('div');
    item.className = 'accordion-item';

    const headerId = `accordion-header-${index}`;
    const panelId = `accordion-panel-${index}`;

    const header = document.createElement('button');
    header.className = 'accordion-header';
    header.id = headerId;
    header.setAttribute('aria-expanded', index === 0 ? 'true' : 'false');
    header.setAttribute('aria-controls', panelId);
    const headerText = document.createElement('span');
    headerText.textContent = section.title || 'Section';
    const icon = document.createElement('span');
    icon.className = 'accordion-icon';
    icon.setAttribute('aria-hidden', 'true');
    header.append(headerText, icon);

    const panel = document.createElement('div');
    panel.className = 'accordion-panel';
    panel.id = panelId;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', headerId);
    panel.style.display = index === 0 ? 'block' : 'none';
    const paragraph = document.createElement('p');
    paragraph.textContent = section.content || '';
    panel.append(paragraph);

    header.addEventListener('click', () => {
      const expanded = header.getAttribute('aria-expanded') === 'true';
      header.setAttribute('aria-expanded', String(!expanded));
      panel.style.display = expanded ? 'none' : 'block';
      item.classList.toggle('open', !expanded);
    });

    item.append(header, panel);
    list.append(item);
  });

  container.append(list);
};

const embedTemplate = (data, containerId) => ({
  html: `
    <div class="cd-accordion">
      ${data.sections
        .map(
          (section, index) => `
          <div class="cd-accordion-item ${index === 0 ? 'open' : ''}">
            <button class="cd-accordion-header" aria-expanded="${index === 0}" aria-controls="${containerId}-panel-${index}" id="${containerId}-header-${index}">
              <span>${escapeHtml(section.title || 'Section')}</span>
              <span class="cd-accordion-icon" aria-hidden="true"></span>
            </button>
            <div class="cd-accordion-panel" role="region" aria-labelledby="${containerId}-header-${index}" id="${containerId}-panel-${index}" style="display:${index === 0 ? 'block' : 'none'};">
              <p>${escapeHtml(section.content || '')}</p>
            </div>
          </div>`
        )
        .join('')}
    </div>
  `,
  css: `
    #${containerId} .cd-accordion {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      font-family: 'Inter', system-ui, sans-serif;
    }
    #${containerId} .cd-accordion-item {
      border: 1px solid rgba(15, 23, 42, 0.12);
      border-radius: 12px;
      overflow: hidden;
      background: rgba(248, 250, 252, 0.86);
      box-shadow: 0 12px 24px rgba(15, 23, 42, 0.1);
      transition: border 160ms ease, box-shadow 160ms ease;
    }
    #${containerId} .cd-accordion-item.open {
      border-color: rgba(99, 102, 241, 0.4);
      box-shadow: 0 18px 32px rgba(99, 102, 241, 0.18);
    }
    #${containerId} .cd-accordion-header {
      width: 100%;
      border: none;
      background: transparent;
      padding: 1rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
    }
    #${containerId} .cd-accordion-icon::before {
      content: '+';
      font-size: 1.4rem;
      transition: transform 160ms ease;
    }
    #${containerId} .cd-accordion-item.open .cd-accordion-icon::before {
      content: '−';
    }
    #${containerId} .cd-accordion-panel {
      padding: 0 1.25rem 1rem;
      font-size: 0.95rem;
      line-height: 1.5;
      color: rgba(15, 23, 42, 0.75);
    }
    #${containerId} .cd-accordion-panel p {
      margin: 0;
    }
  `,
  js: `
    (function(){
      const root = document.getElementById('${containerId}');
      if (!root) return;
      root.querySelectorAll('.cd-accordion-header').forEach((header) => {
        header.addEventListener('click', () => {
          const expanded = header.getAttribute('aria-expanded') === 'true';
          header.setAttribute('aria-expanded', String(!expanded));
          const panel = root.querySelector(`#${header.getAttribute('aria-controls')}`);
          if (panel) {
            panel.style.display = expanded ? 'none' : 'block';
            header.parentElement.classList.toggle('open', !expanded);
          }
        });
      });
    })();
  `
});

export const accordions = {
  id: 'accordions',
  label: 'Accordions',
  template,
  example,
  buildEditor,
  renderPreview,
  embedTemplate
};
