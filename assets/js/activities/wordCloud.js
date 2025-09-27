import { clone, uid, escapeHtml } from '../utils.js';

const DEFAULT_PROMPT = 'What word or short phrase captures your reaction to today\'s lesson?';
const DEFAULT_INSTRUCTIONS = 'Submit up to three contributions. Watch the cloud grow as classmates share.';
const DEFAULT_PALETTE = ['#6366f1', '#ec4899', '#f97316', '#14b8a6', '#0ea5e9'];
const SAMPLE_WORDS = ['Curious', 'Inspired', 'Puzzled', 'Confident', 'Motivated'];

const clampNumber = (value, { min = 1, max = 6, fallback = 1 } = {}) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  if (parsed < min) {
    return min;
  }
  if (parsed > max) {
    return max;
  }
  return parsed;
};

const clampWeight = (value) => clampNumber(value, { min: 1, max: 8, fallback: 1 });
const clampMaxEntries = (value) => clampNumber(value, { min: 1, max: 6, fallback: 3 });
const clampDisplayCount = (value) => clampNumber(value, { min: 10, max: 150, fallback: 60 });

const ensurePalette = (value) => {
  if (!Array.isArray(value)) {
    return [...DEFAULT_PALETTE];
  }
  const filtered = value.filter((item) => typeof item === 'string' && item.trim().length);
  return filtered.length ? filtered.slice(0, 12) : [...DEFAULT_PALETTE];
};

const slugify = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  const normalised = value
    .normalize ? value.normalize('NFKD') : value;
  return normalised
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const hashString = (value) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value || '');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) & 0xffffffff;
  }
  return Math.abs(hash).toString(36);
};

const sanitiseDocId = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(/[^a-zA-Z0-9_-]/g, '');
};

const computeResponseId = (projectId, working) => {
  const trimmed = sanitiseDocId(projectId || '');
  if (trimmed) {
    return `wc_${trimmed}`;
  }
  const seed = `${working.prompt || ''}|${working.instructions || ''}|${working.starterWords
    .map((item) => item.text || '')
    .join('|')}|${working.maxEntriesPerParticipant}`;
  return `wc_${hashString(seed)}`;
};

const createWord = (overrides = {}, index = 0) => {
  const base = {
    id: uid('word'),
    text: SAMPLE_WORDS[index % SAMPLE_WORDS.length],
    weight: 2 + (index % 3)
  };
  const word = { ...base, ...overrides };
  if (!word.id) {
    word.id = uid('word');
  }
  if (typeof word.text !== 'string') {
    word.text = '';
  }
  word.text = word.text.trim();
  word.weight = clampWeight(word.weight);
  return word;
};

const normaliseWords = (words) => {
  if (!Array.isArray(words)) {
    return [];
  }
  return words.map((word, index) => createWord(word, index));
};

const ensureWorkingState = (data) => {
  const safe = data ? clone(data) : {};
  return {
    prompt: typeof safe.prompt === 'string' ? safe.prompt : DEFAULT_PROMPT,
    instructions: typeof safe.instructions === 'string' ? safe.instructions : DEFAULT_INSTRUCTIONS,
    maxEntriesPerParticipant: clampMaxEntries(safe.maxEntriesPerParticipant),
    maxWordsDisplayed: clampDisplayCount(safe.maxWordsDisplayed),
    palette: ensurePalette(safe.palette),
    starterWords: normaliseWords(safe.starterWords)
  };
};

const template = () => ({
  prompt: DEFAULT_PROMPT,
  instructions: DEFAULT_INSTRUCTIONS,
  maxEntriesPerParticipant: 3,
  maxWordsDisplayed: 60,
  palette: [...DEFAULT_PALETTE],
  starterWords: normaliseWords([
    { text: 'Curious', weight: 3 },
    { text: 'Inspired', weight: 2 },
    { text: 'Motivated', weight: 2 }
  ])
});

