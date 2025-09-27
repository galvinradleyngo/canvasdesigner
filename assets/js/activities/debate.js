import { clone, uid, escapeHtml } from '../utils.js';

const DEFAULT_QUESTION = 'Should cities convert major downtown streets into pedestrian-only plazas?';
const DEFAULT_INSTRUCTIONS =
  'Explain how the debate will run and what evidence or reasoning learners should pay attention to.';

const SAMPLE_ARGUMENTS = [
  { text: 'Pedestrian plazas boost local business visibility and encourage foot traffic.', votes: 12 },
  { text: 'Road closures increase congestion on surrounding streets and slow emergency response times.', votes: 9 },
  { text: 'Car-free zones improve air quality and make streets safer for families.', votes: 7 },
  { text: 'Some residents rely on car access for work, healthcare, or mobility needs.', votes: 6 }
];

const SIDE_PRESETS = [
  {
    name: 'Supports the motion',
    statement: 'Argues for adopting the proposal.',
    arguments: [SAMPLE_ARGUMENTS[0], SAMPLE_ARGUMENTS[2]]
  },
  {
    name: 'Challenges the motion',
    statement: 'Argues against adopting the proposal.',
    arguments: [SAMPLE_ARGUMENTS[1], SAMPLE_ARGUMENTS[3]]
  }
];

const createArgument = (overrides = {}, index = 0) => {
  const sample = SAMPLE_ARGUMENTS[index % SAMPLE_ARGUMENTS.length] || SAMPLE_ARGUMENTS[0];
  const base = {
    id: uid('debate-argument'),
    text: sample.text,
    votes: sample.votes
  };
  const source = typeof overrides === 'string' ? { text: overrides } : overrides || {};
  const argument = { ...base, ...source };
  if (!argument.id || typeof argument.id !== 'string') {
    argument.id = uid('debate-argument');
  } else {
    argument.id = argument.id.trim() || uid('debate-argument');
  }
  if (typeof argument.text !== 'string') {
    argument.text = '';
  }
  argument.text = argument.text.trim();
  const parsedVotes = Number.parseInt(argument.votes, 10);
  argument.votes = Number.isFinite(parsedVotes) && parsedVotes >= 0 ? parsedVotes : 0;
  return argument;
};

const normaliseArguments = (argumentsList, offset = 0) => {
  if (!Array.isArray(argumentsList)) {
    return [];
  }
  return argumentsList.map((argument, index) => createArgument(argument, offset + index));
};

const createSide = (overrides = {}, index = 0) => {
  const preset = SIDE_PRESETS[index % SIDE_PRESETS.length];
  const base = {
    id: uid('debate-side'),
    name: preset?.name || `Side ${index + 1}`,
    statement: preset?.statement || 'Summarise this perspective in one sentence.',
    arguments: normaliseArguments(preset?.arguments || [], index * 3)
  };
  const side = { ...base, ...overrides };
  if (!side.id || typeof side.id !== 'string') {
    side.id = uid('debate-side');
  } else {
    side.id = side.id.trim() || uid('debate-side');
  }
  if (typeof side.name !== 'string') {
    side.name = '';
  }
  side.name = side.name.trim();
  if (typeof side.statement !== 'string') {
    side.statement = '';
  }
  side.statement = side.statement.trim();
  side.arguments = normaliseArguments(side.arguments, index * 3);
  return side;
};

const normaliseSides = (sides) => {
  const cleaned = Array.isArray(sides) ? sides.slice(0, 2).map((side, index) => createSide(side, index)) : [];
  while (cleaned.length < 2) {
    cleaned.push(createSide({}, cleaned.length));
  }
  return cleaned;
};

