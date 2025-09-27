import { clone, uid, escapeHtml } from '../utils.js';

const DEFAULT_PROMPT = 'Should cities convert major downtown streets into pedestrian-only plazas?';
const DEFAULT_CONTEXT =
  'Frame the motion in everyday language and outline why it matters to the class before teams take the floor.';
const DEFAULT_AUDIENCE_TASK =
  'Listen for the most compelling evidence from each side. After closing statements, vote and explain your reasoning.';

const SAMPLE_POINTS = [
  'Pedestrian plazas boost local business visibility and encourage foot traffic.',
  'Car-free zones improve air quality and make streets safer for families.',
  'Delivery and accessibility plans can be scheduled during off-peak hours to minimise disruption.',
  'Road closures increase congestion on surrounding streets and slow emergency response times.',
  'Some residents rely on car access for work, healthcare, or mobility needs.',
  'Pilot programs let the city gather data before making a permanent decision.'
];

const createPoint = (overrides = {}, index = 0) => {
  const base = {
    id: uid('debate-point'),
    text: SAMPLE_POINTS[index % SAMPLE_POINTS.length]
  };
  const point = { ...base, ...overrides };
  if (!point.id) {
    point.id = uid('debate-point');
  }
  if (typeof point.text !== 'string') {
    point.text = '';
  }
  return point;
};

const normalisePoints = (points) => {
  if (!Array.isArray(points)) {
    return [];
  }
  return points.map((point, index) => createPoint(point, index));
};

const TEAM_LABELS = [
  {
    name: 'Affirmative team',
    stance: 'Supports the motion and argues for adopting it.'
  },
  {
    name: 'Opposing team',
    stance: 'Challenges the motion and argues against adopting it.'
  }
];

const createTeam = (overrides = {}, index = 0) => {
  const defaults = TEAM_LABELS[index % TEAM_LABELS.length];
  const base = {
    id: uid('debate-team'),
    name: defaults?.name || `Team ${index + 1}`,
    stance: defaults?.stance || 'Shares a unique perspective on the motion.',
    opening: 'State the team\'s claim, define key terms, and outline the roadmap for your argument.',
    evidence: normalisePoints([
      { text: SAMPLE_POINTS[index % SAMPLE_POINTS.length] },
      { text: SAMPLE_POINTS[(index + 1) % SAMPLE_POINTS.length] }
    ]),
    closing: 'Summarise your strongest evidence and remind the audience what is at stake.'
  };
  const team = { ...base, ...overrides };
  if (!team.id) {
    team.id = uid('debate-team');
  }
  if (typeof team.name !== 'string') {
    team.name = '';
  }
  if (typeof team.stance !== 'string') {
    team.stance = '';
  }
  if (typeof team.opening !== 'string') {
    team.opening = '';
  }
  if (typeof team.closing !== 'string') {
    team.closing = '';
  }
  team.evidence = normalisePoints(team.evidence);
  if (!team.evidence.length) {
    team.evidence = normalisePoints([
      { text: SAMPLE_POINTS[index % SAMPLE_POINTS.length] }
    ]);
  }
  return team;
};

const normaliseTeams = (teams) => {
  if (!Array.isArray(teams) || teams.length === 0) {
    return createSampleTeams();
  }
  const cleaned = teams.map((team, index) => createTeam(team, index));
  if (cleaned.length < 2) {
    cleaned.push(createTeam({}, cleaned.length));
  }
  return cleaned;
};