const example = () => ({
  prompt: 'Describe the moon landing in one word.',
  instructions: 'Share up to three words. Watch how the collective mood shifts as we discuss.',
  maxEntriesPerParticipant: 3,
  maxWordsDisplayed: 60,
  palette: ['#6366f1', '#f97316', '#22c55e', '#0ea5e9', '#ef4444'],
  starterWords: normaliseWords([
    { text: 'Historic', weight: 4 },
    { text: 'Courageous', weight: 3 },
    { text: 'Unity', weight: 2 },
    { text: 'Innovation', weight: 2 }
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

  const updateWord = (index, patch) => {
    working.starterWords[index] = { ...working.starterWords[index], ...patch };
  };

  const rerender = () => {
    container.innerHTML = '';

    const promptField = document.createElement('label');
    promptField.className = 'field';
    promptField.innerHTML = '<span class="field-label">Prompt</span>';
    const promptInput = document.createElement('input');
    promptInput.type = 'text';
    promptInput.className = 'text-input';
    promptInput.placeholder = 'e.g. Sum up this concept in one word';
    promptInput.value = working.prompt;
    promptInput.addEventListener('input', () => {
      working.prompt = promptInput.value;
      emit(false);
    });
    promptField.append(promptInput);

    const instructionsField = document.createElement('label');
    instructionsField.className = 'field';
    instructionsField.innerHTML = '<span class="field-label">Participant instructions</span>';
    const instructionsInput = document.createElement('textarea');
    instructionsInput.rows = 3;
    instructionsInput.value = working.instructions;
    instructionsInput.placeholder = 'Let learners know how many words to add or what focus to use.';
    instructionsInput.addEventListener('input', () => {
      working.instructions = instructionsInput.value;
      emit(false);
    });
    instructionsField.append(instructionsInput);

    const maxField = document.createElement('label');
    maxField.className = 'field';
    maxField.innerHTML = '<span class="field-label">Words per participant</span>';

    const maxControls = document.createElement('div');
    maxControls.className = 'range-field';

    const maxInput = document.createElement('input');
    maxInput.type = 'range';
    maxInput.min = '1';
    maxInput.max = '6';
    maxInput.step = '1';
    maxInput.value = String(working.maxEntriesPerParticipant);
    maxInput.className = 'range-input';

    const maxValue = document.createElement('span');
    maxValue.className = 'range-value';
    maxValue.textContent = `${working.maxEntriesPerParticipant} word${
      working.maxEntriesPerParticipant === 1 ? '' : 's'
    }`;

    maxInput.addEventListener('input', () => {
      const value = clampMaxEntries(maxInput.value);
      working.maxEntriesPerParticipant = value;
      maxValue.textContent = `${value} word${value === 1 ? '' : 's'}`;
      emit(false);
    });

    maxControls.append(maxInput, maxValue);
    maxField.append(maxControls);

    const displayField = document.createElement('label');
    displayField.className = 'field';
    displayField.innerHTML = '<span class="field-label">Words shown in cloud</span>';

    const displayControls = document.createElement('div');
    displayControls.className = 'range-field';

    const displayInput = document.createElement('input');
    displayInput.type = 'range';
    displayInput.min = '10';
    displayInput.max = '150';
    displayInput.step = '5';
    displayInput.value = String(working.maxWordsDisplayed);
    displayInput.className = 'range-input';

    const displayValue = document.createElement('span');
    displayValue.className = 'range-value';
    displayValue.textContent = `${working.maxWordsDisplayed} word${
      working.maxWordsDisplayed === 1 ? '' : 's'
    }`;

    displayInput.addEventListener('input', () => {
      const value = clampDisplayCount(displayInput.value);
      working.maxWordsDisplayed = value;
      displayValue.textContent = `${value} word${value === 1 ? '' : 's'}`;
      emit(false);
    });

    displayControls.append(displayInput, displayValue);
    displayField.append(displayControls);

    const paletteField = document.createElement('label');
    paletteField.className = 'field';
    paletteField.innerHTML = '<span class="field-label">Word colours</span>';

    const paletteList = document.createElement('div');
    paletteList.className = 'color-palette-field';

    working.palette.forEach((color, index) => {
      const swatchWrapper = document.createElement('div');
      swatchWrapper.className = 'color-swatch';

      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = color;
      colorInput.setAttribute('aria-label', `Word colour ${index + 1}`);
      colorInput.addEventListener('input', () => {
        working.palette[index] = colorInput.value;
        emit(false);
      });

      swatchWrapper.append(colorInput);
      paletteList.append(swatchWrapper);
    });

    const addPaletteBtn = document.createElement('button');
    addPaletteBtn.type = 'button';
    addPaletteBtn.className = 'muted-button';
    addPaletteBtn.textContent = 'Add colour';
    addPaletteBtn.addEventListener('click', () => {
      if (working.palette.length >= 12) {
        return;
      }
      working.palette.push(DEFAULT_PALETTE[working.palette.length % DEFAULT_PALETTE.length]);
      emit();
    });

    if (working.palette.length < 12) {
      paletteList.append(addPaletteBtn);
    }

    paletteField.append(paletteList);

    const wordsHeader = document.createElement('div');
    wordsHeader.className = 'editor-section-header';
    wordsHeader.innerHTML = '<h3>Starter words (optional)</h3>';

    const wordsList = document.createElement('div');
    wordsList.className = 'editor-stack';

    if (!working.starterWords.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<p>Add a few sample words so the cloud has context before learners contribute.</p>';
      wordsList.append(empty);
    } else {
      working.starterWords.forEach((word, index) => {
        const item = document.createElement('div');
        item.className = 'editor-item';

        const header = document.createElement('div');
        header.className = 'editor-item-header';
        header.innerHTML = `<span>Word ${index + 1}</span>`;

        const actions = document.createElement('div');
        actions.className = 'editor-item-actions';

        const duplicateBtn = document.createElement('button');
        duplicateBtn.type = 'button';
        duplicateBtn.className = 'muted-button';
        duplicateBtn.textContent = 'Duplicate';
        duplicateBtn.addEventListener('click', () => {
          const cloneSource = createWord(word, working.starterWords.length);
          working.starterWords.splice(index + 1, 0, cloneSource);
          emit();
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'muted-button';
        deleteBtn.textContent = 'Remove';
        deleteBtn.addEventListener('click', () => {
          working.starterWords.splice(index, 1);
          emit();
        });

        actions.append(duplicateBtn, deleteBtn);
        header.append(actions);

        const wordField = document.createElement('label');
        wordField.className = 'field';
        wordField.innerHTML = '<span class="field-label">Word or phrase</span>';
        const wordInput = document.createElement('input');
        wordInput.type = 'text';
        wordInput.className = 'text-input';
        wordInput.placeholder = 'e.g. Collaborative';
        wordInput.value = word.text;
        wordInput.addEventListener('input', () => {
          updateWord(index, { text: wordInput.value });
          emit(false);
        });
        wordField.append(wordInput);

        const weightField = document.createElement('label');
        weightField.className = 'field';
        weightField.innerHTML = '<span class="field-label">Emphasis</span>';

        const weightControls = document.createElement('div');
        weightControls.className = 'range-field';

        const weightInput = document.createElement('input');
        weightInput.type = 'range';
        weightInput.min = '1';
        weightInput.max = '8';
        weightInput.step = '1';
        weightInput.value = String(word.weight);
        weightInput.className = 'range-input';

        const weightValue = document.createElement('span');
        weightValue.className = 'range-value';
        weightValue.textContent = `x${word.weight}`;

        weightInput.addEventListener('input', () => {
          const value = clampWeight(weightInput.value);
          updateWord(index, { weight: value });
          weightValue.textContent = `x${value}`;
          emit(false);
        });

        weightControls.append(weightInput, weightValue);
        weightField.append(weightControls);

        item.append(header, wordField, weightField);
        wordsList.append(item);
      });
    }

    const addWordBtn = document.createElement('button');
    addWordBtn.type = 'button';
    addWordBtn.className = 'ghost-button';
    addWordBtn.textContent = 'Add starter word';
    addWordBtn.addEventListener('click', () => {
      working.starterWords.push(createWord({ text: 'New word', weight: 2 }, working.starterWords.length));
      emit();
    });

    container.append(
      promptField,
      instructionsField,
      maxField,
      displayField,
      paletteField,
      wordsHeader,
      wordsList,
      addWordBtn
    );
  };

  rerender();
};

const renderPreview = (container, data) => {
  container.innerHTML = '';
  const working = ensureWorkingState(data);

  const wrapper = document.createElement('div');
  wrapper.className = 'wordcloud-preview';

  const header = document.createElement('div');
  header.className = 'wordcloud-preview-header';

  const prompt = document.createElement('h3');
  prompt.className = 'wordcloud-preview-prompt';
  prompt.textContent = working.prompt;

  const instructions = document.createElement('p');
  instructions.className = 'wordcloud-preview-instructions';
  instructions.textContent = working.instructions;

  header.append(prompt, instructions);

  const entryForm = document.createElement('div');
  entryForm.className = 'wordcloud-preview-form';

  const entryLabel = document.createElement('span');
  entryLabel.className = 'wordcloud-preview-form-label';
  entryLabel.textContent = 'Participants submit words in the embedded form:';

  const entryControls = document.createElement('div');
  entryControls.className = 'wordcloud-preview-input';

  const entryInput = document.createElement('input');
  entryInput.type = 'text';
  entryInput.disabled = true;
  entryInput.placeholder = 'Add your word…';

  const entryButton = document.createElement('button');
  entryButton.type = 'button';
  entryButton.disabled = true;
  entryButton.textContent = 'Submit';

  entryControls.append(entryInput, entryButton);
  entryForm.append(entryLabel, entryControls);

  const cloud = document.createElement('div');
  cloud.className = 'wordcloud-preview-cloud';

  const entries = working.starterWords
    .filter((word) => typeof word.text === 'string' && word.text.trim().length)
    .map((word) => ({
      text: word.text.trim(),
      weight: clampWeight(word.weight)
    }));

  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'wordcloud-preview-empty';
    empty.textContent = 'Starter words appear here until learners add their own.';
    cloud.append(empty);
  } else {
    entries.sort((a, b) => {
      if (b.weight !== a.weight) {
        return b.weight - a.weight;
      }
      return a.text.localeCompare(b.text, undefined, { sensitivity: 'base' });
    });
    const limitedEntries = entries.slice(0, clampDisplayCount(working.maxWordsDisplayed));
    const maxWeight = limitedEntries[0]?.weight || 1;
    limitedEntries.forEach((entry, index) => {
      const span = document.createElement('span');
      span.className = 'wordcloud-preview-word';
      span.textContent = entry.text;
      const scale = entry.weight / maxWeight;
      const size = 1 + scale * 1.4;
      span.style.fontSize = `${size.toFixed(2)}rem`;
      const color = working.palette[index % working.palette.length];
      span.style.color = color;
      cloud.append(span);
    });
  }

  wrapper.append(header, entryForm, cloud);
  container.append(wrapper);
};

const serializeForScript = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

const embedTemplate = (data, containerId, context = {}) => {
  const working = ensureWorkingState(data);
  const responseId = computeResponseId(context.projectId, working);

  const seedMap = new Map();
  working.starterWords.forEach((word) => {
    if (typeof word.text !== 'string') {
      return;
    }
    const display = word.text.trim();
    if (!display) {
      return;
    }
    const key = slugify(display);
    if (!key) {
      return;
    }
    const existing = seedMap.get(key);
    const weight = clampWeight(word.weight);
    if (!existing || weight > existing.count) {
      seedMap.set(key, { key, text: display, count: weight });
    }
  });

  const config = {
    responseId,
    palette: ensurePalette(working.palette),
    maxEntries: clampMaxEntries(working.maxEntriesPerParticipant),
    maxWordsDisplayed: clampDisplayCount(working.maxWordsDisplayed),
    seedWords: Array.from(seedMap.values())
  };

  const firebaseConfig = {
    apiKey: 'AIzaSyBLj8Ql3rEOLmIiVW6IDa8uJNGFLNbhA6U',
    authDomain: 'tdt-sandbox.firebaseapp.com',
    projectId: 'tdt-sandbox',
    storageBucket: 'tdt-sandbox.firebasestorage.app',
    messagingSenderId: '924451875699',
    appId: '1:924451875699:web:46464d31b27c4c62b3f306'
  };

  return {
    html: `
    <section class="cd-wordcloud" aria-labelledby="${containerId}-prompt">
      <header class="cd-wordcloud-header">
        <h2 id="${containerId}-prompt" class="cd-wordcloud-title">${escapeHtml(working.prompt)}</h2>
        <p class="cd-wordcloud-instructions">${escapeHtml(working.instructions)}</p>
        <p class="cd-wordcloud-cap">Share up to ${
          config.maxEntries
        } word${config.maxEntries === 1 ? '' : 's'} per device.</p>
      </header>
      <form class="cd-wordcloud-form" data-wordcloud-form>
        <label class="cd-wordcloud-label" for="${containerId}-input">Add your word</label>
        <div class="cd-wordcloud-input">
          <input id="${containerId}-input" type="text" maxlength="36" autocomplete="off" placeholder="e.g. Curious" required />
          <button type="submit">Submit</button>
        </div>
      </form>
      <div class="cd-wordcloud-status" data-wordcloud-status role="status" aria-live="polite" hidden></div>
      <div class="cd-wordcloud-cloud" data-wordcloud-entries aria-live="polite"></div>
    </section>
  `,
    css: `
    .cd-wordcloud {
      display: grid;
      gap: 1.25rem;
      padding: clamp(1.2rem, 3vw, 1.8rem);
      background: linear-gradient(145deg, rgba(99, 102, 241, 0.12), rgba(14, 165, 233, 0.08));
      border-radius: 20px;
      border: 1px solid rgba(99, 102, 241, 0.18);
    }
    .cd-wordcloud-header {
      display: grid;
      gap: 0.5rem;
    }
    .cd-wordcloud-title {
      margin: 0;
      font-size: clamp(1.15rem, 2vw, 1.5rem);
      font-weight: 600;
    }
    .cd-wordcloud-instructions {
      margin: 0;
      color: rgba(15, 23, 42, 0.7);
      font-size: 0.95rem;
    }
    .cd-wordcloud-cap {
      margin: 0;
      font-size: 0.85rem;
      color: rgba(99, 102, 241, 0.8);
      font-weight: 500;
    }
    .cd-wordcloud-form {
      display: grid;
      gap: 0.5rem;
    }
    .cd-wordcloud-label {
      font-weight: 600;
      font-size: 0.9rem;
      color: rgba(15, 23, 42, 0.75);
    }
    .cd-wordcloud-input {
      display: flex;
      gap: 0.6rem;
      align-items: center;
    }
    .cd-wordcloud-input input {
      flex: 1;
      border-radius: 999px;
      border: 1px solid rgba(15, 23, 42, 0.15);
      padding: 0.65rem 1rem;
      font-size: 1rem;
      font-family: inherit;
      outline: none;
      transition: border-color 160ms ease, box-shadow 160ms ease;
    }
    .cd-wordcloud-input input:focus {
      border-color: rgba(99, 102, 241, 0.6);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18);
    }
    .cd-wordcloud-input button {
      border: none;
      border-radius: 999px;
      background: #6366f1;
      color: #fff;
      font-size: 0.95rem;
      padding: 0.65rem 1.2rem;
      cursor: pointer;
      font-weight: 600;
      transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
    }
    .cd-wordcloud-input button:disabled {
      cursor: not-allowed;
      opacity: 0.6;
      box-shadow: none;
      transform: none;
    }
    .cd-wordcloud-input button:not(:disabled):hover {
      transform: translateY(-1px);
      box-shadow: 0 12px 22px rgba(79, 70, 229, 0.25);
    }
    .cd-wordcloud-status {
      font-size: 0.9rem;
      padding: 0.5rem 0.75rem;
      border-radius: 12px;
      background: rgba(14, 165, 233, 0.12);
      color: rgba(14, 116, 144, 0.95);
    }
    .cd-wordcloud-status[data-tone="error"] {
      background: rgba(239, 68, 68, 0.12);
      color: rgba(185, 28, 28, 0.95);
    }
    .cd-wordcloud-status[data-tone="limit"] {
      background: rgba(99, 102, 241, 0.12);
      color: rgba(79, 70, 229, 0.95);
    }
    .cd-wordcloud-cloud {
      min-height: 180px;
      display: flex;
      flex-wrap: wrap;
      gap: 0.6rem 1rem;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.8);
      border-radius: 18px;
      padding: 1.2rem;
      border: 1px dashed rgba(99, 102, 241, 0.18);
    }
    .cd-wordcloud-word {
      font-weight: 600;
      transition: transform 160ms ease;
      display: inline-flex;
      align-items: center;
    }
    .cd-wordcloud-word:hover {
      transform: translateY(-2px);
    }
    .cd-wordcloud-empty {
      margin: 0;
      color: rgba(15, 23, 42, 0.55);
      font-style: italic;
    }
    @media (max-width: 640px) {
      .cd-wordcloud-input {
        flex-direction: column;
        align-items: stretch;
      }
      .cd-wordcloud-input button {
        width: 100%;
      }
    }
  `,
    js: `
    (() => {
      const config = ${serializeForScript(config)};
      const firebaseConfig = ${serializeForScript(firebaseConfig)};
      const container = document.getElementById('${containerId}');
      if (!container) return;
      const form = container.querySelector('[data-wordcloud-form]');
      const input = container.querySelector('[data-wordcloud-form] input');
      const statusEl = container.querySelector('[data-wordcloud-status]');
      const entriesEl = container.querySelector('[data-wordcloud-entries]');
      if (!form || !input || !statusEl || !entriesEl) return;
      const submitButton = form.querySelector('button[type="submit"]');

      const maxEntries = Math.max(1, Math.min(config.maxEntries || 3, 6));
      const maxWordsDisplayed = Math.max(10, Math.min(config.maxWordsDisplayed || 60, 150));
      const palette = Array.isArray(config.palette) && config.palette.length ? config.palette : ${serializeForScript(DEFAULT_PALETTE)};

      const storageKey = 'cd-wordcloud:' + config.responseId;
      const safeLocalStorage = (() => {
        try {
          const testKey = '__cd-wordcloud-test__';
          window.localStorage.setItem(testKey, '1');
          window.localStorage.removeItem(testKey);
          return window.localStorage;
        } catch (error) {
          return null;
        }
      })();

      const getContributionCount = () => {
        if (!safeLocalStorage) return 0;
        const raw = safeLocalStorage.getItem(storageKey);
        const parsed = Number.parseInt(raw || '0', 10);
        return Number.isNaN(parsed) ? 0 : parsed;
      };

      const setContributionCount = (value) => {
        if (!safeLocalStorage) return;
        safeLocalStorage.setItem(storageKey, String(value));
      };

      const showStatus = (message, tone = 'info') => {
        statusEl.textContent = message;
        statusEl.dataset.tone = tone;
        statusEl.hidden = false;
      };

      const clearStatus = () => {
        statusEl.hidden = true;
      };

      const normaliseWord = (value) => {
        if (typeof value !== 'string') {
          return '';
        }
        const trimmed = value.trim().replace(/\s+/g, ' ');
        if (!trimmed) {
          return '';
        }
        const cleaned = trimmed.replace(/[^\p{L}\p{N}\s'-]/gu, '');
        return cleaned.slice(0, 36);
      };

      const slugify = (value) => {
        if (typeof value !== 'string') return '';
        const normalised = value.normalize ? value.normalize('NFKD') : value;
        return normalised
          .toLowerCase()
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      };

      const colorForKey = (key) => {
        let hash = 0;
        for (let i = 0; i < key.length; i += 1) {
          hash = (hash * 33 + key.charCodeAt(i)) & 0xffffffff;
        }
        const index = Math.abs(hash) % palette.length;
        return palette[index];
      };

      const renderWords = (wordsMap) => {
        entriesEl.innerHTML = '';
        const entries = Object.entries(wordsMap || {})
          .map(([key, value]) => ({
            key,
            text: typeof value?.text === 'string' ? value.text : key,
            count: Number.isFinite(value?.count) ? value.count : 0
          }))
          .filter((item) => item.count > 0 && item.text.trim().length);

        if (!entries.length) {
          const empty = document.createElement('p');
          empty.className = 'cd-wordcloud-empty';
          empty.textContent = 'Be the first to add a word!';
          entriesEl.append(empty);
          return;
        }

        entries.sort((a, b) => {
          if (b.count !== a.count) {
            return b.count - a.count;
          }
          return a.text.localeCompare(b.text, undefined, { sensitivity: 'base' });
        });

        const limitedEntries = entries.slice(0, maxWordsDisplayed);
        const maxCount = limitedEntries[0].count || 1;
        limitedEntries.forEach((entry) => {
          const span = document.createElement('span');
          span.className = 'cd-wordcloud-word';
          span.textContent = entry.text;
          const scale = entry.count / maxCount;
          const size = 1 + scale * 1.3;
          span.style.fontSize = size.toFixed(2) + 'rem';
          span.style.color = colorForKey(entry.key || entry.text);
          entriesEl.append(span);
        });
      };

      const applySeedWords = () => {
        if (!Array.isArray(config.seedWords) || !config.seedWords.length) {
          renderWords({});
          return;
        }
        const seedEntries = {};
        config.seedWords.forEach((word) => {
          if (!word || typeof word.key !== 'string') {
            return;
          }
          const key = word.key;
          const text = typeof word.text === 'string' ? word.text : key;
          const count = Number.isFinite(word.count) ? word.count : 1;
          seedEntries[key] = { text, count };
        });
        renderWords(seedEntries);
      };

      applySeedWords();

      let firestoreReady = false;
      let addWord;

      const initFirestore = async () => {
        try {
          const [{ initializeApp, getApps }, { getFirestore, doc, getDoc, setDoc, onSnapshot, serverTimestamp, increment }] = await Promise.all([
            import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),
            import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js')
          ]);

          const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
          const db = getFirestore(app);
          const docRef = doc(db, 'wordCloudResponses', config.responseId);

          const snapshot = await getDoc(docRef);
          if (!snapshot.exists()) {
            const seedUpdate = { createdAt: serverTimestamp() };
            config.seedWords.forEach((word) => {
              if (!word || typeof word.key !== 'string') return;
              seedUpdate['words.' + word.key + '.text'] = word.text;
              seedUpdate['words.' + word.key + '.count'] = Math.max(0, Math.floor(word.count || 1));
            });
            await setDoc(docRef, seedUpdate, { merge: true });
          }

          onSnapshot(docRef, (docSnap) => {
            const data = docSnap.data();
            if (data && data.words) {
              renderWords(data.words);
            }
          });

          addWord = async ({ key, text }) => {
            const update = {
              ['words.' + key + '.text']: text,
              ['words.' + key + '.count']: increment(1),
              updatedAt: serverTimestamp()
            };
            await setDoc(docRef, update, { merge: true });
          };

          firestoreReady = true;
          return true;
        } catch (error) {
          console.warn('Word cloud realtime updates unavailable', error);
          firestoreReady = false;
          showStatus('Live word cloud updates are unavailable right now.', 'error');
          return false;
        }
      };

      let initPromise = initFirestore();

      const maybeDisableForm = () => {
        const count = getContributionCount();
        const remaining = Math.max(0, maxEntries - count);
        if (remaining <= 0) {
          input.disabled = true;
          if (submitButton) submitButton.disabled = true;
          showStatus('Thanks! You\'ve used all your contributions on this device.', 'limit');
        } else {
          input.disabled = false;
          if (submitButton) submitButton.disabled = false;
        }
        return remaining;
      };

      maybeDisableForm();

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearStatus();
        const remainingBefore = maybeDisableForm();
        if (remainingBefore === 0) {
          return;
        }
        const raw = input.value;
        const cleaned = normaliseWord(raw);
        if (!cleaned) {
          showStatus('Enter a word or short phrase before submitting.', 'error');
          return;
        }
        const key = slugify(cleaned);
        if (!key) {
          showStatus('Please choose letters and numbers only.', 'error');
          return;
        }
        try {
          await initPromise;
          if (!firestoreReady || typeof addWord !== 'function') {
            throw new Error('Firestore unavailable');
          }
          await addWord({ key, text: cleaned });
          const count = getContributionCount() + 1;
          setContributionCount(count);
          const remainingAfter = maybeDisableForm();
          input.value = '';
          if (remainingAfter > 0) {
            const message =
              remainingAfter === 1
                ? 'Added to the cloud! You can submit one more word from this device.'
                : 'Added to the cloud! ' + remainingAfter + ' more submissions left on this device.';
            showStatus(message, 'info');
          }
        } catch (error) {
          console.warn('Unable to submit word cloud entry', error);
          showStatus('Unable to submit right now. Please try again.', 'error');
        }
      });
    })();
  `
  };
};

const learningTip = {
  intro: 'Word clouds surface collective thinking in seconds and make emerging themes visible for discussion.',
  when: 'Use them to prime background knowledge, capture emotional reactions, or revisit a topic mid-lesson to check how understanding has shifted.',
  considerations: [
    'Offer a specific prompt so responses cluster around a meaningful theme.',
    'Let participants add a few words each, then pause to interpret patterns together.',
    'Address duplicates by weaving them into the synthesis—shared language signals shared understanding.'
  ],
  examples: [
    'Before a debate: ask learners for words that describe a compelling argument.',
    'During a lab reflection: collect adjectives that summarise experimental results.',
    'After a field trip: gather emotional reactions to highlight takeaways and surprises.'
  ]
};

export const wordCloud = {
  id: 'wordCloud',
  label: 'Word cloud',
  template,
  example,
  buildEditor,
  renderPreview,
  embedTemplate,
  learningTip
};