const convertLegacyData = (data) => {
  if (!data) return null;
  const question = typeof data.prompt === 'string' && data.prompt.trim() ? data.prompt.trim() : '';
  const instructionSource = [data.context, data.audienceTask].find(
    (value) => typeof value === 'string' && value.trim()
  );
  const instructions = instructionSource ? instructionSource.trim() : '';
  if (!Array.isArray(data.teams)) {
    if (!question && !instructions) {
      return null;
    }
    return { question, instructions, sides: undefined };
  }
  const sides = data.teams.slice(0, 2).map((team) => {
    const evidence = Array.isArray(team?.evidence)
      ? team.evidence
          .map((point) => (typeof point?.text === 'string' ? point.text : ''))
          .filter((text) => text && text.trim().length)
      : [];
    return {
      id: typeof team?.id === 'string' ? team.id : undefined,
      name: typeof team?.name === 'string' ? team.name : undefined,
      statement:
        typeof team?.stance === 'string'
          ? team.stance
          : typeof team?.opening === 'string'
          ? team.opening
          : '',
      arguments: evidence.map((text) => ({ text, votes: 0 }))
    };
  });
  if (Array.isArray(data.learnerViews)) {
    data.learnerViews.forEach((view) => {
      if (!view || typeof view.summary !== 'string') {
        return;
      }
      const stanceIndex = view.stance === 'con' ? 1 : 0;
      const target = sides[stanceIndex] || sides[0];
      if (!target) {
        return;
      }
      target.arguments.push({
        text: view.summary,
        votes: Number.parseInt(view.votes, 10) || 1
      });
    });
  }
  return { question, instructions, sides };
};

const ensureWorkingState = (data) => {
  const safe = data ? clone(data) : {};
  const legacy = convertLegacyData(safe) || {};
  const question =
    typeof safe.question === 'string' && safe.question.trim()
      ? safe.question.trim()
      : legacy.question || DEFAULT_QUESTION;
  const instructions =
    typeof safe.instructions === 'string' && safe.instructions.trim()
      ? safe.instructions.trim()
      : legacy.instructions || DEFAULT_INSTRUCTIONS;
  const sidesSource = Array.isArray(safe.sides) && safe.sides.length ? safe.sides : legacy.sides;
  const sides = normaliseSides(sidesSource);
  return { question, instructions, sides };
};

const template = () => ({
  question: DEFAULT_QUESTION,
  instructions: DEFAULT_INSTRUCTIONS,
  sides: normaliseSides(SIDE_PRESETS)
});

