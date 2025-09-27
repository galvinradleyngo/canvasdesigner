import { clone, escapeHtml, uid } from '../utils.js';

const sampleBody =
  'Marine ecologists call kelp forests the rainforests of the sea. Dense stands of kelp slow ocean currents, creating calm pockets where fish and invertebrates can thrive. Sea otters act as keystone species, keeping sea urchin populations in check so the forest stays balanced.';

const exampleBody =
  'When Apollo 11 touched down on the Moon in July 1969, millions watched in real time. The broadcast let students follow each milestone, from the descent engine burn to Neil Armstrong\'s first steps. Mission control teams rehearsed every scenario so the crew could respond with calm precision.';

const clamp = (value, min, max) => {
  const number = Number.isFinite(value) ? Math.floor(value) : min;
  if (number < min) return min;
  if (number > max) return max;
  return number;
};

const clampRange = (range, length) => {
  const rawStart = range && typeof range === 'object' ? range.start : 0;
  const rawEnd = range && typeof range === 'object' ? range.end : rawStart;
  let start = clamp(rawStart, 0, length);
  let end = clamp(rawEnd, 0, length);
  if (end < start) {
    [start, end] = [end, start];
  }
  return { start, end };
};

const ensureQuizOptions = (options) => {
  const safe = Array.isArray(options)
    ? options.map((option, index) => ({
        id:
          typeof option?.id === 'string' && option.id.trim()
            ? option.id.trim()
            : uid('immersive-option'),
        text: typeof option?.text === 'string' ? option.text : '',
        correct: Boolean(option?.correct)
      }))
    : [];

  while (safe.length < 2) {
    safe.push({ id: uid('immersive-option'), text: '', correct: safe.length === 0 });
  }

  if (!safe.some((option) => option.correct)) {
    safe[0].correct = true;
  }

  return safe;
};

const ensureWorkingAnnotation = (annotation, length) => {
  const base = annotation && typeof annotation === 'object' ? clone(annotation) : {};
  const id = typeof base.id === 'string' && base.id.trim() ? base.id.trim() : uid('immersive');
  const kind = base.kind === 'quiz' ? 'quiz' : 'comment';
  const label = typeof base.label === 'string' ? base.label.slice(0, 24) : '';
  const range = clampRange(base.range || {}, length);
  const comment = kind === 'comment' && typeof base.comment === 'string' ? base.comment : '';
  const question = kind === 'quiz' && typeof base.question === 'string' ? base.question : '';
  const options = kind === 'quiz' ? ensureQuizOptions(base.options) : [];

  return {
    id,
    kind,
    label,
    range,
    comment,
    question,
    options
  };
};

const ensureWorkingState = (data) => {
  const safe = data && typeof data === 'object' ? clone(data) : {};
  const body = typeof safe.body === 'string' ? safe.body : sampleBody;
  const length = body.length;
  const annotations = Array.isArray(safe.annotations)
    ? safe.annotations.map((annotation) => ensureWorkingAnnotation(annotation, length))
    : [];
  return { body, annotations };
};

const findRange = (text, snippet) => {
  const index = text.indexOf(snippet);
  if (index === -1) {
    return { start: 0, end: Math.min(text.length, snippet.length) };
  }
  return { start: index, end: index + snippet.length };
};

const createCommentAnnotation = (body, snippet, comment, overrides = {}) => ({
  id: uid('immersive'),
  kind: 'comment',
  range: findRange(body, snippet),
  comment,
  ...overrides
});

const createQuizAnnotation = (body, snippet, question, options, overrides = {}) => ({
  id: uid('immersive'),
  kind: 'quiz',
  range: findRange(body, snippet),
  question,
  options,
  ...overrides
});

const template = () =>
  ensureWorkingState({
    body: sampleBody,
    annotations: [
      createCommentAnnotation(
        sampleBody,
        'rainforests of the sea',
        'Invite learners to unpack this metaphor. What parallels can they find between kelp forests and rainforests?'
      ),
      createCommentAnnotation(
        sampleBody,
        'Dense stands of kelp slow ocean currents',
        'Highlight this cause-and-effect relationship to support systems thinking discussions.'
      ),
      createQuizAnnotation(sampleBody, 'Sea otters act as keystone species', 'Which animal helps keep the kelp forest in balance?', [
        { id: uid('immersive-option'), text: 'Sea otters', correct: true },
        { id: uid('immersive-option'), text: 'Sea urchins', correct: false },
        { id: uid('immersive-option'), text: 'Gray whales', correct: false }
      ])
    ]
  });

const example = () =>
  ensureWorkingState({
    body: exampleBody,
    annotations: [
      createCommentAnnotation(
        exampleBody,
        'The broadcast let students follow each milestone',
        'Pair this sentence with archival footage and have students annotate each milestone in a shared timeline.'
      ),
      createQuizAnnotation(
        exampleBody,
        'Mission control teams rehearsed every scenario',
        'Why did mission control spend months rehearsing scenarios before launch?',
        [
          { id: uid('immersive-option'), text: 'To prepare for unexpected issues', correct: true },
          { id: uid('immersive-option'), text: 'To shorten the mission timeline', correct: false },
          { id: uid('immersive-option'), text: 'To test new television cameras', correct: false }
        ]
      ),
      createCommentAnnotation(
        exampleBody,
        'Neil Armstrong\'s first steps',
        'Prompt students to journal how Armstrong\'s words connect to your unit\'s essential question.'
      )
    ]
  });

