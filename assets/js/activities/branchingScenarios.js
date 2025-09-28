import { clone, escapeHtml, uid } from '../utils.js';

const createChoice = (overrides = {}, index = 0) => {
  const base = {
    id: uid('branch-choice'),
    label: `Option ${index + 1}`,
    outcome: 'Describe what happens next.',
    nextStepId: ''
  };
  const choice = { ...base, ...overrides };
  if (!choice.id) {
    choice.id = uid('branch-choice');
  }
  if (typeof choice.label !== 'string') {
    choice.label = '';
  }
  if (typeof choice.outcome !== 'string') {
    choice.outcome = '';
  }
  if (typeof choice.nextStepId !== 'string') {
    choice.nextStepId = '';
  }
  return choice;
};

const normaliseChoices = (choices) => {
  if (!Array.isArray(choices)) {
    return [];
  }
  return choices.map((choice, index) => createChoice(choice, index));
};

const createStep = (overrides = {}, index = 0) => {
  const base = {
    id: uid('branch-step'),
    title: `Decision ${index + 1}`,
    prompt: 'Set the scene and present the situation.',
    choices: normaliseChoices([
      { label: 'Take action', outcome: 'Explain the result of this decision.' },
      { label: 'Choose another path', outcome: 'Outline the alternative outcome.' }
    ])
  };
  const step = { ...base, ...overrides };
  if (!step.id) {
    step.id = uid('branch-step');
  }
  if (typeof step.title !== 'string') {
    step.title = '';
  }
  if (typeof step.prompt !== 'string') {
    step.prompt = '';
  }
  step.choices = normaliseChoices(step.choices);
  if (!step.choices.length) {
    step.choices = normaliseChoices([
      { label: 'Explore option', outcome: 'Summarise the consequence for learners.' }
    ]);
  }
  return step;
};

const pruneChoiceDestinations = (steps) => {
  const validIds = new Set(steps.map((step) => step.id));
  steps.forEach((step) => {
    step.choices.forEach((choice) => {
      if (choice.nextStepId && !validIds.has(choice.nextStepId)) {
        choice.nextStepId = '';
      }
    });
  });
  return steps;
};

const normaliseSteps = (steps) => {
  if (!Array.isArray(steps)) {
    return [];
  }
  const normalised = steps.map((step, index) => createStep(step, index));
  return pruneChoiceDestinations(normalised);
};

const createSampleSteps = () => {
  const steps = normaliseSteps([
    {
      title: 'Decide how to respond',
      prompt: 'A learner submits a project a day late. How do you respond?',
      choices: normaliseChoices([
        {
          label: 'Acknowledge the delay and offer support',
          outcome: 'The learner appreciates the empathy and shares the circumstances that caused the delay.'
        },
        {
          label: 'Apply the late penalty immediately',
          outcome: 'The learner accepts the consequence but may hesitate to ask for help in the future.'
        }
      ])
    },
    {
      title: 'Plan the next check-in',
      prompt: 'After your initial response, how do you keep the learner on track?',
      choices: normaliseChoices([
        {
          label: 'Schedule a follow-up call',
          outcome: 'You identify blockers early and co-create a plan for the next milestone.'
        },
        {
          label: 'Send resources via email',
          outcome: 'The learner reviews the guidance independently and submits on time next week.'
        }
      ])
    }
  ]);
  if (steps[1]) {
    steps[0].choices.forEach((choice) => {
      choice.nextStepId = steps[1].id;
    });
  }
  return steps;
};

const template = () => ({
  introTitle: 'Guide learners through a realistic scenario',
  introBody: 'Describe the context, role, or challenge that sets up this branching experience.',
  steps: createSampleSteps()
});