const example = () => ({
  question: 'Should our school adopt a four-day instructional week next year?',
  instructions:
    'Teams researched schedules, staffing, and family routines. As you listen, capture the evidence that most influences you.',
  sides: normaliseSides([
    {
      name: 'Pro change',
      statement: 'Argues that a focused four-day week increases engagement and staff collaboration.',
      arguments: [
        {
          text: 'Districts piloting a shorter week saw chronic absenteeism drop by 12% thanks to longer project blocks.',
          votes: 10
        },
        {
          text: 'Teachers gain a shared planning day to align interventions and enrichment for struggling learners.',
          votes: 7
        }
      ]
    },
    {
      name: 'Keep five days',
      statement: 'Argues that a traditional week best serves families and extracurricular programs.',
      arguments: [
        {
          text: 'Local childcare providers are already at capacity—families would scramble for coverage on the fifth day.',
          votes: 9
        },
        {
          text: 'Athletics and arts rehearsals would need evening rescheduling, adding stress instead of relief.',
          votes: 6
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

  const rerender = () => {
    container.innerHTML = '';

    const questionField = document.createElement('label');
    questionField.className = 'field';
    questionField.innerHTML = '<span class="field-label">Debate question</span>';
    const questionInput = document.createElement('input');
    questionInput.type = 'text';
    questionInput.value = working.question;
    questionInput.placeholder = 'What motion or prompt will learners debate?';
    questionInput.addEventListener('input', () => {
      working.question = questionInput.value;
      emit(false);
    });
    questionField.append(questionInput);

    const instructionsField = document.createElement('label');
    instructionsField.className = 'field';
    instructionsField.innerHTML = '<span class="field-label">Facilitation instructions</span>';
    const instructionsInput = document.createElement('textarea');
    instructionsInput.rows = 3;
    instructionsInput.value = working.instructions;
    instructionsInput.placeholder = 'Explain timing, evidence expectations, or norms for the debate.';
    instructionsInput.addEventListener('input', () => {
      working.instructions = instructionsInput.value;
      emit(false);
    });
    instructionsField.append(instructionsInput);

    container.append(questionField, instructionsField);

    working.sides.forEach((side, index) => {
      const item = document.createElement('div');
      item.className = 'editor-item';

      const header = document.createElement('div');
      header.className = 'editor-item-header';
      header.innerHTML = `<span>Side ${index + 1}</span>`;
      item.append(header);

      const nameField = document.createElement('label');
      nameField.className = 'field';
      nameField.innerHTML = '<span class="field-label">Side name</span>';
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.value = side.name;
      nameInput.placeholder = 'e.g. Supports the motion';
      nameInput.addEventListener('input', () => {
        working.sides[index].name = nameInput.value;
        emit(false);
      });
      nameField.append(nameInput);

      const stanceField = document.createElement('label');
      stanceField.className = 'field';
      stanceField.innerHTML = '<span class="field-label">Position statement</span>';
      const stanceInput = document.createElement('textarea');
      stanceInput.rows = 2;
      stanceInput.value = side.statement;
      stanceInput.placeholder = 'Summarise the core claim this side will defend.';
      stanceInput.addEventListener('input', () => {
        working.sides[index].statement = stanceInput.value;
        emit(false);
      });
      stanceField.append(stanceInput);

      item.append(nameField, stanceField);

      const argumentsSection = document.createElement('div');
      argumentsSection.className = 'editor-stack';

      if (!side.arguments.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = '<p>No arguments yet. Add at least one talking point to model the structure.</p>';
        argumentsSection.append(empty);
      } else {
        side.arguments.forEach((argument, argumentIndex) => {
          const block = document.createElement('div');
          block.className = 'editor-subitem';

          const blockHeader = document.createElement('div');
          blockHeader.className = 'editor-subitem-header';
          blockHeader.innerHTML = `<span>Argument ${argumentIndex + 1}</span>`;

          const actions = document.createElement('div');
          actions.className = 'editor-subitem-actions';
          const removeBtn = document.createElement('button');
          removeBtn.type = 'button';
          removeBtn.className = 'muted-button';
          removeBtn.textContent = 'Remove';
          removeBtn.disabled = side.arguments.length <= 1;
          removeBtn.addEventListener('click', () => {
            if (working.sides[index].arguments.length <= 1) {
              return;
            }
            working.sides[index].arguments.splice(argumentIndex, 1);
            emit();
          });
          actions.append(removeBtn);
          blockHeader.append(actions);
          block.append(blockHeader);

          const textField = document.createElement('label');
          textField.className = 'field';
          textField.innerHTML = '<span class="field-label">Argument text</span>';
          const textArea = document.createElement('textarea');
          textArea.rows = 2;
          textArea.value = argument.text;
          textArea.placeholder = 'Capture the reasoning or evidence this side will offer.';
          textArea.addEventListener('input', () => {
            working.sides[index].arguments[argumentIndex].text = textArea.value;
            emit(false);
          });
          textField.append(textArea);

          const votesField = document.createElement('label');
          votesField.className = 'field';
          votesField.innerHTML = '<span class="field-label">Starting votes</span>';
          const votesInput = document.createElement('input');
          votesInput.type = 'number';
          votesInput.min = '0';
          votesInput.value = String(argument.votes);
          votesInput.addEventListener('input', () => {
            const parsed = Number.parseInt(votesInput.value, 10);
            working.sides[index].arguments[argumentIndex].votes = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
            emit(false);
          });
          votesField.append(votesInput);

          block.append(textField, votesField);
          argumentsSection.append(block);
        });
      }

      const addArgumentBtn = document.createElement('button');
      addArgumentBtn.type = 'button';
      addArgumentBtn.className = 'ghost-button';
      addArgumentBtn.textContent = 'Add argument';
      addArgumentBtn.addEventListener('click', () => {
        working.sides[index].arguments.push(createArgument({ text: '', votes: 0 }, side.arguments.length));
        emit();
      });

      argumentsSection.append(addArgumentBtn);
      item.append(argumentsSection);
      container.append(item);
    });
  };

  rerender();
};

const renderPreview = (container, data) => {
  container.innerHTML = '';
  const working = ensureWorkingState(data);

  const state = (() => {
    if (!container.__debatePreviewState) {
      container.__debatePreviewState = {
        additions: new Map(),
        votes: new Map()
      };
    }
    const existing = container.__debatePreviewState;
    if (!(existing.additions instanceof Map)) {
      existing.additions = new Map();
    }
    if (!(existing.votes instanceof Map)) {
      existing.votes = new Map();
    }
    const validIds = new Set(working.sides.map((side) => side.id));
    Array.from(existing.additions.keys()).forEach((key) => {
      if (!validIds.has(key)) {
        existing.additions.delete(key);
      }
    });
    return existing;
  })();

  const wrapper = document.createElement('div');
  wrapper.className = 'debate-preview';

  const header = document.createElement('div');
  header.className = 'debate-preview-header';

  const title = document.createElement('h3');
  title.className = 'debate-preview-question';
  title.textContent = working.question;
  header.append(title);

  if (working.instructions) {
    const intro = document.createElement('p');
    intro.className = 'debate-preview-instructions';
    intro.textContent = working.instructions;
    header.append(intro);
  }

  wrapper.append(header);

  const columns = document.createElement('div');
  columns.className = 'debate-preview-columns';

  working.sides.forEach((side) => {
    const column = document.createElement('article');
    column.className = 'debate-preview-side';

    const name = document.createElement('h4');
    name.className = 'debate-preview-side-title';
    name.textContent = side.name || 'Debate side';

    const statement = document.createElement('p');
    statement.className = 'debate-preview-side-statement';
    statement.textContent = side.statement || 'Clarify this stance in the editor to guide participants.';

    const list = document.createElement('div');
    list.className = 'debate-preview-arguments';

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'debate-preview-add-button';
    addButton.textContent = '＋ Add argument';

    const addForm = document.createElement('form');
    addForm.className = 'debate-preview-add-form';
    addForm.hidden = true;
    addForm.setAttribute('novalidate', '');

    const addField = document.createElement('label');
    addField.className = 'debate-preview-add-field';
    addField.innerHTML = '<span>Argument text</span>';
    const addInput = document.createElement('textarea');
    addInput.rows = 2;
    addInput.placeholder = 'Add a quick argument to test the flow.';
    addField.append(addInput);

    const addActions = document.createElement('div');
    addActions.className = 'debate-preview-add-actions';

    const submitAdd = document.createElement('button');
    submitAdd.type = 'submit';
    submitAdd.textContent = 'Add';

    const cancelAdd = document.createElement('button');
    cancelAdd.type = 'button';
    cancelAdd.textContent = 'Cancel';

    addActions.append(submitAdd, cancelAdd);
    addForm.append(addField, addActions);

    const getCombinedArguments = () => {
      const extras = state.additions.get(side.id) || [];
      const combined = [
        ...side.arguments.map((argument) => ({ ...argument })),
        ...extras.map((argument) => ({ ...argument }))
      ];
      combined.forEach((argument) => {
        const extraVotes = state.votes.get(argument.id) || 0;
        argument.displayVotes = argument.votes + extraVotes;
      });
      combined.sort((a, b) => {
        if (b.displayVotes !== a.displayVotes) {
          return b.displayVotes - a.displayVotes;
        }
        return a.text.localeCompare(b.text, undefined, { sensitivity: 'base' });
      });
      return combined;
    };

    const renderArguments = () => {
      list.innerHTML = '';
      const combined = getCombinedArguments();
      if (!combined.length) {
        const empty = document.createElement('p');
        empty.className = 'debate-preview-empty';
        empty.textContent = 'No arguments yet. Use the plus button to add one.';
        list.append(empty);
        return;
      }

      combined.forEach((argument) => {
        const item = document.createElement('div');
        item.className = 'debate-preview-argument';

        const text = document.createElement('p');
        text.textContent = argument.text || 'Add detail to describe this talking point.';

        const voteBtn = document.createElement('button');
        voteBtn.type = 'button';
        voteBtn.className = 'debate-preview-vote';
        voteBtn.setAttribute('aria-label', 'Upvote argument');
        voteBtn.textContent = `👍 ${argument.displayVotes}`;
        voteBtn.addEventListener('click', () => {
          const current = state.votes.get(argument.id) || 0;
          state.votes.set(argument.id, current + 1);
          renderArguments();
        });

        item.append(text, voteBtn);
        list.append(item);
      });
    };

    addButton.addEventListener('click', () => {
      addForm.hidden = false;
      addInput.focus();
    });

    cancelAdd.addEventListener('click', () => {
      addForm.hidden = true;
      addInput.value = '';
    });

    addForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = addInput.value.trim();
      if (!value) {
        return;
      }
      const additions = state.additions.get(side.id) || [];
      additions.push({ id: uid('preview-argument'), text: value, votes: 0 });
      state.additions.set(side.id, additions);
      addInput.value = '';
      addForm.hidden = true;
      renderArguments();
    });

    column.append(name, statement, list, addButton, addForm);
    columns.append(column);
    renderArguments();
  });

  wrapper.append(columns);
  container.append(wrapper);
};

const serializeForScript = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

const embedTemplate = (data, containerId) => {
  const working = ensureWorkingState(data);
  const sides = working.sides.map((side) => ({
    id: side.id,
    name: side.name,
    statement: side.statement,
    arguments: side.arguments.map((argument) => ({
      id: argument.id,
      text: argument.text,
      votes: argument.votes
    }))
  }));

  const scriptData = { question: working.question, instructions: working.instructions, sides };

  return {
    html: `
      <section class="cd-debate-simple" aria-labelledby="${containerId}-question">
        <header class="cd-debate-simple-header">
          <h3 id="${containerId}-question" class="cd-debate-simple-question">${escapeHtml(working.question)}</h3>
          ${
            working.instructions
              ? `<p class="cd-debate-simple-instructions">${escapeHtml(working.instructions)}</p>`
              : ''
          }
        </header>
        <div class="cd-debate-simple-columns">
          ${sides
            .map(
              (side) => `
            <article class="cd-debate-simple-side" data-side-id="${escapeHtml(side.id)}">
              <h4 class="cd-debate-simple-title">${escapeHtml(side.name || 'Debate side')}</h4>
              <p class="cd-debate-simple-statement">${escapeHtml(
                side.statement || 'Clarify this stance in the authoring view.'
              )}</p>
              <div class="cd-debate-simple-arguments" data-arguments></div>
              <button type="button" class="cd-debate-simple-add" data-add aria-label="Add argument for ${escapeHtml(
                side.name || 'this side'
              )}">＋</button>
              <form class="cd-debate-simple-form" data-form novalidate hidden>
                <label class="cd-debate-simple-label">
                  <span>Add your argument</span>
                  <textarea rows="3" maxlength="280" placeholder="Share a concise point." required></textarea>
                </label>
                <div class="cd-debate-simple-form-actions">
                  <button type="submit">Post</button>
                  <button type="button" data-cancel>Cancel</button>
                </div>
              </form>
            </article>`
            )
            .join('')}
        </div>
        <script type="application/json" data-debate-initial>${serializeForScript(scriptData)}</script>
      </section>
    `,
    css: `
      #${containerId} .cd-debate-simple {
        display: grid;
        gap: 1.5rem;
        padding: 1.5rem;
        border-radius: 18px;
        background: linear-gradient(145deg, rgba(99, 102, 241, 0.08), rgba(14, 165, 233, 0.08));
        border: 1px solid rgba(99, 102, 241, 0.14);
      }
      #${containerId} .cd-debate-simple-header {
        display: grid;
        gap: 0.6rem;
      }
      #${containerId} .cd-debate-simple-question {
        margin: 0;
        font-size: 1.35rem;
        font-weight: 700;
        color: #1e1b4b;
      }
      #${containerId} .cd-debate-simple-instructions {
        margin: 0;
        font-size: 0.95rem;
        color: rgba(30, 41, 59, 0.75);
      }
      #${containerId} .cd-debate-simple-columns {
        display: grid;
        gap: 1.2rem;
      }
      @media (min-width: 720px) {
        #${containerId} .cd-debate-simple-columns {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      #${containerId} .cd-debate-simple-side {
        display: grid;
        gap: 0.8rem;
        padding: 1.1rem;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid rgba(148, 163, 184, 0.4);
        box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
      }
      #${containerId} .cd-debate-simple-title {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
        color: #312e81;
      }
      #${containerId} .cd-debate-simple-statement {
        margin: 0;
        font-size: 0.95rem;
        color: rgba(30, 41, 59, 0.75);
      }
      #${containerId} .cd-debate-simple-arguments {
        display: grid;
        gap: 0.75rem;
      }
      #${containerId} .cd-debate-simple-empty {
        margin: 0;
        font-size: 0.9rem;
        color: rgba(30, 41, 59, 0.6);
        font-style: italic;
      }
      #${containerId} .cd-debate-simple-argument {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 0.9rem;
        border-radius: 12px;
        background: rgba(79, 70, 229, 0.08);
        border: 1px solid rgba(79, 70, 229, 0.18);
      }
      #${containerId} .cd-debate-simple-argument p {
        margin: 0;
        flex: 1;
        font-size: 0.95rem;
      }
      #${containerId} .cd-debate-simple-vote {
        border: none;
        background: rgba(79, 70, 229, 0.9);
        color: #fff;
        border-radius: 999px;
        font-weight: 600;
        padding: 0.35rem 0.75rem;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        transition: transform 160ms ease, box-shadow 160ms ease;
      }
      #${containerId} .cd-debate-simple-vote:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 18px rgba(79, 70, 229, 0.25);
      }
      #${containerId} .cd-debate-simple-add {
        width: 2.4rem;
        height: 2.4rem;
        border-radius: 999px;
        border: none;
        background: rgba(30, 64, 175, 0.85);
        color: #fff;
        font-size: 1.3rem;
        line-height: 1;
        cursor: pointer;
        margin-left: auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: transform 160ms ease, box-shadow 160ms ease;
      }
      #${containerId} .cd-debate-simple-add:hover {
        transform: translateY(-1px);
        box-shadow: 0 12px 20px rgba(30, 64, 175, 0.25);
      }
      #${containerId} .cd-debate-simple-form {
        display: grid;
        gap: 0.65rem;
        background: rgba(14, 165, 233, 0.08);
        border: 1px dashed rgba(14, 165, 233, 0.4);
        padding: 0.75rem;
        border-radius: 12px;
      }
      #${containerId} .cd-debate-simple-label {
        display: grid;
        gap: 0.35rem;
        font-size: 0.9rem;
        color: rgba(15, 23, 42, 0.8);
      }
      #${containerId} .cd-debate-simple-label textarea {
        border-radius: 10px;
        border: 1px solid rgba(148, 163, 184, 0.45);
        padding: 0.6rem 0.75rem;
        font-family: inherit;
      }
      #${containerId} .cd-debate-simple-form-actions {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
      }
      #${containerId} .cd-debate-simple-form-actions button {
        border-radius: 999px;
        border: none;
        padding: 0.45rem 1rem;
        font-weight: 600;
        cursor: pointer;
      }
      #${containerId} .cd-debate-simple-form-actions button[type='submit'] {
        background: rgba(14, 165, 233, 0.95);
        color: #fff;
      }
      #${containerId} .cd-debate-simple-form-actions button[data-cancel] {
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(148, 163, 184, 0.5);
        color: rgba(15, 23, 42, 0.75);
      }
    `,
    js: `(() => {
      const root = document.getElementById('${containerId}');
      if (!root) return;
      const dataNode = root.querySelector('[data-debate-initial]');
      if (!dataNode) return;
      let data = null;
      try {
        data = JSON.parse(dataNode.textContent || '{}');
      } catch (error) {
        console.warn('Unable to parse debate data', error);
        return;
      }
      dataNode.remove();
      if (!data || !Array.isArray(data.sides)) return;

      const sides = new Map();
      data.sides.forEach((side) => {
        sides.set(side.id, {
          id: side.id,
          name: side.name,
          statement: side.statement,
          arguments: Array.isArray(side.arguments)
            ? side.arguments.map((argument) => ({
                id: argument.id,
                text: argument.text,
                votes: Number.isFinite(argument.votes) ? argument.votes : Number.parseInt(argument.votes, 10) || 0
              }))
            : []
        });
      });

      const escapeAttribute = (value) => {
        if (window.CSS && typeof window.CSS.escape === 'function') {
          return window.CSS.escape(value);
        }
        return String(value).replace(/["\\]/g, '\\$&');
      };

      const renderSide = (side, column) => {
        const list = column.querySelector('[data-arguments]');
        if (!list) return;
        list.innerHTML = '';
        const argumentsList = [...side.arguments].sort((a, b) => {
          if (b.votes !== a.votes) {
            return b.votes - a.votes;
          }
          return a.text.localeCompare(b.text, undefined, { sensitivity: 'base' });
        });
        if (!argumentsList.length) {
          const empty = document.createElement('p');
          empty.className = 'cd-debate-simple-empty';
          empty.textContent = 'No arguments yet. Add one to get started.';
          list.appendChild(empty);
          return;
        }
        argumentsList.forEach((argument) => {
          const item = document.createElement('div');
          item.className = 'cd-debate-simple-argument';
          const text = document.createElement('p');
          text.textContent = argument.text;
          const voteBtn = document.createElement('button');
          voteBtn.type = 'button';
          voteBtn.className = 'cd-debate-simple-vote';
          voteBtn.setAttribute('aria-label', 'Upvote argument');
          voteBtn.innerHTML = '<span aria-hidden="true">👍</span><span>' + argument.votes + '</span>';
          voteBtn.addEventListener('click', () => {
            argument.votes += 1;
            renderSide(side, column);
          });
          item.appendChild(text);
          item.appendChild(voteBtn);
          list.appendChild(item);
        });
      };

      sides.forEach((side, sideId) => {
        const column = root.querySelector('[data-side-id="' + escapeAttribute(sideId) + '"]');
        if (!column) return;
        const addBtn = column.querySelector('[data-add]');
        const form = column.querySelector('[data-form]');
        if (!addBtn || !form) return;
        const textarea = form.querySelector('textarea');
        const cancelBtn = form.querySelector('[data-cancel]');
        addBtn.addEventListener('click', () => {
          form.hidden = false;
          textarea && textarea.focus();
        });
        cancelBtn?.addEventListener('click', () => {
          form.hidden = true;
          if (textarea) textarea.value = '';
        });
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          if (!textarea) return;
          const value = textarea.value.trim();
          if (!value) {
            return;
          }
          side.arguments.push({
            id: 'arg-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2),
            text: value,
            votes: 0
          });
          textarea.value = '';
          form.hidden = true;
          renderSide(side, column);
        });
        renderSide(side, column);
      });
    })();`
  };
};

const learningTip = {
  intro: 'Structured debates surface contrasting claims so learners can analyse evidence, reasoning, and delivery moves.',
  when: 'Use them after research or inquiry cycles when learners are ready to argue from evidence and synthesise multiple sources.',
  considerations: [
    'Model how to connect claims to the most relevant data or anecdotes so arguments stay concise.',
    'Invite listeners to record the most persuasive point from each column before voting.',
    'Plan a synthesis round where teams revise or extend their arguments using feedback from the audience.'
  ],
  examples: [
    'Political science seminar: debate whether compulsory voting would strengthen democratic participation.',
    'Environmental engineering course: argue for the most feasible decarbonisation strategy for the campus microgrid.',
    'Literary theory class: present competing interpretations of a protagonist\'s pivotal decision using scholarly sources.'
  ]
};

export const debate = {
  id: 'debate',
  label: 'Structured debate',
  template,
  example,
  buildEditor,
  renderPreview,
  embedTemplate,
  learningTip
};
