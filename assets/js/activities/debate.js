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

const SAMPLE_VIEWS = [
  {
    stance: 'pro',
    headline: 'Car-free space encourages everyday use',
    summary:
      'Families linger longer when they feel safe. The plaza would unlock casual meetups after school instead of everyone driving straight home.',
    author: 'Kayla',
    votes: 18
  },
  {
    stance: 'con',
    headline: 'Accessibility planning must come first',
    summary:
      'My neighbour uses a mobility van that needs curb access. Until we have a detailed loading plan we risk excluding people.',
    author: 'Miguel',
    votes: 14
  },
  {
    stance: 'pro',
    headline: 'Air quality improvements help the whole block',
    summary:
      'Sensors on similar projects show pollution drops quickly without idling cars. Cleaner air makes outdoor learning possible.',
    author: 'Amina',
    votes: 9
  }
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

const createLearnerView = (overrides = {}, index = 0) => {
  const baseSample = SAMPLE_VIEWS[index % SAMPLE_VIEWS.length];
  const base = {
    id: uid('debate-view'),
    stance: baseSample?.stance || (index % 2 === 0 ? 'pro' : 'con'),
    headline: baseSample?.headline || 'Offer a fresh perspective',
    summary: baseSample?.summary || 'Share why this idea matters for the motion.',
    author: baseSample?.author || `Learner ${index + 1}`,
    votes: baseSample?.votes || 6
  };
  const view = { ...base, ...overrides };
  if (!view.id) {
    view.id = uid('debate-view');
  }
  if (view.stance !== 'pro' && view.stance !== 'con') {
    view.stance = base.stance;
  }
  view.headline = typeof view.headline === 'string' ? view.headline : '';
  view.summary = typeof view.summary === 'string' ? view.summary : '';
  view.author = typeof view.author === 'string' ? view.author : '';
  const parsedVotes = Number.parseInt(view.votes, 10);
  view.votes = Number.isFinite(parsedVotes) && parsedVotes > 0 ? parsedVotes : 1;
  return view;
};

const normalisePoints = (points) => {
  if (!Array.isArray(points)) {
    return [];
  }
  return points.map((point, index) => createPoint(point, index));
};

const normaliseLearnerViews = (views) => {
  if (!Array.isArray(views) || !views.length) {
    return SAMPLE_VIEWS.map((view, index) => createLearnerView(view, index));
  }
  return views.map((view, index) => createLearnerView(view, index));
};

const createSampleLearnerViews = () => SAMPLE_VIEWS.map((view, index) => createLearnerView(view, index));

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
  teams: createSampleTeams(),
  learnerViews: createSampleLearnerViews()
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
  ],
  learnerViews: [
    createLearnerView(
      {
        stance: 'pro',
        headline: 'Four days can reduce student burnout',
        summary: 'Survey responses mentioned feeling exhausted by Thursday. A flex day could support rest and tutoring.',
        author: 'Jordan',
        votes: 16
      },
      0
    ),
    createLearnerView(
      {
        stance: 'con',
        headline: 'Families need consistent supervision',
        summary: 'My caregivers both work Fridays. Paying for an extra day of childcare would be tough for our budget.',
        author: 'Aaliyah',
        votes: 11
      },
      1
    ),
    createLearnerView(
      {
        stance: 'pro',
        headline: 'Clubs could meet for longer intensives',
        summary: 'Imagine robotics and theatre having a dedicated build day. It might help us compete at regionals.',
        author: 'Elliot',
        votes: 8
      },
      2
    )
  ]
});

