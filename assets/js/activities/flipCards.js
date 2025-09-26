import { clone, uid, escapeHtml } from '../utils.js';

const createSampleCards = () => [
  {
    id: uid('card'),
    front: 'Photosynthesis',
    back: 'Plants convert sunlight, water, and CO₂ into glucose and oxygen.'
  },
  {
    id: uid('card'),
    front: 'Chlorophyll',
    back: 'The green pigment that captures light energy for photosynthesis.'
  },
  {
    id: uid('card'),
    front: 'Light-dependent reactions',
    back: 'Use sunlight to split water molecules and produce ATP and NADPH.'
  },
  {
    id: uid('card'),
    front: 'Calvin cycle',
    back: 'Uses ATP and NADPH to fix carbon dioxide into sugars.'
  }
];

const template = () => ({
  cards: createSampleCards()
});

const example = () => ({
  cards: [
    {
      id: uid('card'),
      front: 'Photosynthesis overview',
      back: 'Plants turn light, water, and CO₂ into glucose (food) and oxygen.'
    },
    {
      id: uid('card'),
      front: 'Where it happens',
      back: 'Inside chloroplasts — mostly in the leaves of green plants.'
    },
    {
      id: uid('card'),
      front: 'Stage 1: Light reactions',
      back: 'Chlorophyll captures sunlight to make energy carriers (ATP & NADPH).'
    },
    {
      id: uid('card'),
      front: 'Stage 2: Calvin cycle',
      back: 'The plant uses ATP & NADPH to build sugars from carbon dioxide.'
    }
  ]
});

const buildEditor = (container, data, onUpdate) => {
  const working = clone(data);

  const rerender = () => {
    container.innerHTML = '';

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'ghost-button';
    addButton.textContent = 'Add card';
    addButton.addEventListener('click', () => {
      working.cards.push({ id: uid('card'), front: 'New prompt', back: 'Answer' });
      emit();
    });

    if (working.cards.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<p>No cards yet. Click “Add card” to get started.</p>';
      container.append(empty);
    }

    working.cards.forEach((card, index) => {
      const item = document.createElement('div');
      item.className = 'editor-item';

      const header = document.createElement('div');
      header.className = 'editor-item-header';
      header.innerHTML = `<span>Card ${index + 1}</span>`;

      const actions = document.createElement('div');
      actions.className = 'editor-item-actions';

      const duplicateBtn = document.createElement('button');
      duplicateBtn.type = 'button';
      duplicateBtn.className = 'muted-button';
      duplicateBtn.textContent = 'Duplicate';
      duplicateBtn.addEventListener('click', () => {
        working.cards.splice(index + 1, 0, { ...clone(card), id: uid('card') });
        emit();
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'muted-button';
      deleteBtn.textContent = 'Remove';
      deleteBtn.addEventListener('click', () => {
        working.cards.splice(index, 1);
        emit();
      });

      actions.append(duplicateBtn, deleteBtn);
      header.append(actions);

      const frontLabel = document.createElement('label');
      frontLabel.className = 'field';
      frontLabel.innerHTML = `<span class="field-label">Front text</span>`;
      const frontInput = document.createElement('textarea');
      frontInput.value = card.front;
      frontInput.rows = 2;
      frontInput.addEventListener('input', () => {
        working.cards[index].front = frontInput.value;
        emit(false);
      });
      frontLabel.append(frontInput);

      const backLabel = document.createElement('label');
      backLabel.className = 'field';
      backLabel.innerHTML = `<span class="field-label">Back text</span>`;
      const backInput = document.createElement('textarea');
      backInput.value = card.back;
      backInput.rows = 3;
      backInput.addEventListener('input', () => {
        working.cards[index].back = backInput.value;
        emit(false);
      });
      backLabel.append(backInput);

      item.append(header, frontLabel, backLabel);
      container.append(item);
    });

    container.append(addButton);
  };

  const emit = (refresh = true) => {
    onUpdate(clone(working));
    if (refresh) {
      rerender();
    }
  };

  rerender();
};

const renderPreview = (container, data, { playAnimations }) => {
  container.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'flipcard-grid';

  data.cards.forEach((card, index) => {
    const cardWrapper = document.createElement('div');
    cardWrapper.className = 'flipcard';
    cardWrapper.style.setProperty('--card-index', String(index));
    if (playAnimations) {
      cardWrapper.style.removeProperty('animation');
      cardWrapper.style.removeProperty('opacity');
      cardWrapper.style.removeProperty('transform');
    } else {
      cardWrapper.style.animation = 'none';
      cardWrapper.style.opacity = '1';
      cardWrapper.style.transform = 'translateY(0) scale(1)';
    }
    const inner = document.createElement('div');
    inner.className = 'flipcard-inner';

    if (playAnimations) {
      inner.classList.add('animate');
    }

    const front = document.createElement('div');
    front.className = 'flipcard-face flipcard-front';
    const frontText = document.createElement('p');
    frontText.textContent = card.front || 'Front';
    front.append(frontText);

    const back = document.createElement('div');
    back.className = 'flipcard-face flipcard-back';
    const backText = document.createElement('p');
    backText.textContent = card.back || 'Back';
    back.append(backText);

    inner.append(front, back);
    cardWrapper.append(inner);

    const setFlipState = (flipped) => {
      if (flipped) {
        cardWrapper.classList.add('flipped');
        if (playAnimations) {
          inner.classList.remove('animate');
        }
      } else {
        cardWrapper.classList.remove('flipped');
        if (playAnimations) {
          inner.classList.add('animate');
        }
      }
      cardWrapper.setAttribute('aria-pressed', flipped ? 'true' : 'false');
    };

    const toggleFlip = () => {
      const nextState = !cardWrapper.classList.contains('flipped');
      setFlipState(nextState);
    };

    cardWrapper.addEventListener('click', toggleFlip);
    cardWrapper.addEventListener('keypress', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleFlip();
      }
    });
    cardWrapper.setAttribute('tabindex', '0');
    cardWrapper.setAttribute('role', 'button');
    setFlipState(false);

    grid.append(cardWrapper);
  });

  container.append(grid);
};