const buildContext = (body, start, end) => {
  const length = body.length;
  const contextStart = clamp(start - 28, 0, length);
  const contextEnd = clamp(end + 28, 0, length);
  const snippet = body.slice(contextStart, contextEnd).trim();
  return snippet;
};

const preparePreviewData = (data) => {
  const working = ensureWorkingState(data);
  const body = working.body || '';
  const length = body.length;

  const annotations = working.annotations
    .map((annotation) => {
      const start = clamp(annotation.range.start, 0, length);
      const end = clamp(annotation.range.end, 0, length);
      const isPin = start === end;
      const snippet = !isPin ? body.slice(start, end) : '';
      const labelRaw = typeof annotation.label === 'string' ? annotation.label.trim() : '';
      const label = labelRaw.slice(0, 10);
      const comment = annotation.kind === 'comment' ? annotation.comment || '' : '';
      const question = annotation.kind === 'quiz' ? annotation.question || '' : '';
      const options = annotation.kind === 'quiz'
        ? annotation.options
            .map((option) => ({
              id: option.id,
              text: typeof option.text === 'string' ? option.text.trim() : '',
              correct: Boolean(option.correct)
            }))
            .filter((option) => option.text.length > 0)
        : [];
      const context = isPin ? buildContext(body, start, end || start + 1) : snippet;

      return {
        id: annotation.id,
        kind: annotation.kind,
        label,
        rangeStart: start,
        rangeEnd: end,
        isPin,
        snippet,
        context,
        comment,
        question,
        options
      };
    })
    .filter((annotation) => annotation.isPin || annotation.snippet.length > 0);

  annotations.sort((a, b) => {
    if (a.rangeStart !== b.rangeStart) {
      return a.rangeStart - b.rangeStart;
    }
    return a.rangeEnd - b.rangeEnd;
  });

  annotations.forEach((annotation, index) => {
    if (!annotation.label) {
      annotation.label = String(index + 1);
    }
    annotation.displayIndex = index + 1;
  });

  return { body, annotations };
};

const createMarker = (annotation) => {
  const marker = document.createElement('button');
  marker.type = 'button';
  marker.className = 'cd-immersive-marker';
  marker.dataset.annotationId = annotation.id;
  marker.dataset.kind = annotation.kind;
  marker.classList.add(
    annotation.kind === 'quiz' ? 'cd-immersive-marker--quiz' : 'cd-immersive-marker--comment'
  );

  if (annotation.isPin) {
    marker.classList.add('cd-immersive-marker--pin');
    const badge = document.createElement('span');
    badge.className = 'cd-immersive-marker-badge';
    badge.textContent = annotation.label;
    marker.append(badge);
    marker.setAttribute(
      'aria-label',
      annotation.kind === 'quiz'
        ? `Quick quiz ${annotation.label}`
        : `Pinned note ${annotation.label}`
    );
  } else {
    const text = document.createElement('span');
    text.className = 'cd-immersive-marker-text';
    text.textContent = annotation.snippet;
    const badge = document.createElement('span');
    badge.className = 'cd-immersive-marker-badge';
    badge.textContent = annotation.label;
    marker.append(text, badge);
    marker.setAttribute(
      'aria-label',
      annotation.kind === 'quiz'
        ? `Highlight ${annotation.label} — quick quiz`
        : `Highlight ${annotation.label} — note`
    );
  }

  return marker;
};

const buildAnnotatedFragment = (body, annotations) => {
  const fragment = document.createDocumentFragment();
  let cursor = 0;

  annotations.forEach((annotation) => {
    if (annotation.rangeStart > cursor) {
      fragment.append(document.createTextNode(body.slice(cursor, annotation.rangeStart)));
    }
    fragment.append(createMarker(annotation));
    cursor = annotation.rangeEnd;
  });

  if (cursor < body.length) {
    fragment.append(document.createTextNode(body.slice(cursor)));
  }

  return fragment;
};

const getSelectionRange = (element) => {
  if (!element) {
    return { start: 0, end: 0 };
  }
  const start = Number.isFinite(element.selectionStart) ? element.selectionStart : 0;
  const end = Number.isFinite(element.selectionEnd) ? element.selectionEnd : start;
  return {
    start: start < end ? start : end,
    end: end > start ? end : start
  };
};

const describeAnnotation = (annotation, body) => {
  if (annotation.range.start === annotation.range.end) {
    const context = buildContext(body, annotation.range.start, annotation.range.end || annotation.range.start + 1);
    return context ? `Pin near “${context}”` : 'Pin marker';
  }
  const snippet = body.slice(annotation.range.start, annotation.range.end);
  const trimmed = snippet.trim();
  if (trimmed.length > 80) {
    return `“${trimmed.slice(0, 77)}…”`;
  }
  return `“${trimmed || snippet}”`;
};