const ensureWorkingState = (data) => {
  const safe = data ? clone(data) : {};
  return {
    prompt: typeof safe.prompt === 'string' ? safe.prompt : DEFAULT_PROMPT,
    context: typeof safe.context === 'string' ? safe.context : DEFAULT_CONTEXT,
    audienceTask: typeof safe.audienceTask === 'string' ? safe.audienceTask : DEFAULT_AUDIENCE_TASK,
    teams: normaliseTeams(safe.teams),
    learnerViews: normaliseLearnerViews(safe.learnerViews)
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

  const state = {
    views: working.learnerViews.map((view, index) => createLearnerView(view, index))
  };

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

  const layout = document.createElement('div');
  layout.className = 'debate-layout';
  wrapper.append(layout);

  const teamsSection = document.createElement('section');
  teamsSection.className = 'debate-teams';

  const teamsHeading = document.createElement('h4');
  teamsHeading.className = 'debate-subheading';
  teamsHeading.textContent = 'Team positions';
  teamsSection.append(teamsHeading);

  const grid = document.createElement('div');
  grid.className = 'debate-grid';

  working.teams.forEach((team) => {
    const card = document.createElement('article');
    card.className = 'debate-team';

    const name = document.createElement('h5');
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

  teamsSection.append(grid);

  const audience = document.createElement('aside');
  audience.className = 'debate-audience';

  const audienceTitle = document.createElement('h4');
  audienceTitle.className = 'debate-subheading';
  audienceTitle.textContent = 'Audience task';

  const audienceBody = document.createElement('p');
  audienceBody.textContent = working.audienceTask;

  audience.append(audienceTitle, audienceBody);
  teamsSection.append(audience);

  layout.append(teamsSection);

  const contributions = document.createElement('section');
  contributions.className = 'debate-contributions';

  const contributionsHeader = document.createElement('div');
  contributionsHeader.className = 'debate-contributions-header';

  const contributionsTitle = document.createElement('h4');
  contributionsTitle.className = 'debate-subheading';
  contributionsTitle.textContent = 'Learner views';

  const contributionsIntro = document.createElement('p');
  contributionsIntro.className = 'debate-contributions-intro';
  contributionsIntro.textContent = 'Vote for the ideas that resonate and add your take to broaden the debate.';

  contributionsHeader.append(contributionsTitle, contributionsIntro);
  contributions.append(contributionsHeader);

  const viewsList = document.createElement('div');
  viewsList.className = 'debate-views';
  contributions.append(viewsList);

  const status = document.createElement('p');
  status.className = 'debate-status';
  status.hidden = true;
  contributions.append(status);

  const form = document.createElement('form');
  form.className = 'debate-form';
  form.setAttribute('novalidate', '');

  const nameField = document.createElement('label');
  nameField.className = 'debate-form-field';
  nameField.innerHTML = '<span>Your name</span>';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.name = 'name';
  nameInput.placeholder = 'e.g. Jordan';
  nameInput.autocomplete = 'name';
  nameField.append(nameInput);

  const stanceField = document.createElement('fieldset');
  stanceField.className = 'debate-form-field debate-form-field--choices';
  const stanceLegend = document.createElement('legend');
  stanceLegend.textContent = 'Stance';
  stanceField.append(stanceLegend);

  const stanceOptions = [
    { value: 'pro', label: 'Support the motion' },
    { value: 'con', label: 'Challenge the motion' }
  ];

  stanceOptions.forEach((option, optionIndex) => {
    const label = document.createElement('label');
    label.className = 'debate-choice';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'stance';
    input.value = option.value;
    if (optionIndex === 0) {
      input.checked = true;
    }
    const span = document.createElement('span');
    span.textContent = option.label;
    label.append(input, span);
    stanceField.append(label);
  });

  const headlineField = document.createElement('label');
  headlineField.className = 'debate-form-field';
  headlineField.innerHTML = '<span>Headline</span>';
  const headlineInput = document.createElement('input');
  headlineInput.type = 'text';
  headlineInput.name = 'headline';
  headlineInput.placeholder = 'Summarise your view';
  headlineField.append(headlineInput);

  const summaryField = document.createElement('label');
  summaryField.className = 'debate-form-field';
  summaryField.innerHTML = '<span>Your reasoning</span>';
  const summaryInput = document.createElement('textarea');
  summaryInput.name = 'summary';
  summaryInput.rows = 3;
  summaryInput.placeholder = 'Share the evidence or experience behind your stance.';
  summaryField.append(summaryInput);

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.textContent = 'Share your view';

  form.append(nameField, stanceField, headlineField, summaryField, submit);
  contributions.append(form);

  const setStatus = (message, tone = 'info') => {
    if (message) {
      status.hidden = false;
      status.textContent = message;
      status.dataset.tone = tone;
    } else {
      status.hidden = true;
      status.textContent = '';
      delete status.dataset.tone;
    }
  };

  const renderViews = () => {
    viewsList.innerHTML = '';
    if (!state.views.length) {
      const empty = document.createElement('p');
      empty.className = 'debate-empty';
      empty.textContent = 'No views yet. Be the first to share your perspective.';
      viewsList.append(empty);
      return;
    }

    const sorted = [...state.views].sort((a, b) => {
      if (b.votes !== a.votes) {
        return b.votes - a.votes;
      }
      return a.headline.localeCompare(b.headline, undefined, { sensitivity: 'base' });
    });

    sorted.forEach((view) => {
      const card = document.createElement('article');
      card.className = `debate-view debate-view--${view.stance}`;

      const headerRow = document.createElement('div');
      headerRow.className = 'debate-view-header';

      const tag = document.createElement('span');
      tag.className = 'debate-view-tag';
      tag.textContent = view.stance === 'pro' ? 'Supports' : 'Challenges';

      const votes = document.createElement('span');
      votes.className = 'debate-view-votes';
      votes.textContent = `${view.votes} vote${view.votes === 1 ? '' : 's'}`;

      headerRow.append(tag, votes);

      const headline = document.createElement('h5');
      headline.className = 'debate-view-headline';
      headline.textContent = view.headline;

      const summary = document.createElement('p');
      summary.className = 'debate-view-summary';
      summary.textContent = view.summary;

      const footerRow = document.createElement('div');
      footerRow.className = 'debate-view-footer';

      const author = document.createElement('span');
      author.textContent = `Shared by ${view.author || 'Anonymous learner'}`;

      const voteBtn = document.createElement('button');
      voteBtn.type = 'button';
      voteBtn.className = 'debate-vote';
      voteBtn.textContent = 'Upvote';
      voteBtn.addEventListener('click', () => {
        view.votes += 1;
        renderViews();
      });

      footerRow.append(author, voteBtn);

      card.append(headerRow, headline, summary, footerRow);
      viewsList.append(card);
    });
  };

  renderViews();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    setStatus('');
    const formData = new FormData(form);
    const name = (formData.get('name') || '').toString().trim();
    const stance = (formData.get('stance') || 'pro').toString();
    const headline = (formData.get('headline') || '').toString().trim();
    const summary = (formData.get('summary') || '').toString().trim();

    if (!name || !headline || !summary) {
      setStatus('Add your name, a headline, and a short explanation to post.', 'error');
      return;
    }

    const view = createLearnerView(
      {
        author: name,
        stance,
        headline,
        summary,
        votes: 1
      },
      state.views.length
    );

    state.views.push(view);
    renderViews();
    form.reset();
    if (stanceField.querySelector('input[type="radio"]')) {
      stanceField.querySelectorAll('input[type="radio"]').forEach((input, index) => {
        input.checked = index === 0;
      });
    }
    setStatus('Thanks! Your view is now visible to the group.', 'success');
  });

  layout.append(contributions);
  container.append(wrapper);
};

const serializeViews = (views) =>
  JSON.stringify(views)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

const embedTemplate = (data, containerId) => {
  const working = ensureWorkingState(data);
  const teams = working.teams.length ? working.teams : createSampleTeams();
  const safePrompt = escapeHtml(working.prompt);
  const safeContext = escapeHtml(working.context);
  const safeAudience = escapeHtml(working.audienceTask);
  const views = working.learnerViews.length ? working.learnerViews : createSampleLearnerViews();
  const serializedViews = serializeViews(
    views.map((view, index) => {
      const item = createLearnerView(view, index);
      return {
        id: item.id,
        stance: item.stance,
        headline: item.headline,
        summary: item.summary,
        author: item.author,
        votes: item.votes
      };
    })
  );
  return {
    html: `
    <section class="cd-debate" aria-labelledby="${containerId}-title">
      <header class="cd-debate-header">
        <p class="cd-debate-kicker">Debate lab</p>
        <h3 id="${containerId}-title" class="cd-debate-title">${safePrompt}</h3>
        <p class="cd-debate-context">${safeContext}</p>
      </header>
      <div class="cd-debate-body">
        <section class="cd-debate-teams" aria-label="Team positions">
          <h4 class="cd-debate-subheading">Team positions</h4>
          <div class="cd-debate-grid">
            ${teams
              .map(
                (team) => `
              <article class="cd-debate-team">
                <h5 class="cd-debate-team-name">${escapeHtml(team.name)}</h5>
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
        <section class="cd-debate-contributions" aria-label="Learner views">
          <div class="cd-debate-contributions-header">
            <h4 class="cd-debate-subheading">Learner views</h4>
            <p>Vote for the most helpful ideas and add your own perspective.</p>
          </div>
          <div class="cd-debate-views" data-debate-views></div>
          <p class="cd-debate-status" data-debate-status hidden></p>
          <form class="cd-debate-form" data-debate-form novalidate>
            <label class="cd-debate-field">
              <span>Your name</span>
              <input type="text" name="name" autocomplete="name" placeholder="e.g. Jordan" />
            </label>
            <fieldset class="cd-debate-field cd-debate-field--choices">
              <legend>Stance</legend>
              <label><input type="radio" name="stance" value="pro" checked /> <span>Support the motion</span></label>
              <label><input type="radio" name="stance" value="con" /> <span>Challenge the motion</span></label>
            </fieldset>
            <label class="cd-debate-field">
              <span>Headline</span>
              <input type="text" name="headline" placeholder="Summarise your view" />
            </label>
            <label class="cd-debate-field">
              <span>Your reasoning</span>
              <textarea name="summary" rows="3" placeholder="Share the evidence or experience behind your stance."></textarea>
            </label>
            <button type="submit">Share your view</button>
          </form>
          <script type="application/json" data-debate-initial>${serializedViews}</script>
        </section>
      </div>
    </section>
  `,
    css: `
    #${containerId} .cd-debate {
      display: grid;
      gap: clamp(1.2rem, 3vw, 1.8rem);
      padding: clamp(1.2rem, 3vw, 1.8rem);
      background: rgba(248, 250, 252, 0.9);
      border: 1px solid rgba(148, 163, 184, 0.25);
      border-radius: 24px;
    }
    #${containerId} .cd-debate-header {
      display: grid;
      gap: 0.45rem;
      background: #ffffff;
      border-radius: 20px;
      border: 1px solid rgba(148, 163, 184, 0.35);
      padding: clamp(1rem, 2vw, 1.4rem);
      box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
    }
    #${containerId} .cd-debate-kicker {
      margin: 0;
      font-size: 0.75rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(79, 70, 229, 0.85);
      font-weight: 600;
    }
    #${containerId} .cd-debate-title {
      margin: 0;
      font-size: clamp(1.25rem, 2.6vw, 1.6rem);
      font-weight: 700;
      color: #0f172a;
    }
    #${containerId} .cd-debate-context {
      margin: 0;
      color: rgba(15, 23, 42, 0.75);
      line-height: 1.5;
    }
    #${containerId} .cd-debate-body {
      display: grid;
      gap: clamp(1.2rem, 3vw, 1.6rem);
      align-items: start;
    }
    @media (min-width: 900px) {
      #${containerId} .cd-debate-body {
        grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
      }
    }
    #${containerId} .cd-debate-teams,
    #${containerId} .cd-debate-contributions {
      display: grid;
      gap: 1rem;
      background: #ffffff;
      border-radius: 20px;
      border: 1px solid rgba(226, 232, 240, 0.8);
      padding: clamp(1rem, 2vw, 1.4rem);
      box-shadow: 0 10px 20px rgba(15, 23, 42, 0.06);
    }
    #${containerId} .cd-debate-subheading {
      margin: 0;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: rgba(79, 70, 229, 0.9);
      font-weight: 700;
    }
    #${containerId} .cd-debate-grid {
      display: grid;
      gap: 0.9rem;
    }
    @media (min-width: 600px) {
      #${containerId} .cd-debate-grid {
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }
    }
    #${containerId} .cd-debate-team {
      display: grid;
      gap: 0.55rem;
      border: 1px solid rgba(148, 163, 184, 0.35);
      border-radius: 16px;
      padding: 0.9rem;
      background: rgba(249, 250, 251, 0.85);
    }
    #${containerId} .cd-debate-team-name {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: #1e1b4b;
    }
    #${containerId} .cd-debate-team-stance {
      margin: 0;
      color: rgba(67, 56, 202, 0.85);
      font-weight: 600;
    }
    #${containerId} .cd-debate-opening,
    #${containerId} .cd-debate-closing {
      margin: 0;
      color: rgba(15, 23, 42, 0.8);
      line-height: 1.5;
      font-size: 0.92rem;
    }
    #${containerId} .cd-debate-points {
      margin: 0;
      padding-left: 1.1rem;
      display: grid;
      gap: 0.4rem;
      color: rgba(15, 23, 42, 0.78);
    }
    #${containerId} .cd-debate-point {
      line-height: 1.5;
    }
    #${containerId} .cd-debate-audience {
      margin: 0;
      border-radius: 16px;
      border: 1px dashed rgba(79, 70, 229, 0.3);
      padding: 0.9rem;
      background: rgba(238, 242, 255, 0.6);
      color: rgba(30, 41, 59, 0.85);
      display: grid;
      gap: 0.4rem;
    }
    #${containerId} .cd-debate-audience p {
      margin: 0;
      line-height: 1.45;
    }
    #${containerId} .cd-debate-contributions-header {
      display: grid;
      gap: 0.35rem;
    }
    #${containerId} .cd-debate-contributions-header p {
      margin: 0;
      color: rgba(15, 23, 42, 0.7);
      font-size: 0.92rem;
      line-height: 1.45;
    }
    #${containerId} .cd-debate-views {
      display: grid;
      gap: 0.75rem;
    }
    #${containerId} .cd-debate-view {
      display: grid;
      gap: 0.55rem;
      border-radius: 16px;
      border: 1px solid rgba(148, 163, 184, 0.4);
      padding: 0.9rem;
      background: rgba(249, 250, 251, 0.9);
    }
    #${containerId} .cd-debate-view--pro {
      border-color: rgba(34, 197, 94, 0.35);
      background: rgba(220, 252, 231, 0.65);
    }
    #${containerId} .cd-debate-view--con {
      border-color: rgba(56, 189, 248, 0.35);
      background: rgba(224, 242, 254, 0.65);
    }
    #${containerId} .cd-debate-view-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8rem;
      color: rgba(15, 23, 42, 0.65);
    }
    #${containerId} .cd-debate-view-tag {
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    #${containerId} .cd-debate-view-votes {
      font-weight: 600;
    }
    #${containerId} .cd-debate-view-headline {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: rgba(15, 23, 42, 0.9);
    }
    #${containerId} .cd-debate-view-summary {
      margin: 0;
      color: rgba(15, 23, 42, 0.75);
      line-height: 1.5;
      font-size: 0.95rem;
    }
    #${containerId} .cd-debate-view-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.82rem;
      color: rgba(15, 23, 42, 0.6);
    }
    #${containerId} .cd-debate-vote {
      border: 1px solid rgba(79, 70, 229, 0.4);
      background: rgba(79, 70, 229, 0.08);
      color: #4f46e5;
      border-radius: 999px;
      padding: 0.4rem 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 140ms ease, box-shadow 140ms ease;
    }
    #${containerId} .cd-debate-vote:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 18px rgba(79, 70, 229, 0.18);
    }
    #${containerId} .cd-debate-status {
      margin: 0;
      font-size: 0.85rem;
      padding: 0.55rem 0.75rem;
      border-radius: 12px;
      background: rgba(59, 130, 246, 0.12);
      color: rgba(30, 64, 175, 0.9);
    }
    #${containerId} .cd-debate-status[data-tone="error"] {
      background: rgba(239, 68, 68, 0.12);
      color: rgba(185, 28, 28, 0.9);
    }
    #${containerId} .cd-debate-status[data-tone="success"] {
      background: rgba(34, 197, 94, 0.12);
      color: rgba(22, 101, 52, 0.9);
    }
    #${containerId} .cd-debate-form {
      display: grid;
      gap: 0.75rem;
    }
    #${containerId} .cd-debate-field {
      display: grid;
      gap: 0.35rem;
      font-size: 0.85rem;
      color: rgba(15, 23, 42, 0.7);
    }
    #${containerId} .cd-debate-field input,
    #${containerId} .cd-debate-field textarea {
      border: 1px solid rgba(148, 163, 184, 0.6);
      border-radius: 12px;
      padding: 0.6rem 0.75rem;
      font-family: inherit;
      font-size: 0.95rem;
      color: rgba(15, 23, 42, 0.88);
      background: rgba(255, 255, 255, 0.95);
      transition: border-color 160ms ease, box-shadow 160ms ease;
    }
    #${containerId} .cd-debate-field input:focus,
    #${containerId} .cd-debate-field textarea:focus {
      border-color: rgba(79, 70, 229, 0.6);
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
      outline: none;
    }
    #${containerId} .cd-debate-field--choices {
      border: none;
      padding: 0;
      margin: 0;
    }
    #${containerId} .cd-debate-field--choices > label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.45rem 0.6rem;
      border-radius: 10px;
      border: 1px solid rgba(148, 163, 184, 0.5);
      background: rgba(249, 250, 251, 0.7);
      cursor: pointer;
      transition: border-color 160ms ease, background 160ms ease;
    }
    #${containerId} .cd-debate-field--choices > label + label {
      margin-top: 0.4rem;
    }
    #${containerId} .cd-debate-field--choices input:checked + span {
      font-weight: 600;
      color: rgba(79, 70, 229, 0.95);
    }
    #${containerId} .cd-debate-field--choices input:focus-visible + span {
      outline: 2px solid rgba(79, 70, 229, 0.4);
      outline-offset: 2px;
    }
    #${containerId} .cd-debate-form button[type="submit"] {
      border: none;
      border-radius: 12px;
      background: #4f46e5;
      color: #fff;
      font-weight: 600;
      padding: 0.65rem 1rem;
      font-size: 0.95rem;
      cursor: pointer;
      transition: transform 150ms ease, box-shadow 150ms ease, background 150ms ease;
    }
    #${containerId} .cd-debate-form button[type="submit"]:hover {
      transform: translateY(-1px);
      box-shadow: 0 12px 20px rgba(79, 70, 229, 0.2);
      background: #4338ca;
    }
  `,
    js: `(() => {
      const container = document.getElementById('${containerId}');
      if (!container) return;
      const list = container.querySelector('[data-debate-views]');
      const form = container.querySelector('[data-debate-form]');
      const status = container.querySelector('[data-debate-status]');
      const dataNode = container.querySelector('[data-debate-initial]');

      const clampText = (value, max) => {
        if (typeof value !== 'string') return '';
        const trimmed = value.trim();
        return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
      };

      const normalise = (view, index = 0) => {
        const stance = view && view.stance === 'con' ? 'con' : 'pro';
        const baseId = typeof view?.id === 'string' && view.id.trim() ? view.id.trim() : `view-${Date.now().toString(36)}-${index}`;
        const headline = clampText(view?.headline ?? '', 120);
        const summary = clampText(view?.summary ?? '', 320);
        const author = clampText(view?.author ?? '', 80);
        const parsedVotes = Number.parseInt(view?.votes, 10);
        return {
          id: baseId,
          stance,
          headline,
          summary,
          author,
          votes: Number.isFinite(parsedVotes) && parsedVotes > 0 ? parsedVotes : 1
        };
      };

      let views = [];
      if (dataNode) {
        try {
          const parsed = JSON.parse(dataNode.textContent || '[]');
          if (Array.isArray(parsed)) {
            views = parsed.map((item, index) => normalise(item, index));
          }
        } catch (error) {
          console.warn('Unable to parse learner views', error);
        }
        dataNode.remove();
      }

      const setStatus = (message, tone = 'info') => {
        if (!status) return;
        if (message) {
          status.hidden = false;
          status.textContent = message;
          status.dataset.tone = tone;
        } else {
          status.hidden = true;
          status.textContent = '';
          delete status.dataset.tone;
        }
      };

      const render = () => {
        if (!list) return;
        list.innerHTML = '';
        if (!views.length) {
          const empty = document.createElement('p');
          empty.className = 'cd-debate-empty';
          empty.textContent = 'No views yet. Be the first to contribute.';
          list.append(empty);
          return;
        }

        const sorted = [...views].sort((a, b) => {
          if (b.votes !== a.votes) return b.votes - a.votes;
          return a.headline.localeCompare(b.headline, undefined, { sensitivity: 'base' });
        });

        sorted.forEach((view) => {
          const card = document.createElement('article');
          card.className = `cd-debate-view cd-debate-view--${view.stance}`;

          const headerRow = document.createElement('div');
          headerRow.className = 'cd-debate-view-header';

          const tag = document.createElement('span');
          tag.className = 'cd-debate-view-tag';
          tag.textContent = view.stance === 'pro' ? 'Supports' : 'Challenges';

          const votes = document.createElement('span');
          votes.className = 'cd-debate-view-votes';
          votes.textContent = `${view.votes} vote${view.votes === 1 ? '' : 's'}`;

          headerRow.append(tag, votes);

          const headline = document.createElement('h5');
          headline.className = 'cd-debate-view-headline';
          headline.textContent = view.headline || (view.stance === 'pro' ? 'Supports the motion' : 'Challenges the motion');

          const summary = document.createElement('p');
          summary.className = 'cd-debate-view-summary';
          summary.textContent = view.summary || 'Learner is still thinking through their reasoning.';

          const footerRow = document.createElement('div');
          footerRow.className = 'cd-debate-view-footer';

          const author = document.createElement('span');
          author.textContent = `Shared by ${view.author || 'Anonymous learner'}`;

          const voteBtn = document.createElement('button');
          voteBtn.type = 'button';
          voteBtn.className = 'cd-debate-vote';
          voteBtn.textContent = 'Upvote';
          voteBtn.addEventListener('click', () => {
            view.votes += 1;
            render();
          });

          footerRow.append(author, voteBtn);

          card.append(headerRow, headline, summary, footerRow);
          list.append(card);
        });
      };

      render();

      if (form) {
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          setStatus('');
          const formData = new FormData(form);
          const name = clampText(formData.get('name') || '', 80);
          const stanceValue = formData.get('stance');
          const stance = stanceValue === 'con' ? 'con' : 'pro';
          const headline = clampText(formData.get('headline') || '', 120);
          const summary = clampText(formData.get('summary') || '', 320);

          if (!name || !headline || !summary) {
            setStatus('Add your name, a headline, and a short explanation to post.', 'error');
            return;
          }

          const view = normalise(
            {
              id: `view-${Date.now().toString(36)}-${views.length}`,
              author: name,
              stance,
              headline,
              summary,
              votes: 1
            },
            views.length
          );

          views.push(view);
          render();
          form.reset();
          const defaultRadio = form.querySelector('input[name="stance"][value="pro"]');
          if (defaultRadio) {
            defaultRadio.checked = true;
          }
          setStatus('Thanks! Your view is now visible to the group.', 'success');
        });
      }
    })();`
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