const embedTemplate = (data, containerId) => ({
  html: `
    <div class="cd-flipcard-grid">
      ${data.cards
        .map(
          (card, index) => `
          <div class="cd-flipcard" tabindex="0" role="button" aria-pressed="false" style="--card-index: ${index};">
            <div class="cd-flipcard-inner">
              <div class="cd-flipcard-face cd-flipcard-front">
                <p>${escapeHtml(card.front || '')}</p>
              </div>
              <div class="cd-flipcard-face cd-flipcard-back">
                <p>${escapeHtml(card.back || '')}</p>
              </div>
            </div>
          </div>`
        )
        .join('')}
    </div>
  `,
  css: `
    #${containerId} .cd-flipcard-grid {
      display: grid;
      gap: 1.2rem;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }
    #${containerId} .cd-flipcard {
      perspective: 1000px;
      cursor: pointer;
      position: relative;
      opacity: 0;
      transform: translateY(18px) scale(0.98);
      animation: cd-flipcard-reveal 420ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
      animation-delay: calc(var(--card-index, 0) * 120ms);
    }
    #${containerId} .cd-flipcard-inner {
      position: relative;
      width: 100%;
      transform-style: preserve-3d;
      transition: transform 0.6s cubic-bezier(0.22, 0.61, 0.36, 1);
      min-height: 160px;
    }
    #${containerId} .cd-flipcard:focus-visible .cd-flipcard-inner,
    #${containerId} .cd-flipcard:hover .cd-flipcard-inner {
      box-shadow: 0 16px 32px rgba(99, 102, 241, 0.25);
    }
    #${containerId} .cd-flipcard.flipped .cd-flipcard-inner {
      transform: rotateY(180deg);
    }
    #${containerId} .cd-flipcard-face {
      position: absolute;
      inset: 0;
      backface-visibility: hidden;
      border-radius: 14px;
      padding: 1.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 1rem;
      box-shadow: 0 14px 24px rgba(15, 23, 42, 0.16);
      overflow: hidden;
    }
    #${containerId} .cd-flipcard-face::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.4), transparent 55%);
      opacity: 0;
      transform: translateY(12%);
      transition: opacity 200ms ease, transform 260ms ease;
    }
    #${containerId} .cd-flipcard:hover .cd-flipcard-face::after,
    #${containerId} .cd-flipcard:focus-visible .cd-flipcard-face::after {
      opacity: 1;
      transform: translateY(0);
    }
    #${containerId} .cd-flipcard-front {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(236, 233, 254, 0.75));
    }
    #${containerId} .cd-flipcard-back {
      background: white;
      transform: rotateY(180deg);
    }
    #${containerId} .cd-flipcard p {
      margin: 0;
      line-height: 1.4;
    }
    @keyframes cd-flipcard-reveal {
      from {
        opacity: 0;
        transform: translateY(18px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `,
  js: `
    (function(){
      const root = document.getElementById('${containerId}');
      if (!root) return;
      root.querySelectorAll('.cd-flipcard').forEach((card) => {
        card.addEventListener('click', () => {
          const isFlipped = card.classList.toggle('flipped');
          card.setAttribute('aria-pressed', String(isFlipped));
        });
        card.addEventListener('keypress', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            const isFlipped = card.classList.toggle('flipped');
            card.setAttribute('aria-pressed', String(isFlipped));
          }
        });
      });
    })();
  `
});

export const flipCards = {
  id: 'flipCards',
  label: 'Flip cards',
  template,
  example,
  buildEditor,
  renderPreview,
  embedTemplate
};