const buildEditor = (container, data, onUpdate) => {
  const working = ensureWorkingState(data);
  let lastSelection = { start: 0, end: 0 };

  const emit = (refresh = true) => {
    onUpdate(clone(working));
    if (refresh) {
      rerender();
    }
  };

  const addAnnotation = (range, kind = 'comment') => {
    const clamped = clampRange(range, working.body.length);
    working.annotations.push({
      id: uid('immersive'),
      kind,
      label: '',
      range: clamped,
      comment: '',
      question: '',
      options: kind === 'quiz' ? ensureQuizOptions([]) : []
    });
    emit();
  };

  const rerender = () => {
    container.innerHTML = '';

    const textLabel = document.createElement('label');
    textLabel.className = 'field';
    textLabel.innerHTML = '<span class="field-label">Immersive text body</span>';

    const textArea = document.createElement('textarea');
    textArea.rows = 8;
    textArea.value = working.body;
    textArea.addEventListener('input', () => {
      working.body = textArea.value;
      const length = working.body.length;
      working.annotations.forEach((annotation) => {
        const range = clampRange(annotation.range, length);
        annotation.range.start = range.start;
        annotation.range.end = range.end;
      });
      emit(false);
    });

    const updateSelectionState = () => {
      lastSelection = clampRange(getSelectionRange(textArea), working.body.length);
      const length = lastSelection.end - lastSelection.start;
      highlightButton.disabled = length <= 0;
      quizHighlightButton.disabled = length <= 0;
    };

    textArea.addEventListener('select', updateSelectionState);
    textArea.addEventListener('keyup', updateSelectionState);
    textArea.addEventListener('mouseup', updateSelectionState);

    textLabel.append(textArea);

    const helper = document.createElement('p');
    helper.className = 'hint';
    helper.textContent =
      'Select text to add a highlight or place your cursor to drop a pin. Each marker can display a note or a quick quiz.';

    const actions = document.createElement('div');
    actions.className = 'immersive-editor-actions';

    const highlightButton = document.createElement('button');
    highlightButton.type = 'button';
    highlightButton.className = 'ghost-button';
    highlightButton.textContent = 'Add highlighted note';
    highlightButton.addEventListener('click', () => {
      const selection = clampRange(getSelectionRange(textArea), working.body.length);
      if (selection.end <= selection.start) return;
      addAnnotation(selection, 'comment');
    });

    const quizHighlightButton = document.createElement('button');
    quizHighlightButton.type = 'button';
    quizHighlightButton.className = 'ghost-button';
    quizHighlightButton.textContent = 'Add highlighted quick quiz';
    quizHighlightButton.addEventListener('click', () => {
      const selection = clampRange(getSelectionRange(textArea), working.body.length);
      if (selection.end <= selection.start) return;
      addAnnotation(selection, 'quiz');
    });

    const pinButton = document.createElement('button');
    pinButton.type = 'button';
    pinButton.className = 'ghost-button';
    pinButton.textContent = 'Drop a pin note';
    pinButton.addEventListener('click', () => {
      const selection = clampRange(getSelectionRange(textArea), working.body.length);
      addAnnotation({ start: selection.start, end: selection.start }, 'comment');
    });

    actions.append(highlightButton, quizHighlightButton, pinButton);

    const annotationContainer = document.createElement('div');
    annotationContainer.className = 'immersive-annotation-list';

    if (working.annotations.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'hint';
      empty.textContent = 'No markers yet. Use the buttons above to add notes or quick checks.';
      annotationContainer.append(empty);
    } else {
      working.annotations.forEach((annotation, index) => {
        const item = document.createElement('div');
        item.className = 'editor-item immersive-annotation-item';

        const header = document.createElement('div');
        header.className = 'editor-item-header';
        const title = document.createElement('span');
        title.textContent = annotation.kind === 'quiz' ? `Quick quiz ${index + 1}` : `Note ${index + 1}`;
        const actionsWrap = document.createElement('div');
        actionsWrap.className = 'editor-item-actions';

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'ghost-button danger';
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', () => {
          working.annotations.splice(index, 1);
          emit();
        });

        actionsWrap.append(removeButton);
        header.append(title, actionsWrap);

        const summary = document.createElement('p');
        summary.className = 'immersive-annotation-summary';
        summary.textContent = describeAnnotation(annotation, working.body);

        const rangeInfo = document.createElement('p');
        rangeInfo.className = 'immersive-annotation-range';
        if (annotation.range.start === annotation.range.end) {
          rangeInfo.textContent = `Pin at character ${annotation.range.start + 1}`;
        } else {
          rangeInfo.textContent = `Characters ${annotation.range.start + 1}–${annotation.range.end}`;
        }

        const labelField = document.createElement('label');
        labelField.className = 'field field--inline';
        labelField.innerHTML = '<span class="field-label">Marker label (optional)</span>';
        const labelInput = document.createElement('input');
        labelInput.type = 'text';
        labelInput.className = 'text-input';
        labelInput.value = annotation.label || '';
        labelInput.placeholder = 'e.g. A or 1';
        labelInput.addEventListener('input', () => {
          annotation.label = labelInput.value.slice(0, 10);
          emit(false);
        });
        labelField.append(labelInput);

        const typeField = document.createElement('label');
        typeField.className = 'field field--inline';
        typeField.innerHTML = '<span class="field-label">Marker type</span>';
        const typeSelect = document.createElement('select');
        typeSelect.className = 'select-input';
        typeSelect.innerHTML = `
          <option value="comment">Comment note</option>
          <option value="quiz">Quick quiz</option>
        `;
        typeSelect.value = annotation.kind;
        typeSelect.addEventListener('change', () => {
          annotation.kind = typeSelect.value === 'quiz' ? 'quiz' : 'comment';
          if (annotation.kind === 'quiz') {
            annotation.options = ensureQuizOptions(annotation.options);
          } else {
            annotation.options = [];
          }
          emit();
        });
        typeField.append(typeSelect);

        const setRangeButton = document.createElement('button');
        setRangeButton.type = 'button';
        setRangeButton.className = 'ghost-button';
        setRangeButton.textContent = 'Use current text selection';
        setRangeButton.addEventListener('click', () => {
          const selection = clampRange(getSelectionRange(textArea), working.body.length);
          annotation.range.start = selection.start;
          annotation.range.end = selection.end;
          emit();
        });

        item.append(header, summary, rangeInfo, labelField, typeField, setRangeButton);

        if (annotation.kind === 'comment') {
          const commentField = document.createElement('label');
          commentField.className = 'field';
          commentField.innerHTML = '<span class="field-label">Comment</span>';
          const commentInput = document.createElement('textarea');
          commentInput.rows = 3;
          commentInput.value = annotation.comment || '';
          commentInput.addEventListener('input', () => {
            annotation.comment = commentInput.value;
            emit(false);
          });
          commentField.append(commentInput);
          item.append(commentField);
        } else {
          const questionField = document.createElement('label');
          questionField.className = 'field';
          questionField.innerHTML = '<span class="field-label">Quiz question</span>';
          const questionInput = document.createElement('textarea');
          questionInput.rows = 2;
          questionInput.value = annotation.question || '';
          questionInput.addEventListener('input', () => {
            annotation.question = questionInput.value;
            emit(false);
          });
          questionField.append(questionInput);
          item.append(questionField);

          const optionsList = document.createElement('div');
          optionsList.className = 'immersive-quiz-options-editor';

          annotation.options.forEach((option, optionIndex) => {
            const optionRow = document.createElement('div');
            optionRow.className = 'immersive-quiz-option-row';

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `quiz-correct-${annotation.id}`;
            radio.checked = Boolean(option.correct);
            radio.addEventListener('change', () => {
              annotation.options.forEach((itemOption) => {
                itemOption.correct = itemOption.id === option.id;
              });
              emit(false);
            });

            const optionInput = document.createElement('input');
            optionInput.type = 'text';
            optionInput.className = 'text-input';
            optionInput.value = option.text || '';
            optionInput.placeholder = `Choice ${optionIndex + 1}`;
            optionInput.addEventListener('input', () => {
              option.text = optionInput.value;
              emit(false);
            });

            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'ghost-button';
            remove.textContent = 'Remove';
            remove.disabled = annotation.options.length <= 2;
            remove.addEventListener('click', () => {
              if (annotation.options.length <= 2) return;
              annotation.options.splice(optionIndex, 1);
              if (!annotation.options.some((itemOption) => itemOption.correct)) {
                annotation.options[0].correct = true;
              }
              emit();
            });

            optionRow.append(radio, optionInput, remove);
            optionsList.append(optionRow);
          });

          const addChoice = document.createElement('button');
          addChoice.type = 'button';
          addChoice.className = 'ghost-button';
          addChoice.textContent = 'Add choice';
          addChoice.addEventListener('click', () => {
            annotation.options.push({ id: uid('immersive-option'), text: '', correct: false });
            emit();
          });

          item.append(optionsList, addChoice);
        }

        annotationContainer.append(item);
      });
    }

    container.append(textLabel, helper, actions, annotationContainer);
    updateSelectionState();
    if (textArea.selectionStart !== lastSelection.start || textArea.selectionEnd !== lastSelection.end) {
      const length = textArea.value.length;
      const start = clamp(lastSelection.start, 0, length);
      const end = clamp(lastSelection.end, 0, length);
      try {
        textArea.setSelectionRange(start, end);
      } catch (error) {
        /* ignore */
      }
    }
  };

  rerender();
};