const example = () => ({
  introTitle: 'Supportive coaching conversation',
  introBody:
    'You are an instructional coach meeting with a new teacher whose class has struggled with engagement this week.',
  steps: (() => {
    const steps = normaliseSteps([
      {
        title: 'Opening the conversation',
        prompt: 'How do you begin the coaching session?',
        choices: normaliseChoices([
          {
          label: 'Start with appreciative feedback',
          outcome: 'The teacher relaxes and shares a recent success, opening the door to collaborative problem solving.'
        },
        {
          label: 'Dive straight into the engagement data',
          outcome: 'The teacher becomes defensive, limiting the depth of reflection during the session.'
        }
      ])
    },
    {
      title: 'Choosing next steps',
      prompt: 'After exploring root causes, you offer two possible support strategies.',
      choices: normaliseChoices([
        {
          label: 'Co-plan an upcoming lesson',
          outcome: 'Together you outline an interactive activity. The teacher feels prepared and tries it the next day.'
        },
        {
          label: 'Share a bank of engagement resources',
          outcome: 'The teacher browses independently but still feels unsure which strategy fits their class.'
        }
      ])
    },
    {
      title: 'Closing the loop',
      prompt: 'How will you follow up after the lesson?',
        choices: normaliseChoices([
          {
            label: 'Set a quick feedback check-in',
            outcome: 'You celebrate wins and tweak the approach together, reinforcing a trusting partnership.'
          },
          {
            label: 'Ask for a written reflection only',
            outcome: 'The teacher submits a brief summary, but opportunities for deeper coaching are missed.'
          }
        ])
      }
    ]);
    if (steps[1]) {
      steps[0].choices.forEach((choice) => {
        choice.nextStepId = steps[1].id;
      });
    }
    if (steps[2]) {
      steps[1].choices.forEach((choice) => {
        choice.nextStepId = steps[2].id;
      });
    }
    return steps;
  })()
});

const ensureWorkingState = (data) => {
  const safe = data ? clone(data) : {};
  return {
    introTitle: typeof safe.introTitle === 'string' ? safe.introTitle : '',
    introBody: typeof safe.introBody === 'string' ? safe.introBody : '',
    steps: normaliseSteps(safe.steps)
  };
};