const createSampleTeams = () =>
  [
    createTeam(
      {
        name: 'Affirmative team',
        stance: 'Argues that plazas make the city healthier and more vibrant.',
        opening:
          'We affirm the motion. Converting our main street unlocks safer walking routes, draws visitors, and boosts neighbourhood pride.',
        evidence: normalisePoints([
          { text: 'Cities that pedestrianised central streets saw retail sales rise by up to 30% within a year.' },
          { text: 'Removing vehicle lanes frees space for seating, art, and community events that increase dwell time.' },
          { text: 'Air quality sensors in comparable pilots recorded a 40% drop in nitrogen dioxide during peak hours.' }
        ]),
        closing:
          'A plaza invites people back to the heart of the city. We urge you to vote yes for a greener, safer downtown.'
      },
      0
    ),
    createTeam(
      {
        name: 'Opposing team',
        stance: 'Argues that closing the street harms accessibility and equity.',
        opening:
          'We negate the motion. The plan ignores residents who depend on direct vehicle access and adds traffic to fragile side streets.',
        evidence: normalisePoints([
          { text: 'Transport surveys show 45% of downtown workers commute by car due to limited transit coverage.' },
          { text: 'Emergency services warn that rerouting adds four critical minutes to peak response times.' },
          { text: 'Delivery drivers and disability advocates have not been consulted on viable loading zones.' }
        ]),
        closing:
          'Equity requires us to improve, not remove, access. Vote no until the city designs a solution that serves everyone.'
      },
      1
    )
  ];

const template = () => ({
  prompt: DEFAULT_PROMPT,
  context: DEFAULT_CONTEXT,
  audienceTask: DEFAULT_AUDIENCE_TASK,
  teams: createSampleTeams()
});

const example = () => ({
  prompt: 'Should our school adopt a four-day instructional week next year?',
  context:
    'Students analysed attendance data, extracurricular schedules, and family surveys. Use those findings to frame your stance.',
  audienceTask:
    'Capture the most convincing piece of evidence you hear from each side. Decide which argument best addressed community needs.',
  teams: [
    createTeam(
      {
        name: 'Pro change team',
        stance: 'Argues a four-day week increases engagement and well-being.',
        opening:
          'We support the shift. A focused schedule gives teachers more collaboration time and students richer project blocks.',
        evidence: normalisePoints([
          { text: 'Districts piloting four-day weeks reported a 12% drop in student absences.' },
          { text: 'Teachers use the fifth day for co-planning and intervention, boosting instructional quality.' },
          { text: 'Longer class periods allow labs, performances, and internships that rarely fit into 48-minute blocks.' }
        ]),
        closing:
          'Our community gains flexibility without sacrificing learning. Vote yes to reimagine how we use time.'
      },
      0
    ),
    createTeam(
      {
        name: 'Keep five days team',
        stance: 'Argues continuity matters more than schedule changes.',
        opening:
          'We oppose the shift. Families rely on consistent schedules and data on achievement impacts remains inconclusive.',
        evidence: normalisePoints([
          { text: 'State assessments show neutral academic results after schedule changes—no guaranteed gains.' },
          { text: 'Working families face added childcare costs on the fifth day.' },
          { text: 'Extracurriculars may shrink when travel and practice windows collide with condensed academics.' }
        ]),
        closing:
          'Stability supports every learner. Keep the five-day week while we invest in supports that already work.'
      },
      1
    )
  ]
});