const renderPreview = (container, data, { playAnimations = true } = {}) => {
  if (!container) return;
  const { body, annotations } = preparePreviewData(data);
  container.innerHTML = '';

  if (!body.trim()) {
    const empty = document.createElement('div');
    empty.className = 'cd-immersive-empty';
    empty.textContent = 'Add your text to start building immersive highlights.';
    container.append(empty);
    return;
  }

  const root = document.createElement('div');
  root.className = 'cd-immersive';
  if (playAnimations) {
    root.classList.add('cd-immersive-animate');
  }

  const bodyColumn = document.createElement('div');
  bodyColumn.className = 'cd-immersive-body';
  const bodyContent = document.createElement('div');
  bodyContent.className = 'cd-immersive-body-content';
  bodyContent.append(buildAnnotatedFragment(body, annotations));
  bodyColumn.append(bodyContent);

  const panel = document.createElement('aside');
  panel.className = 'cd-immersive-panel';

  root.append(bodyColumn, panel);
  container.append(root);

  if (annotations.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'cd-immersive-empty';
    empty.textContent = 'Pins and highlights will appear here once you add them in the editor.';
    panel.append(empty);
    return;
  }

  const quizState = new Map();
  let activeId = null;

  const updateMarkerState = () => {
    bodyContent.querySelectorAll('.cd-immersive-marker').forEach((marker) => {
      marker.classList.toggle('is-active', marker.dataset.annotationId === activeId);
    });
  };

  const renderCommentDetail = (annotation) => {
    const detail = document.createElement('div');
    detail.className = 'cd-immersive-detail';
    const title = document.createElement('h3');
    title.className = 'cd-immersive-detail-title';
    title.textContent = annotation.label ? `Note ${annotation.label}` : `Note ${annotation.displayIndex}`;
    detail.append(title);

    const snippet = document.createElement('p');
    snippet.className = 'cd-immersive-snippet';
    snippet.textContent = annotation.isPin ? annotation.context || 'Pinned insight' : annotation.snippet;
    detail.append(snippet);

    const comment = document.createElement('p');
    comment.className = 'cd-immersive-comment';
    if (annotation.comment) {
      comment.textContent = annotation.comment;
    } else {
      comment.classList.add('cd-immersive-comment--empty');
      comment.textContent = 'Add a reflective prompt in the editor to show it here.';
    }
    detail.append(comment);

    panel.innerHTML = '';
    panel.append(detail);
  };

  const renderQuizDetail = (annotation) => {
    const detail = document.createElement('div');
    detail.className = 'cd-immersive-detail cd-immersive-detail--quiz';
    const title = document.createElement('h3');
    title.className = 'cd-immersive-detail-title';
    title.textContent = annotation.question || 'Add a quiz question in the editor to prompt a quick check.';
    detail.append(title);

    const snippet = document.createElement('p');
    snippet.className = 'cd-immersive-snippet';
    snippet.textContent = annotation.isPin ? annotation.context || 'Pinned quiz' : annotation.snippet;
    detail.append(snippet);

    if (annotation.options.length < 2) {
      const empty = document.createElement('p');
      empty.className = 'cd-immersive-empty';
      empty.textContent = 'Add at least two answer choices so learners can respond.';
      detail.append(empty);
      panel.innerHTML = '';
      panel.append(detail);
      return;
    }

    const optionsList = document.createElement('div');
    optionsList.className = 'cd-immersive-quiz-options';

    const feedback = document.createElement('p');
    feedback.className = 'cd-immersive-feedback';
    feedback.textContent = 'Choose the best answer.';

    const updateFeedback = () => {
      const state = quizState.get(annotation.id);
      const selectedId = state?.selected || null;
      const isCorrect = Boolean(state?.correct);
      optionsList.querySelectorAll('.cd-immersive-quiz-option').forEach((button) => {
        const optionId = button.dataset.optionId;
        const isSelected = optionId === selectedId;
        button.classList.toggle('is-selected', isSelected);
        if (!selectedId) {
          button.classList.remove('is-correct');
          button.classList.remove('is-incorrect');
          button.setAttribute('aria-pressed', 'false');
          return;
        }
        button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        const option = annotation.options.find((opt) => opt.id === optionId);
        const correct = Boolean(option?.correct);
        button.classList.toggle('is-correct', isSelected && correct);
        button.classList.toggle('is-incorrect', isSelected && !correct);
      });

      if (!selectedId) {
        feedback.textContent = 'Choose the best answer.';
        feedback.dataset.tone = 'neutral';
      } else if (isCorrect) {
        feedback.textContent = 'Correct! Great observation.';
        feedback.dataset.tone = 'positive';
      } else {
        feedback.textContent = 'Not quite. Try another option.';
        feedback.dataset.tone = 'negative';
      }
    };

    annotation.options.forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cd-immersive-quiz-option';
      button.dataset.optionId = option.id;
      button.textContent = option.text;
      button.addEventListener('click', () => {
        quizState.set(annotation.id, { selected: option.id, correct: Boolean(option.correct) });
        updateFeedback();
      });
      optionsList.append(button);
    });

    detail.append(optionsList, feedback);
    panel.innerHTML = '';
    panel.append(detail);
    updateFeedback();
  };

  const renderDetail = () => {
    const annotation = annotations.find((item) => item.id === activeId);
    if (!annotation) {
      panel.innerHTML = '';
      const empty = document.createElement('p');
      empty.className = 'cd-immersive-empty';
      empty.textContent = 'Select a highlight to explore its prompt.';
      panel.append(empty);
      return;
    }
    if (annotation.kind === 'quiz') {
      renderQuizDetail(annotation);
    } else {
      renderCommentDetail(annotation);
    }
  };

  const handleActivate = (id) => {
    activeId = activeId === id ? null : id;
    updateMarkerState();
    renderDetail();
  };

  bodyContent.addEventListener('click', (event) => {
    const marker = event.target.closest('.cd-immersive-marker');
    if (!marker) return;
    handleActivate(marker.dataset.annotationId);
  });

  updateMarkerState();
  renderDetail();
};