const buildEditor = (container, data, onUpdate) => {
  const working = ensureWorkingState(data);

  const emit = (refresh = true) => {
    pruneChoiceDestinations(working.steps);
    onUpdate(clone(working));
    if (refresh) {
      rerender();
    }
  };

  const rerender = () => {
    container.innerHTML = '';

    const introBlock = document.createElement('div');
    introBlock.className = 'editor-block';

    const titleField = document.createElement('label');
    titleField.className = 'field';
    titleField.innerHTML = '<span class="field-label">Intro heading</span>';
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = working.introTitle;
    titleInput.placeholder = 'Introduce the branching scenario';
    titleInput.addEventListener('input', () => {
      working.introTitle = titleInput.value;
      emit(false);
    });
    titleField.append(titleInput);

    const introField = document.createElement('label');
    introField.className = 'field';
    introField.innerHTML = '<span class="field-label">Intro description</span>';
    const introInput = document.createElement('textarea');
    introInput.rows = 3;
    introInput.value = working.introBody;
    introInput.placeholder = 'Set the scene and provide relevant context for learners.';
    introInput.addEventListener('input', () => {
      working.introBody = introInput.value;
      emit(false);
    });
    introField.append(introInput);

    introBlock.append(titleField, introField);
    container.append(introBlock);

    if (!working.steps.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<p>No decision points yet. Add one to start branching!</p>';
      container.append(empty);
    }

    working.steps.forEach((step, index) => {
      const item = document.createElement('div');
      item.className = 'editor-item';

      const header = document.createElement('div');
      header.className = 'editor-item-header';
      header.innerHTML = `<span>Decision ${index + 1}</span>`;

      const actions = document.createElement('div');
      actions.className = 'editor-item-actions';

      const duplicateBtn = document.createElement('button');
      duplicateBtn.type = 'button';
      duplicateBtn.className = 'muted-button';
      duplicateBtn.textContent = 'Duplicate';
      duplicateBtn.addEventListener('click', () => {
        const cloneSource = clone(step);
        working.steps.splice(index + 1, 0, createStep({ ...cloneSource, id: uid('branch-step') }, index + 1));
        emit();
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'muted-button';
      deleteBtn.textContent = 'Delete';
      deleteBtn.disabled = working.steps.length <= 1;
      deleteBtn.addEventListener('click', () => {
        if (working.steps.length <= 1) {
          return;
        }
        working.steps.splice(index, 1);
        emit();
      });

      actions.append(duplicateBtn, deleteBtn);
      header.append(actions);
      item.append(header);

      const titleLabel = document.createElement('label');
      titleLabel.className = 'field';
      titleLabel.innerHTML = '<span class="field-label">Decision title</span>';
      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.value = step.title;
      titleInput.placeholder = 'What is this moment called?';
      titleInput.addEventListener('input', () => {
        working.steps[index].title = titleInput.value;
        emit(false);
      });
      titleLabel.append(titleInput);

      const promptLabel = document.createElement('label');
      promptLabel.className = 'field';
      promptLabel.innerHTML = '<span class="field-label">Prompt</span>';
      const promptInput = document.createElement('textarea');
      promptInput.rows = 3;
      promptInput.value = step.prompt;
      promptInput.placeholder = 'Describe the situation and the decision learners must make.';
      promptInput.addEventListener('input', () => {
        working.steps[index].prompt = promptInput.value;
        emit(false);
      });
      promptLabel.append(promptInput);

      item.append(titleLabel, promptLabel);

      const choicesContainer = document.createElement('div');
      choicesContainer.className = 'branching-choices-editor';

      step.choices.forEach((choice, choiceIndex) => {
        const choiceBlock = document.createElement('div');
        choiceBlock.className = 'branching-choice';

        const choiceHeader = document.createElement('div');
        choiceHeader.className = 'branching-choice-header';
        choiceHeader.innerHTML = `<span>Option ${choiceIndex + 1}</span>`;

        const choiceActions = document.createElement('div');
        choiceActions.className = 'branching-choice-actions';

        const removeChoiceBtn = document.createElement('button');
        removeChoiceBtn.type = 'button';
        removeChoiceBtn.className = 'muted-button';
        removeChoiceBtn.textContent = 'Remove';
        removeChoiceBtn.disabled = step.choices.length <= 1;
        removeChoiceBtn.addEventListener('click', () => {
          if (working.steps[index].choices.length <= 1) {
            return;
          }
          working.steps[index].choices.splice(choiceIndex, 1);
          emit();
        });

        choiceActions.append(removeChoiceBtn);
        choiceHeader.append(choiceActions);
        choiceBlock.append(choiceHeader);

        const labelField = document.createElement('label');
        labelField.className = 'field';
        labelField.innerHTML = '<span class="field-label">Learner choice</span>';
        const labelInput = document.createElement('input');
        labelInput.type = 'text';
        labelInput.value = choice.label;
        labelInput.placeholder = 'How is this option phrased to learners?';
        labelInput.addEventListener('input', () => {
          working.steps[index].choices[choiceIndex].label = labelInput.value;
          emit(false);
        });
        labelField.append(labelInput);

        const outcomeField = document.createElement('label');
        outcomeField.className = 'field';
        outcomeField.innerHTML = '<span class="field-label">Outcome</span>';
        const outcomeInput = document.createElement('textarea');
        outcomeInput.rows = 2;
        outcomeInput.value = choice.outcome;
        outcomeInput.placeholder = 'Explain what happens after making this choice.';
        outcomeInput.addEventListener('input', () => {
          working.steps[index].choices[choiceIndex].outcome = outcomeInput.value;
          emit(false);
        });
        outcomeField.append(outcomeInput);

        const nextField = document.createElement('label');
        nextField.className = 'field';
        nextField.innerHTML = '<span class="field-label">Next decision</span>';

        const nextSelect = document.createElement('select');
        nextSelect.className = 'select-input';

        const endOption = document.createElement('option');
        endOption.value = '';
        endOption.textContent = 'Ends scenario';
        nextSelect.append(endOption);

        working.steps.forEach((stepOption, stepIndex) => {
          const option = document.createElement('option');
          option.value = stepOption.id;
          option.textContent = `Decision ${stepIndex + 1}${
            stepOption.title ? `: ${stepOption.title}` : ''
          }`;
          if (stepOption.id === choice.nextStepId) {
            option.selected = true;
          }
          if (stepOption.id === step.id) {
            option.textContent += ' (current)';
            option.disabled = true;
          }
          nextSelect.append(option);
        });

        nextSelect.addEventListener('change', () => {
          working.steps[index].choices[choiceIndex].nextStepId = nextSelect.value;
          emit(false);
        });

        nextField.append(nextSelect);

        choiceBlock.append(labelField, outcomeField, nextField);
        choicesContainer.append(choiceBlock);
      });

      const addChoiceBtn = document.createElement('button');
      addChoiceBtn.type = 'button';
      addChoiceBtn.className = 'ghost-button';
      addChoiceBtn.textContent = 'Add option';
      addChoiceBtn.addEventListener('click', () => {
        working.steps[index].choices.push(createChoice({}, step.choices.length));
        emit();
      });

      choicesContainer.append(addChoiceBtn);
      item.append(choicesContainer);

      container.append(item);
    });

    const addStepBtn = document.createElement('button');
    addStepBtn.type = 'button';
    addStepBtn.className = 'ghost-button';
    addStepBtn.textContent = 'Add decision point';
    addStepBtn.addEventListener('click', () => {
      working.steps.push(createStep({}, working.steps.length));
      emit();
    });
    container.append(addStepBtn);
  };

  rerender();
};

const renderPreview = (container, data) => {
  container.innerHTML = '';
  const working = ensureWorkingState(data);

  if (!working.steps.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<p>Add decision points to preview the branching journey.</p>';
    container.append(empty);
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'branching-preview';

  if (working.introTitle || working.introBody) {
    const intro = document.createElement('div');
    intro.className = 'branching-intro';

    if (working.introTitle) {
      const introHeading = document.createElement('h3');
      introHeading.textContent = working.introTitle;
      intro.append(introHeading);
    }

    if (working.introBody) {
      const introBody = document.createElement('p');
      introBody.textContent = working.introBody;
      intro.append(introBody);
    }

    wrapper.append(intro);
  }

  const list = document.createElement('ol');
  list.className = 'branching-steps';

  working.steps.forEach((step, index) => {
    const listItem = document.createElement('li');
    listItem.className = 'branching-step';

    const header = document.createElement('div');
    header.className = 'branching-step-header';

    const badge = document.createElement('span');
    badge.className = 'branching-step-number';
    badge.textContent = String(index + 1);

    const headingGroup = document.createElement('div');
    headingGroup.className = 'branching-step-heading';

    if (step.title) {
      const title = document.createElement('h4');
      title.textContent = step.title;
      headingGroup.append(title);
    }

    if (step.prompt) {
      const prompt = document.createElement('p');
      prompt.textContent = step.prompt;
      headingGroup.append(prompt);
    }

    header.append(badge, headingGroup);
    listItem.append(header);

    const optionsList = document.createElement('div');
    optionsList.className = 'branching-options';

    step.choices.forEach((choice) => {
      const detail = document.createElement('details');
      detail.className = 'branching-option';

      const summary = document.createElement('summary');
      summary.textContent = choice.label || 'Learner choice';
      detail.append(summary);

      if (choice.outcome) {
        const body = document.createElement('div');
        body.className = 'branching-outcome';
        const paragraph = document.createElement('p');
        paragraph.textContent = choice.outcome;
        body.append(paragraph);
        detail.append(body);
      }

      const destination = document.createElement('p');
      destination.className = 'branching-next-step';
      const targetIndex = working.steps.findIndex((item) => item.id === choice.nextStepId);
      if (targetIndex >= 0) {
        const target = working.steps[targetIndex];
        const titleSuffix = target.title ? `: ${target.title}` : '';
        destination.textContent = `Leads to Decision ${targetIndex + 1}${titleSuffix}`;
      } else {
        destination.textContent = 'Ends the scenario';
      }
      detail.append(destination);

      optionsList.append(detail);
    });

    listItem.append(optionsList);
    list.append(listItem);
  });

  wrapper.append(list);
  container.append(wrapper);
};

const embedTemplate = (data, containerId) => {
  const working = ensureWorkingState(data);
  const steps = working.steps;
  const decisionMap = new Map(steps.map((step, index) => [step.id, { index, title: step.title }]));

  const html = steps.length
    ? `
    <div class="cd-branching">
      ${working.introTitle || working.introBody ? `
      <div class="cd-branching-intro">
        ${working.introTitle ? `<h2>${escapeHtml(working.introTitle)}</h2>` : ''}
        ${working.introBody ? `<p>${escapeHtml(working.introBody)}</p>` : ''}
      </div>` : ''}
      <ol class="cd-branching-steps">
        ${steps
          .map(
            (step, index) => `
          <li class="cd-branching-step">
            <div class="cd-branching-step-header">
              <span class="cd-branching-step-number">${index + 1}</span>
              <div class="cd-branching-step-heading">
                ${step.title ? `<h3>${escapeHtml(step.title)}</h3>` : ''}
                ${step.prompt ? `<p>${escapeHtml(step.prompt)}</p>` : ''}
              </div>
            </div>
            <div class="cd-branching-options">
              ${step.choices
                .map((choice, choiceIndex) => {
                  const target = decisionMap.get(choice.nextStepId);
                  const leads = target
                    ? `Next: Decision ${target.index + 1}${
                        target.title ? `: ${escapeHtml(target.title)}` : ''
                      }`
                    : 'Next: Scenario ends';
                  return `
                <details class="cd-branching-option"${choiceIndex === 0 ? ' open' : ''}>
                  <summary>${escapeHtml(choice.label || 'Learner choice')}</summary>
                  ${choice.outcome ? `<div class="cd-branching-outcome"><p>${escapeHtml(choice.outcome)}</p></div>` : ''}
                  <p class="cd-branching-next">${leads}</p>
                </details>`;
                })
                .join('')}
            </div>
          </li>`
          )
          .join('')}
      </ol>
    </div>`
    : '<div class="cd-branching-empty">No scenario content yet.</div>';

  const css = `
    #${containerId} .cd-branching {
      display: grid;
      gap: 1.5rem;
      background: rgba(15, 23, 42, 0.02);
      padding: 1.5rem;
      border-radius: 18px;
      border: 1px solid rgba(15, 23, 42, 0.08);
    }
    #${containerId} .cd-branching-intro h2 {
      margin: 0 0 0.35rem;
      font-size: 1.3rem;
      color: #1e293b;
    }
    #${containerId} .cd-branching-intro p {
      margin: 0;
      color: rgba(15, 23, 42, 0.72);
    }
    #${containerId} .cd-branching-steps {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 1rem;
      counter-reset: branching-step;
    }
    #${containerId} .cd-branching-step {
      background: white;
      border-radius: 16px;
      padding: 1.1rem 1.2rem;
      border: 1px solid rgba(15, 23, 42, 0.06);
      box-shadow: 0 14px 32px rgba(15, 23, 42, 0.06);
    }
    #${containerId} .cd-branching-step-header {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.85rem;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }
    #${containerId} .cd-branching-step-number {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 999px;
      background: rgba(99, 102, 241, 0.14);
      color: #4338ca;
      display: grid;
      place-items: center;
      font-weight: 600;
      font-size: 1rem;
    }
    #${containerId} .cd-branching-step-heading h3 {
      margin: 0 0 0.25rem;
      font-size: 1.1rem;
      color: #111827;
    }
    #${containerId} .cd-branching-step-heading p {
      margin: 0;
      color: rgba(15, 23, 42, 0.68);
      font-size: 0.95rem;
    }
    #${containerId} .cd-branching-options {
      display: grid;
      gap: 0.65rem;
    }
    #${containerId} .cd-branching-option {
      border-radius: 12px;
      border: 1px solid rgba(99, 102, 241, 0.18);
      background: rgba(99, 102, 241, 0.08);
      overflow: hidden;
    }
    #${containerId} .cd-branching-option summary {
      list-style: none;
      cursor: pointer;
      padding: 0.75rem 1rem;
      font-weight: 600;
      color: #312e81;
      position: relative;
    }
    #${containerId} .cd-branching-option summary::-webkit-details-marker {
      display: none;
    }
    #${containerId} .cd-branching-option summary::after {
      content: '▾';
      position: absolute;
      right: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: rgba(49, 46, 129, 0.72);
      transition: transform 180ms ease;
    }
    #${containerId} .cd-branching-option[open] summary::after {
      transform: translateY(-50%) rotate(180deg);
    }
    #${containerId} .cd-branching-outcome {
      padding: 0 1rem 0.85rem;
      color: rgba(15, 23, 42, 0.78);
      font-size: 0.95rem;
    }
    #${containerId} .cd-branching-outcome p {
      margin: 0;
    }
    #${containerId} .cd-branching-next {
      margin: 0 1rem 0.85rem;
      font-size: 0.9rem;
      color: rgba(79, 70, 229, 0.85);
      font-weight: 600;
    }
    #${containerId} .cd-branching-empty {
      text-align: center;
      padding: 1.5rem;
      color: rgba(15, 23, 42, 0.6);
      background: rgba(15, 23, 42, 0.02);
      border-radius: 12px;
    }
  `;

  const js = `(() => {
    const root = document.getElementById('${containerId}');
    if (!root) return;
    root.querySelectorAll('.cd-branching-options').forEach((group) => {
      const options = Array.from(group.querySelectorAll('.cd-branching-option'));
      options.forEach((option) => {
        option.addEventListener('toggle', () => {
          if (!option.open) return;
          options.forEach((other) => {
            if (other !== option) {
              other.open = false;
            }
          });
        });
      });
    });
  })();`;

  return { html, css, js };
};

const learningTip = {
  intro: 'Branching scenarios let self-paced learners practise complex judgement calls in a safe, feedback-rich sandbox.',
  when: 'Use them for conversations, ethical dilemmas, or procedural decisions where independent learners need to see how reasoning shapes outcomes.',
  considerations: [
    'Open with a brief mission briefing so learners know their role, objective, and how to restart if they want to explore alternate paths.',
    'Sketch the decision tree first and keep it manageable—three to four key decision points sustain focus without live facilitation.',
    'Deliver immediate feedback or reflection prompts after every choice and close with a debrief summary that reinforces takeaways.'
  ],
  examples: [
    'Academic advising simulation: guide students through pre-registration choices before they meet with a live advisor.',
    'Clinical decision lab: select assessments and interventions for a patient whose symptoms evolve over a self-paced rotation.',
    'Research ethics workshop: explore how to respond when a collaborator pressures the team to omit conflicting data, then journal about the implications.'
  ]
};

export const branchingScenarios = {
  id: 'branchingScenarios',
  label: 'Branching scenarios',
  template,
  example,
  buildEditor,
  renderPreview,
  embedTemplate,
  learningTip
};