const ensureWorkingState = (data) => {
  const safe = data ? clone(data) : {};
  return {
    prompt: typeof safe.prompt === 'string' ? safe.prompt : DEFAULT_PROMPT,
    context: typeof safe.context === 'string' ? safe.context : DEFAULT_CONTEXT,
    audienceTask: typeof safe.audienceTask === 'string' ? safe.audienceTask : DEFAULT_AUDIENCE_TASK,
    teams: normaliseTeams(safe.teams)
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

    const promptField = document.createElement('label');
    promptField.className = 'field';
    promptField.innerHTML = '<span class="field-label">Debate motion</span>';
    const promptInput = document.createElement('textarea');
    promptInput.rows = 2;
    promptInput.value = working.prompt;
    promptInput.placeholder = 'Phrase the motion learners will debate.';
    promptInput.addEventListener('input', () => {
      working.prompt = promptInput.value;
      emit(false);
    });
    promptField.append(promptInput);

    const contextField = document.createElement('label');
    contextField.className = 'field';
    contextField.innerHTML = '<span class="field-label">Context or briefing</span>';
    const contextInput = document.createElement('textarea');
    contextInput.rows = 3;
    contextInput.value = working.context;
    contextInput.placeholder = 'Share background knowledge, vocabulary, or constraints.';
    contextInput.addEventListener('input', () => {
      working.context = contextInput.value;
      emit(false);
    });
    contextField.append(contextInput);

    const audienceField = document.createElement('label');
    audienceField.className = 'field';
    audienceField.innerHTML = '<span class="field-label">Audience task</span>';
    const audienceInput = document.createElement('textarea');
    audienceInput.rows = 2;
    audienceInput.value = working.audienceTask;
    audienceInput.placeholder = 'Explain how listeners will participate or provide feedback.';
    audienceInput.addEventListener('input', () => {
      working.audienceTask = audienceInput.value;
      emit(false);
    });
    audienceField.append(audienceInput);

    container.append(promptField, contextField, audienceField);

    if (!working.teams.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<p>No perspectives yet. Add at least two teams to plan your debate.</p>';
      container.append(empty);
    }

    working.teams.forEach((team, index) => {
      const editorItem = document.createElement('div');
      editorItem.className = 'editor-item';

      const header = document.createElement('div');
      header.className = 'editor-item-header';
      header.innerHTML = `<span>Perspective ${index + 1}</span>`;

      const actions = document.createElement('div');
      actions.className = 'editor-item-actions';

      const duplicateBtn = document.createElement('button');
      duplicateBtn.type = 'button';
      duplicateBtn.className = 'muted-button';
      duplicateBtn.textContent = 'Duplicate';
      duplicateBtn.addEventListener('click', () => {
        const cloneSource = clone(team);
        working.teams.splice(index + 1, 0, createTeam({ ...cloneSource, id: uid('debate-team') }, index + 1));
        emit();
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'muted-button';
      deleteBtn.textContent = 'Remove';
      deleteBtn.disabled = working.teams.length <= 2;
      deleteBtn.addEventListener('click', () => {
        if (working.teams.length <= 2) {
          return;
        }
        working.teams.splice(index, 1);
        emit();
      });

      actions.append(duplicateBtn, deleteBtn);
      header.append(actions);

      const nameField = document.createElement('label');
      nameField.className = 'field';
      nameField.innerHTML = '<span class="field-label">Team name</span>';
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'text-input';
      nameInput.value = team.name;
      nameInput.placeholder = 'e.g. Affirmative team';
      nameInput.addEventListener('input', () => {
        working.teams[index].name = nameInput.value;
        emit(false);
      });
      nameField.append(nameInput);

      const stanceField = document.createElement('label');
      stanceField.className = 'field';
      stanceField.innerHTML = '<span class="field-label">Stance summary</span>';
      const stanceInput = document.createElement('textarea');
      stanceInput.rows = 2;
      stanceInput.value = team.stance;
      stanceInput.placeholder = 'Clarify how this team interprets the motion.';
      stanceInput.addEventListener('input', () => {
        working.teams[index].stance = stanceInput.value;
        emit(false);
      });
      stanceField.append(stanceInput);

      const openingField = document.createElement('label');
      openingField.className = 'field';
      openingField.innerHTML = '<span class="field-label">Opening statement</span>';
      const openingInput = document.createElement('textarea');
      openingInput.rows = 3;
      openingInput.value = team.opening;
      openingInput.placeholder = 'Outline the claim, key definitions, and the roadmap.';
      openingInput.addEventListener('input', () => {
        working.teams[index].opening = openingInput.value;
        emit(false);
      });
      openingField.append(openingInput);

      const evidenceWrapper = document.createElement('div');
      evidenceWrapper.className = 'field';
      evidenceWrapper.innerHTML = '<span class="field-label">Supporting points</span>';

      team.evidence.forEach((point, pointIndex) => {
        const row = document.createElement('div');
        row.className = 'field field--inline';

        const label = document.createElement('span');
        label.className = 'field-label';
        label.textContent = `Point ${pointIndex + 1}`;

        const group = document.createElement('div');
        group.className = 'field-inline-group';

        const pointInput = document.createElement('textarea');
        pointInput.rows = 2;
        pointInput.value = point.text;
        pointInput.placeholder = 'Add evidence, reasoning, or an example.';
        pointInput.addEventListener('input', () => {
          working.teams[index].evidence[pointIndex].text = pointInput.value;
          emit(false);
        });

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'muted-button';
        removeBtn.textContent = 'Remove';
        removeBtn.disabled = team.evidence.length <= 1;
        removeBtn.addEventListener('click', () => {
          if (team.evidence.length <= 1) {
            return;
          }
          working.teams[index].evidence.splice(pointIndex, 1);
          emit();
        });

        group.append(pointInput, removeBtn);
        row.append(label, group);
        evidenceWrapper.append(row);
      });

      const addPointBtn = document.createElement('button');
      addPointBtn.type = 'button';
      addPointBtn.className = 'ghost-button';
      addPointBtn.textContent = 'Add supporting point';
      addPointBtn.addEventListener('click', () => {
        working.teams[index].evidence.push(createPoint({ text: 'Add a new supporting idea.' }, team.evidence.length));
        emit();
      });
      evidenceWrapper.append(addPointBtn);

      const closingField = document.createElement('label');
      closingField.className = 'field';
      closingField.innerHTML = '<span class="field-label">Closing statement</span>';
      const closingInput = document.createElement('textarea');
      closingInput.rows = 3;
      closingInput.value = team.closing;
      closingInput.placeholder = 'Help the audience remember your strongest ideas.';
      closingInput.addEventListener('input', () => {
        working.teams[index].closing = closingInput.value;
        emit(false);
      });
      closingField.append(closingInput);

      editorItem.append(header, nameField, stanceField, openingField, evidenceWrapper, closingField);
      container.append(editorItem);
    });

    const addTeamBtn = document.createElement('button');
    addTeamBtn.type = 'button';
    addTeamBtn.className = 'ghost-button';
    addTeamBtn.textContent = 'Add perspective';
    addTeamBtn.addEventListener('click', () => {
      working.teams.push(createTeam({ name: `Team ${working.teams.length + 1}` }, working.teams.length));
      emit();
    });

    container.append(addTeamBtn);
  };

  rerender();
};

const renderPreview = (container, data) => {
  const working = ensureWorkingState(data);
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'debate';

  const header = document.createElement('div');
  header.className = 'debate-header';

  const title = document.createElement('h3');
  title.className = 'debate-title';
  title.textContent = working.prompt;

  const context = document.createElement('p');
  context.className = 'debate-context';
  context.textContent = working.context;

  header.append(title, context);
  wrapper.append(header);

  const grid = document.createElement('div');
  grid.className = 'debate-grid';

  working.teams.forEach((team) => {
    const card = document.createElement('article');
    card.className = 'debate-team';

    const name = document.createElement('h4');
    name.className = 'debate-team-name';
    name.textContent = team.name;

    const stance = document.createElement('p');
    stance.className = 'debate-team-stance';
    stance.textContent = team.stance;

    const opening = document.createElement('p');
    opening.className = 'debate-opening';
    opening.textContent = team.opening;

    const listHeading = document.createElement('p');
    listHeading.className = 'debate-subheading';
    listHeading.textContent = 'Supporting points';

    const list = document.createElement('ul');
    list.className = 'debate-points';
    team.evidence.forEach((point) => {
      const item = document.createElement('li');
      item.className = 'debate-point';
      item.textContent = point.text;
      list.append(item);
    });

    const closing = document.createElement('p');
    closing.className = 'debate-closing';
    closing.textContent = team.closing;

    card.append(name, stance, opening, listHeading, list, closing);
    grid.append(card);
  });

  wrapper.append(grid);

  const audience = document.createElement('aside');
  audience.className = 'debate-audience';

  const audienceTitle = document.createElement('h4');
  audienceTitle.className = 'debate-subheading';
  audienceTitle.textContent = 'Audience task';

  const audienceBody = document.createElement('p');
  audienceBody.textContent = working.audienceTask;

  audience.append(audienceTitle, audienceBody);
  wrapper.append(audience);

  container.append(wrapper);
};

const embedTemplate = (data, containerId) => {
  const working = ensureWorkingState(data);
  const teams = working.teams.length ? working.teams : createSampleTeams();
  const safePrompt = escapeHtml(working.prompt);
  const safeContext = escapeHtml(working.context);
  const safeAudience = escapeHtml(working.audienceTask);
  return {
    html: `
    <section class="cd-debate">
      <header class="cd-debate-header">
        <h3 class="cd-debate-title">${safePrompt}</h3>
        <p class="cd-debate-context">${safeContext}</p>
      </header>
      <div class="cd-debate-grid">
        ${teams
          .map(
            (team) => `
          <article class="cd-debate-team">
            <h4 class="cd-debate-team-name">${escapeHtml(team.name)}</h4>
            <p class="cd-debate-team-stance">${escapeHtml(team.stance)}</p>
            <p class="cd-debate-opening">${escapeHtml(team.opening)}</p>
            <p class="cd-debate-subheading">Supporting points</p>
            <ul class="cd-debate-points">
              ${team.evidence
                .map(
                  (point) => `
                <li class="cd-debate-point">${escapeHtml(point.text)}</li>`
                )
                .join('')}
            </ul>
            <p class="cd-debate-closing">${escapeHtml(team.closing)}</p>
          </article>`
          )
          .join('')}
      </div>
      <aside class="cd-debate-audience">
        <h4 class="cd-debate-subheading">Audience task</h4>
        <p>${safeAudience}</p>
      </aside>
    </section>
  `,
    css: `
    #${containerId} .cd-debate {
      display: flex;
      flex-direction: column;
      gap: 1.4rem;
      font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    #${containerId} .cd-debate-header {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(59, 130, 246, 0.04));
      border-radius: 18px;
      padding: 1.4rem;
      border: 1px solid rgba(59, 130, 246, 0.15);
      box-shadow: 0 18px 32px rgba(15, 23, 42, 0.08);
    }
    #${containerId} .cd-debate-title {
      margin: 0 0 0.6rem;
      font-size: 1.2rem;
      font-weight: 700;
      color: #0f172a;
    }
    #${containerId} .cd-debate-context {
      margin: 0;
      color: #334155;
      line-height: 1.5;
    }
    #${containerId} .cd-debate-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.2rem;
    }
    #${containerId} .cd-debate-team {
      border-radius: 18px;
      border: 1px solid rgba(129, 140, 248, 0.18);
      background: linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(224, 231, 255, 0.9));
      padding: 1.2rem;
      box-shadow: 0 20px 38px rgba(99, 102, 241, 0.12);
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
    }
    #${containerId} .cd-debate-team-name {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      color: #312e81;
    }
    #${containerId} .cd-debate-team-stance {
      margin: 0;
      color: #4338ca;
      font-weight: 600;
    }
    #${containerId} .cd-debate-opening,
    #${containerId} .cd-debate-closing {
      margin: 0;
      color: #1f2937;
      line-height: 1.55;
    }
    #${containerId} .cd-debate-subheading {
      margin: 0;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6366f1;
      font-weight: 700;
    }
    #${containerId} .cd-debate-points {
      margin: 0;
      padding-left: 1.1rem;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      color: #1f2937;
    }
    #${containerId} .cd-debate-point {
      line-height: 1.55;
    }
    #${containerId} .cd-debate-audience {
      border-radius: 18px;
      border: 1px dashed rgba(99, 102, 241, 0.35);
      padding: 1.2rem;
      background: rgba(238, 242, 255, 0.4);
      color: #312e81;
    }
    #${containerId} .cd-debate-audience p {
      margin: 0.4rem 0 0;
      color: #1e293b;
    }
    @media (max-width: 640px) {
      #${containerId} .cd-debate-grid {
        grid-template-columns: 1fr;
      }
    }
  `
  };
};

const learningTip = {
  intro: 'Structured debates surface contrasting claims so learners can analyse evidence, reasoning, and delivery moves.',
  when: 'Use them after research or inquiry cycles when learners are ready to argue from evidence and synthesise multiple sources.',
  considerations: [
    'Model the structure: opening statements, alternating evidence, and concise closings keep the exchange focused.',
    'Assign listening jobs or note catchers so the audience evaluates argument quality instead of picking a favourite speaker.',
    'Invite teams to revise claims after the debate by citing the most persuasive counterarguments they heard.'
  ],
  examples: [
    'History: Debate whether a revolution achieved its stated goals.',
    'Science: Argue for the energy source that best fits a community\'s needs.',
    'English: Present competing interpretations of a character\'s pivotal decision.'
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