const toScriptSafeJson = (value) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\\u2028/g, '\\u2028')
    .replace(/\\u2029/g, '\\u2029');

const embedTemplate = (data, containerId) => {
  const { body, annotations } = preparePreviewData(data);

  if (!body.trim()) {
    return {
      html: '<div class="cd-immersive-empty">This immersive text is waiting for content.</div>',
      css: `#${containerId} .cd-immersive-empty {\n  padding: 1.2rem;\n  border-radius: 14px;\n  background: rgba(99, 102, 241, 0.08);\n  text-align: center;\n  color: #312e81;\n  font-weight: 500;\n}`,
      js: ''
    };
  }

  const annotatedHtml = buildAnnotatedFragmentHtml(body, annotations);
  const scriptData = {
    annotations: annotations.map((annotation) => ({
      id: annotation.id,
      kind: annotation.kind,
      label: annotation.label,
      isPin: annotation.isPin,
      snippet: annotation.snippet,
      context: annotation.context,
      comment: annotation.comment,
      question: annotation.question,
      options: annotation.options
    })),
    initialActiveId: null
  };

  return {
    html: `
      <div class="cd-immersive">
        <div class="cd-immersive-body">
          <div class="cd-immersive-body-content">${annotatedHtml}</div>
        </div>
        <aside class="cd-immersive-panel">
          ${annotations.length ? '<p class="cd-immersive-empty">Select a highlight to explore its prompt.</p>' : ''}
        </aside>
      </div>
    `,
    css: `
      #${containerId} .cd-immersive {
        display: grid;
        gap: 1.5rem;
        grid-template-columns: minmax(0, 1.3fr) minmax(0, 0.9fr);
        align-items: start;
      }
      #${containerId} .cd-immersive-body {
        background: rgba(255, 255, 255, 0.92);
        border-radius: 16px;
        padding: 1.2rem 1.4rem;
        border: 1px solid rgba(99, 102, 241, 0.18);
        box-shadow: 0 24px 40px rgba(15, 23, 42, 0.12);
      }
      #${containerId} .cd-immersive-body-content {
        white-space: pre-wrap;
        line-height: 1.65;
        font-size: 1.05rem;
        color: #0f172a;
      }
      #${containerId} .cd-immersive-marker {
        appearance: none;
        border: none;
        background: rgba(99, 102, 241, 0.18);
        color: inherit;
        border-radius: 999px;
        padding: 0.1rem 0.45rem;
        margin: 0 -0.15rem;
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        cursor: pointer;
        transition: box-shadow 0.2s ease, transform 0.2s ease, background 0.2s ease;
      }
      #${containerId} .cd-immersive-marker:focus-visible {
        outline: 2px solid #6366f1;
        outline-offset: 2px;
      }
      #${containerId} .cd-immersive-marker--quiz {
        background: rgba(14, 165, 233, 0.18);
      }
      #${containerId} .cd-immersive-marker--pin {
        padding: 0.1rem;
      }
      #${containerId} .cd-immersive-marker-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 1.3rem;
        height: 1.3rem;
        padding: 0 0.35rem;
        border-radius: 999px;
        background: rgba(99, 102, 241, 0.28);
        font-weight: 600;
        font-size: 0.75rem;
        color: #312e81;
      }
      #${containerId} .cd-immersive-marker--quiz .cd-immersive-marker-badge {
        background: rgba(14, 165, 233, 0.28);
        color: #0c4a6e;
      }
      #${containerId} .cd-immersive-marker.is-active,
      #${containerId} .cd-immersive-marker:hover {
        box-shadow: 0 10px 22px rgba(99, 102, 241, 0.25);
        transform: translateY(-1px);
      }
      #${containerId} .cd-immersive-panel {
        background: rgba(255, 255, 255, 0.95);
        border-radius: 16px;
        padding: 1.4rem;
        border: 1px solid rgba(15, 23, 42, 0.1);
        box-shadow: 0 24px 36px rgba(15, 23, 42, 0.12);
        min-height: 220px;
      }
      #${containerId} .cd-immersive-detail-title {
        margin: 0 0 0.75rem;
        font-size: 1.1rem;
        font-weight: 600;
      }
      #${containerId} .cd-immersive-snippet {
        margin: 0 0 1rem;
        color: rgba(15, 23, 42, 0.68);
        font-style: italic;
      }
      #${containerId} .cd-immersive-comment {
        margin: 0;
        font-size: 1rem;
        line-height: 1.6;
        white-space: pre-wrap;
      }
      #${containerId} .cd-immersive-comment--empty {
        color: rgba(15, 23, 42, 0.55);
      }
      #${containerId} .cd-immersive-quiz-options {
        display: grid;
        gap: 0.6rem;
      }
      #${containerId} .cd-immersive-quiz-option {
        appearance: none;
        border: 1px solid rgba(15, 23, 42, 0.12);
        border-radius: 12px;
        padding: 0.75rem 1rem;
        text-align: left;
        background: rgba(14, 165, 233, 0.08);
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
      }
      #${containerId} .cd-immersive-quiz-option.is-selected {
        border-color: rgba(14, 165, 233, 0.55);
        box-shadow: 0 12px 24px rgba(14, 165, 233, 0.2);
        transform: translateY(-1px);
      }
      #${containerId} .cd-immersive-quiz-option.is-correct {
        background: rgba(16, 185, 129, 0.14);
        border-color: rgba(16, 185, 129, 0.55);
      }
      #${containerId} .cd-immersive-quiz-option.is-incorrect {
        background: rgba(248, 113, 113, 0.1);
        border-color: rgba(248, 113, 113, 0.45);
      }
      #${containerId} .cd-immersive-feedback {
        margin: 1rem 0 0;
        font-weight: 500;
        color: rgba(15, 23, 42, 0.75);
      }
      #${containerId} .cd-immersive-empty {
        margin: 0;
        color: rgba(15, 23, 42, 0.6);
        font-size: 0.95rem;
      }
      @media (max-width: 720px) {
        #${containerId} .cd-immersive {
          grid-template-columns: minmax(0, 1fr);
        }
      }
    `,
    js: `
      (function(){
        const root = document.getElementById('${containerId}');
        if (!root) return;
        const data = ${toScriptSafeJson(scriptData)};
        const panel = root.querySelector('.cd-immersive-panel');
        const markers = Array.from(root.querySelectorAll('.cd-immersive-marker'));
        if (!panel || !markers.length) {
          return;
        }
        const annotations = new Map(data.annotations.map((item) => [item.id, item]));
        const quizState = new Map();
        let activeId = data.initialActiveId || null;

        const updateMarkers = () => {
          markers.forEach((marker) => {
            marker.classList.toggle('is-active', marker.dataset.annotationId === activeId);
          });
        };

        const setActiveId = (nextId) => {
          if (activeId === nextId) {
            activeId = null;
          } else {
            activeId = nextId;
          }
          updateMarkers();
          renderDetail();
        };

        const renderComment = (annotation) => {
          const detail = document.createElement('div');
          detail.className = 'cd-immersive-detail';
          detail.classList.add('cd-immersive-detail--enter');
          const title = document.createElement('h3');
          title.className = 'cd-immersive-detail-title';
          title.textContent = annotation.label ? 'Note ' + annotation.label : 'Note';
          detail.appendChild(title);
          const snippet = document.createElement('p');
          snippet.className = 'cd-immersive-snippet';
          snippet.textContent = annotation.isPin ? annotation.context || 'Pinned insight' : annotation.snippet;
          detail.appendChild(snippet);
          const comment = document.createElement('p');
          comment.className = 'cd-immersive-comment';
          if (annotation.comment) {
            comment.textContent = annotation.comment;
          } else {
            comment.classList.add('cd-immersive-comment--empty');
            comment.textContent = 'Add a reflective prompt in the editor to show it here.';
          }
          detail.appendChild(comment);
          panel.innerHTML = '';
          panel.classList.add('cd-immersive-panel--active');
          panel.appendChild(detail);
        };

        const renderQuiz = (annotation) => {
          const detail = document.createElement('div');
          detail.className = 'cd-immersive-detail cd-immersive-detail--quiz';
          detail.classList.add('cd-immersive-detail--enter');
          const title = document.createElement('h3');
          title.className = 'cd-immersive-detail-title';
          title.textContent = annotation.question || 'Add a quiz question in the editor to prompt a quick check.';
          detail.appendChild(title);
          const snippet = document.createElement('p');
          snippet.className = 'cd-immersive-snippet';
          snippet.textContent = annotation.isPin ? annotation.context || 'Pinned quiz' : annotation.snippet;
          detail.appendChild(snippet);

          if (!annotation.options || annotation.options.length < 2) {
            const empty = document.createElement('p');
            empty.className = 'cd-immersive-empty cd-immersive-empty--enter';
            empty.textContent = 'Add at least two answer choices so learners can respond.';
            detail.appendChild(empty);
            panel.innerHTML = '';
            panel.classList.add('cd-immersive-panel--active');
            panel.appendChild(detail);
            return;
          }

          const optionsWrap = document.createElement('div');
          optionsWrap.className = 'cd-immersive-quiz-options';
          const feedback = document.createElement('p');
          feedback.className = 'cd-immersive-feedback';
          feedback.textContent = 'Choose the best answer.';

          const updateFeedback = () => {
            const state = quizState.get(annotation.id);
            const selectedId = state && state.selected;
            const isCorrect = Boolean(state && state.correct);
            optionsWrap.querySelectorAll('.cd-immersive-quiz-option').forEach((button) => {
              const optionId = button.dataset.optionId;
              const isSelected = optionId === selectedId;
              button.classList.toggle('is-selected', isSelected);
              if (!selectedId) {
                button.classList.remove('is-correct');
                button.classList.remove('is-incorrect');
                button.setAttribute('aria-pressed', 'false');
                return;
              }
              const option = annotation.options.find((opt) => opt.id === optionId);
              const correct = Boolean(option && option.correct);
              button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
              button.classList.toggle('is-correct', isSelected && correct);
              button.classList.toggle('is-incorrect', isSelected && !correct);
            });
            if (!selectedId) {
              feedback.textContent = 'Choose the best answer.';
              feedback.dataset.tone = 'neutral';
            } else if (isCorrect) {
              feedback.textContent = 'Correct! Great observation.';
              feedback.dataset.tone = 'positive';
            } else {
              feedback.textContent = 'Not quite. Try another option.';
              feedback.dataset.tone = 'negative';
            }
          };

          annotation.options.forEach((option) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'cd-immersive-quiz-option';
            button.dataset.optionId = option.id;
            button.textContent = option.text;
            button.addEventListener('click', () => {
              quizState.set(annotation.id, { selected: option.id, correct: Boolean(option.correct) });
              updateFeedback();
            });
            optionsWrap.appendChild(button);
          });

          detail.appendChild(optionsWrap);
          detail.appendChild(feedback);
          panel.innerHTML = '';
          panel.classList.add('cd-immersive-panel--active');
          panel.appendChild(detail);
          updateFeedback();
        };

        const renderDetail = () => {
          const annotation = activeId ? annotations.get(activeId) : null;
          if (!annotation) {
            panel.innerHTML = '';
            panel.classList.remove('cd-immersive-panel--active');
            const empty = document.createElement('p');
            empty.className = 'cd-immersive-empty cd-immersive-empty--enter';
            empty.textContent = 'Select a highlight to explore its prompt.';
            panel.appendChild(empty);
            return;
          }
          if (annotation.kind === 'quiz') {
            renderQuiz(annotation);
          } else {
            renderComment(annotation);
          }
        };

        markers.forEach((marker) => {
          marker.addEventListener('click', () => {
            setActiveId(marker.dataset.annotationId);
          });
          marker.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setActiveId(marker.dataset.annotationId);
            }
          });
        });

        updateMarkers();
        renderDetail();
      })();
    `
  };
};

const buildAnnotatedFragmentHtml = (body, annotations) => {
  let html = '';
  let cursor = 0;
  annotations.forEach((annotation) => {
    if (annotation.rangeStart > cursor) {
      html += escapeHtml(body.slice(cursor, annotation.rangeStart));
    }
    const baseClass = `cd-immersive-marker ${
      annotation.kind === 'quiz' ? 'cd-immersive-marker--quiz' : 'cd-immersive-marker--comment'
    }${annotation.isPin ? ' cd-immersive-marker--pin' : ''}`;
    if (annotation.isPin) {
      html += `<button type="button" class="${baseClass}" data-annotation-id="${annotation.id}" data-kind="${annotation.kind}"><span class="cd-immersive-marker-badge">${escapeHtml(
        annotation.label
      )}</span></button>`;
    } else {
      html += `<button type="button" class="${baseClass}" data-annotation-id="${annotation.id}" data-kind="${annotation.kind}"><span class="cd-immersive-marker-text">${escapeHtml(
        annotation.snippet
      )}</span><span class="cd-immersive-marker-badge">${escapeHtml(annotation.label)}</span></button>`;
    }
    cursor = annotation.rangeEnd;
  });
  if (cursor < body.length) {
    html += escapeHtml(body.slice(cursor));
  }
  return html;
};

const learningTip = {
  intro: 'Immersive text overlays slow readers down in the best way—pairing a passage with prompts, annotations, and micro-checks.',
  when: 'Use them for close reading, walkthroughs of complex explanations, or primary sources where you want to model expert thinking in context.',
  considerations: [
    'Highlight only the most essential excerpts so the page does not feel crowded with markers.',
    'Sequence annotations to scaffold thinking—from noticing, to interpreting, to applying the idea elsewhere.',
    'Mix interaction types (comments, guiding questions, quick quizzes) to keep engagement active and varied.'
  ],
  examples: [
    'Literature seminar: annotate a poem with historical context and reflection prompts.',
    'Business case study: surface decision checkpoints with data callouts and “what would you do?” questions.',
    'STEM reading: insert micro-quizzes beside procedural steps to confirm understanding before moving on.'
  ]
};

export const immersiveText = {
  id: 'immersiveText',
  label: 'Immersive text',
  template,
  example,
  buildEditor,
  renderPreview,
  embedTemplate,
  learningTip
};
