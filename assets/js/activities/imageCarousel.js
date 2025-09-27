import { clone, compressImageFile, escapeHtml, uid } from '../utils.js';

const clampAutoplaySeconds = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  if (parsed > 120) {
    return 120;
  }
  return Math.round(parsed);
};

const createSlide = (overrides = {}, index = 0) => {
  const base = {
    id: uid('carousel-slide'),
    imageUrl: '',
    altText: '',
    caption: index === 0 ? 'Add a helpful caption or context.' : 'Describe what learners should notice.'
  };
  const slide = { ...base, ...overrides };
  if (!slide.id) {
    slide.id = uid('carousel-slide');
  }
  if (typeof slide.imageUrl !== 'string') {
    slide.imageUrl = '';
  }
  if (typeof slide.altText !== 'string') {
    slide.altText = '';
  }
  if (typeof slide.caption !== 'string') {
    slide.caption = '';
  }
  return slide;
};

const normaliseSlides = (slides) => {
  if (!Array.isArray(slides)) {
    return [];
  }
  return slides.map((slide, index) => createSlide(slide, index));
};

const template = () => ({
  slides: normaliseSlides([
    {
      imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
      altText: 'Students collaborating around a table with laptops and notebooks',
      caption: 'Introduce the scenario or topic using a high-impact image.'
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=80',
      altText: 'Close up of hands sketching a prototype on paper',
      caption: 'Highlight an important detail you want learners to focus on.'
    }
  ]),
  autoplaySeconds: 0,
  showIndicators: true
});

const example = () => ({
  slides: normaliseSlides([
    {
      imageUrl: 'https://images.unsplash.com/photo-1522199710521-72d69614c702?auto=format&fit=crop&w=900&q=80',
      altText: 'A design sprint team placing sticky notes on a wall',
      caption: 'Kickoff: Teams capture every idea before grouping similar concepts.'
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1533025788829-2e401502e885?auto=format&fit=crop&w=900&q=80',
      altText: 'Facilitator leading a discussion in front of large sticky note clusters',
      caption: 'Synthesis: Use dot voting to surface patterns and prioritise next steps.'
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&q=80',
      altText: 'Team presenting a storyboard to peers',
      caption: 'Share-out: Present a prototype to gather feedback before iterating.'
    }
  ]),
  autoplaySeconds: 6,
  showIndicators: true
});

const ensureWorkingState = (data) => {
  const safe = data ? clone(data) : {};
  const slides = normaliseSlides(safe.slides);
  return {
    slides,
    autoplaySeconds: clampAutoplaySeconds(safe.autoplaySeconds),
    showIndicators: Boolean(safe.showIndicators)
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

  const handleSlideUpload = async (index, file) => {
    if (!file) {
      return;
    }
    try {
      const dataUrl = await compressImageFile(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.82 });
      working.slides[index].imageUrl = dataUrl;
      emit();
    } catch (error) {
      console.error('Unable to process uploaded image.', error);
    }
  };

  const moveSlide = (from, to) => {
    if (to < 0 || to >= working.slides.length) {
      return;
    }
    const [slide] = working.slides.splice(from, 1);
    working.slides.splice(to, 0, slide);
    emit();
  };

  const rerender = () => {
    container.innerHTML = '';

    const settingsBlock = document.createElement('div');
    settingsBlock.className = 'editor-block';

    const autoplayField = document.createElement('label');
    autoplayField.className = 'field';
    autoplayField.innerHTML = '<span class="field-label">Auto-advance (seconds)</span>';
    const autoplayInput = document.createElement('input');
    autoplayInput.type = 'number';
    autoplayInput.min = '0';
    autoplayInput.max = '120';
    autoplayInput.step = '1';
    autoplayInput.value = String(working.autoplaySeconds);
    autoplayInput.addEventListener('input', () => {
      working.autoplaySeconds = clampAutoplaySeconds(autoplayInput.value);
      emit(false);
    });
    autoplayField.append(autoplayInput);

    const indicatorsField = document.createElement('label');
    indicatorsField.className = 'field checkbox-field';
    const indicatorsCheckbox = document.createElement('input');
    indicatorsCheckbox.type = 'checkbox';
    indicatorsCheckbox.checked = working.showIndicators;
    indicatorsCheckbox.addEventListener('change', () => {
      working.showIndicators = indicatorsCheckbox.checked;
      emit(false);
    });
    const indicatorsLabel = document.createElement('span');
    indicatorsLabel.className = 'field-label';
    indicatorsLabel.textContent = 'Show slide indicators';
    indicatorsField.append(indicatorsCheckbox, indicatorsLabel);

    settingsBlock.append(autoplayField, indicatorsField);
    container.append(settingsBlock);

    if (!working.slides.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<p>No slides yet. Upload or add an image to start the carousel.</p>';
      container.append(empty);
    }

    working.slides.forEach((slide, index) => {
      const item = document.createElement('div');
      item.className = 'editor-item';

      const header = document.createElement('div');
      header.className = 'editor-item-header';
      header.innerHTML = `<span>Slide ${index + 1}</span>`;

      const actions = document.createElement('div');
      actions.className = 'editor-item-actions';

      const upButton = document.createElement('button');
      upButton.type = 'button';
      upButton.className = 'muted-button';
      upButton.textContent = 'Move up';
      upButton.disabled = index === 0;
      upButton.addEventListener('click', () => moveSlide(index, index - 1));

      const downButton = document.createElement('button');
      downButton.type = 'button';
      downButton.className = 'muted-button';
      downButton.textContent = 'Move down';
      downButton.disabled = index === working.slides.length - 1;
      downButton.addEventListener('click', () => moveSlide(index, index + 1));

      const duplicateButton = document.createElement('button');
      duplicateButton.type = 'button';
      duplicateButton.className = 'muted-button';
      duplicateButton.textContent = 'Duplicate';
      duplicateButton.addEventListener('click', () => {
        const cloneSource = clone(slide);
        working.slides.splice(index + 1, 0, createSlide({ ...cloneSource, id: uid('carousel-slide') }, index + 1));
        emit();
      });

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'muted-button';
      deleteButton.textContent = 'Delete';
      deleteButton.disabled = working.slides.length <= 1;
      deleteButton.addEventListener('click', () => {
        if (working.slides.length <= 1) {
          return;
        }
        working.slides.splice(index, 1);
        emit();
      });

      actions.append(upButton, downButton, duplicateButton, deleteButton);
      header.append(actions);
      item.append(header);

      const uploadField = document.createElement('label');
      uploadField.className = 'field';
      uploadField.innerHTML = '<span class="field-label">Upload image</span>';
      const uploadInput = document.createElement('input');
      uploadInput.type = 'file';
      uploadInput.accept = 'image/*';
      uploadInput.addEventListener('change', async (event) => {
        const [file] = event.target.files || [];
        if (!file) return;
        await handleSlideUpload(index, file);
        event.target.value = '';
      });
      uploadField.append(uploadInput);

      const imageField = document.createElement('label');
      imageField.className = 'field';
      imageField.innerHTML = '<span class="field-label">Image URL</span>';
      const imageInput = document.createElement('input');
      imageInput.type = 'url';
      imageInput.placeholder = 'https://…';
      imageInput.value = slide.imageUrl;
      imageInput.addEventListener('input', () => {
        working.slides[index].imageUrl = imageInput.value;
        emit(false);
      });
      imageField.append(imageInput);

      const altField = document.createElement('label');
      altField.className = 'field';
      altField.innerHTML = '<span class="field-label">Alt text</span>';
      const altInput = document.createElement('textarea');
      altInput.rows = 2;
      altInput.value = slide.altText;
      altInput.placeholder = 'Describe the essential information in the image.';
      altInput.addEventListener('input', () => {
        working.slides[index].altText = altInput.value;
        emit(false);
      });
      altField.append(altInput);

      const captionField = document.createElement('label');
      captionField.className = 'field';
      captionField.innerHTML = '<span class="field-label">Caption</span>';
      const captionInput = document.createElement('textarea');
      captionInput.rows = 2;
      captionInput.value = slide.caption;
      captionInput.placeholder = 'Add context or a guiding question for this image.';
      captionInput.addEventListener('input', () => {
        working.slides[index].caption = captionInput.value;
        emit(false);
      });
      captionField.append(captionInput);

      item.append(uploadField, imageField, altField, captionField);
      container.append(item);
    });

    const addSlideBtn = document.createElement('button');
    addSlideBtn.type = 'button';
    addSlideBtn.className = 'ghost-button';
    addSlideBtn.textContent = 'Add slide';
    addSlideBtn.addEventListener('click', () => {
      working.slides.push(createSlide({}, working.slides.length));
      emit();
    });
    container.append(addSlideBtn);
  };

  rerender();
};

const renderPreview = (container, data) => {
  container.innerHTML = '';
  if (container.__carouselTimer) {
    clearInterval(container.__carouselTimer);
    container.__carouselTimer = null;
  }
  const working = ensureWorkingState(data);
  const slides = working.slides;

  if (!slides.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<p>Add slides to see the carousel preview.</p>';
    container.append(empty);
    return;
  }

  let activeIndex = 0;
  let autoplayTimer = null;

  const wrapper = document.createElement('div');
  wrapper.className = 'carousel-preview';
  wrapper.dataset.autoplay = String(working.autoplaySeconds);

  const viewport = document.createElement('div');
  viewport.className = 'carousel-preview-viewport';

  const slideElements = slides.map((slide, index) => {
    const slideEl = document.createElement('figure');
    slideEl.className = 'carousel-preview-slide';
    if (index === 0) {
      slideEl.classList.add('is-active');
    }

    if (slide.imageUrl) {
      const img = document.createElement('img');
      img.src = slide.imageUrl;
      img.alt = slide.altText || '';
      slideEl.append(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'carousel-preview-placeholder';
      placeholder.textContent = 'Add an image to display here.';
      slideEl.append(placeholder);
    }

    if (slide.caption) {
      const caption = document.createElement('figcaption');
      caption.textContent = slide.caption;
      slideEl.append(caption);
    }

    viewport.append(slideEl);
    return slideEl;
  });

  const controls = document.createElement('div');
  controls.className = 'carousel-preview-controls';

  const createNavButton = (label, direction) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'muted-button';
    button.textContent = label;
    button.addEventListener('click', () => {
      goToSlide(activeIndex + direction);
      restartAutoplay();
    });
    return button;
  };

  const prevButton = createNavButton('Previous', -1);
  const nextButton = createNavButton('Next', 1);

  controls.append(prevButton, nextButton);

  const indicators = document.createElement('div');
  indicators.className = 'carousel-preview-indicators';
  if (working.showIndicators) {
    slides.forEach((_, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel-preview-indicator';
      dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
      dot.addEventListener('click', () => {
        goToSlide(index);
        restartAutoplay();
      });
      if (index === 0) {
        dot.classList.add('is-active');
      }
      indicators.append(dot);
    });
  }

  const goToSlide = (index) => {
    if (!slideElements.length) {
      return;
    }
    const total = slideElements.length;
    const nextIndex = (index + total) % total;
    slideElements.forEach((slideEl, slideIndex) => {
      slideEl.classList.toggle('is-active', slideIndex === nextIndex);
    });
    if (working.showIndicators) {
      Array.from(indicators.children).forEach((dot, dotIndex) => {
        dot.classList.toggle('is-active', dotIndex === nextIndex);
      });
    }
    activeIndex = nextIndex;
  };

  const restartAutoplay = () => {
    if (!working.autoplaySeconds) {
      return;
    }
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
    }
    autoplayTimer = setInterval(() => {
      goToSlide(activeIndex + 1);
    }, working.autoplaySeconds * 1000);
    container.__carouselTimer = autoplayTimer;
  };

  if (working.autoplaySeconds) {
    autoplayTimer = setInterval(() => {
      goToSlide(activeIndex + 1);
    }, working.autoplaySeconds * 1000);
    container.__carouselTimer = autoplayTimer;
  }

  wrapper.append(viewport, controls);
  if (working.showIndicators) {
    wrapper.append(indicators);
  }

  container.append(wrapper);
};

const embedTemplate = (data, containerId) => {
  const working = ensureWorkingState(data);
  const slides = working.slides;

  const html = slides.length
    ? `
    <div class="cd-carousel" data-autoplay="${working.autoplaySeconds}">
      <div class="cd-carousel-viewport">
        ${slides
          .map(
            (slide, index) => `
          <figure class="cd-carousel-slide${index === 0 ? ' is-active' : ''}" data-index="${index}">
            ${slide.imageUrl ? `<img src="${escapeHtml(slide.imageUrl)}" alt="${escapeHtml(slide.altText)}" />` : `<div class="cd-carousel-placeholder">Add an image to display here.</div>`}
            ${slide.caption ? `<figcaption>${escapeHtml(slide.caption)}</figcaption>` : ''}
          </figure>`
          )
          .join('')}
      </div>
      <div class="cd-carousel-controls">
        <button type="button" class="cd-carousel-nav cd-carousel-prev" aria-label="Previous slide">Previous</button>
        <button type="button" class="cd-carousel-nav cd-carousel-next" aria-label="Next slide">Next</button>
      </div>
      ${working.showIndicators
        ? `<div class="cd-carousel-indicators">
        ${slides
          .map(
            (_, index) => `<button type="button" class="cd-carousel-indicator${index === 0 ? ' is-active' : ''}" aria-label="Go to slide ${index + 1}" data-index="${index}"></button>`
          )
          .join('')}
      </div>`
        : ''}
    </div>`
    : '<div class="cd-carousel-empty">No slides configured yet.</div>';

  const css = `
    #${containerId} .cd-carousel {
      position: relative;
      display: grid;
      gap: 0.75rem;
      background: rgba(15, 23, 42, 0.02);
      padding: 1rem;
      border-radius: 18px;
      border: 1px solid rgba(15, 23, 42, 0.08);
    }
    #${containerId} .cd-carousel-viewport {
      position: relative;
      overflow: hidden;
      border-radius: 14px;
      background: rgba(148, 163, 184, 0.15);
    }
    #${containerId} .cd-carousel-slide {
      margin: 0;
      position: absolute;
      inset: 0;
      opacity: 0;
      transform: translateX(12px);
      transition: opacity 260ms ease, transform 260ms ease;
      display: grid;
      grid-template-rows: 1fr auto;
      background: white;
    }
    #${containerId} .cd-carousel-slide.is-active {
      opacity: 1;
      transform: translateX(0);
      position: relative;
    }
    #${containerId} .cd-carousel-slide img {
      width: 100%;
      height: 320px;
      object-fit: cover;
      border-radius: 12px 12px 0 0;
    }
    #${containerId} .cd-carousel-placeholder {
      height: 320px;
      display: grid;
      place-items: center;
      background: repeating-linear-gradient(45deg, rgba(148, 163, 184, 0.22), rgba(148, 163, 184, 0.22) 14px, rgba(203, 213, 225, 0.4) 14px, rgba(203, 213, 225, 0.4) 28px);
      color: rgba(71, 85, 105, 0.8);
      border-radius: 12px 12px 0 0;
      text-align: center;
      padding: 0 1rem;
      font-size: 0.95rem;
    }
    #${containerId} .cd-carousel-slide figcaption {
      margin: 0;
      padding: 0.85rem 1rem;
      font-size: 0.95rem;
      color: rgba(15, 23, 42, 0.8);
    }
    #${containerId} .cd-carousel-controls {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
    }
    #${containerId} .cd-carousel-nav {
      flex: 1 1 auto;
      padding: 0.65rem 1rem;
      border-radius: 999px;
      border: 1px solid rgba(99, 102, 241, 0.3);
      background: rgba(99, 102, 241, 0.1);
      color: #4338ca;
      font-weight: 600;
      cursor: pointer;
      transition: background 160ms ease, transform 160ms ease;
    }
    #${containerId} .cd-carousel-nav:hover,
    #${containerId} .cd-carousel-nav:focus-visible {
      background: rgba(99, 102, 241, 0.18);
      transform: translateY(-1px);
    }
    #${containerId} .cd-carousel-indicators {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
    }
    #${containerId} .cd-carousel-indicator {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      border: none;
      background: rgba(148, 163, 184, 0.6);
      cursor: pointer;
      transition: background 160ms ease, transform 160ms ease;
    }
    #${containerId} .cd-carousel-indicator.is-active {
      background: #4338ca;
      transform: scale(1.1);
    }
    #${containerId} .cd-carousel-empty {
      padding: 1.5rem;
      text-align: center;
      color: rgba(15, 23, 42, 0.6);
      background: rgba(15, 23, 42, 0.02);
      border-radius: 14px;
    }
    @media (max-width: 640px) {
      #${containerId} .cd-carousel-slide img,
      #${containerId} .cd-carousel-placeholder {
        height: 220px;
      }
    }
  `;

  const js = `(() => {
    const root = document.getElementById('${containerId}');
    if (!root) return;
    const carousel = root.querySelector('.cd-carousel');
    if (!carousel) return;
    const slides = Array.from(carousel.querySelectorAll('.cd-carousel-slide'));
    if (!slides.length) return;
    const prev = carousel.querySelector('.cd-carousel-prev');
    const next = carousel.querySelector('.cd-carousel-next');
    const indicators = Array.from(carousel.querySelectorAll('.cd-carousel-indicator'));
    const autoplaySeconds = Number(carousel.dataset.autoplay) || 0;
    let activeIndex = slides.findIndex((slide) => slide.classList.contains('is-active'));
    if (activeIndex < 0) {
      activeIndex = 0;
      slides[0].classList.add('is-active');
    }
    let timer = null;

    const setActive = (index) => {
      const total = slides.length;
      const nextIndex = (index + total) % total;
      slides.forEach((slide, slideIndex) => {
        const isActive = slideIndex === nextIndex;
        slide.classList.toggle('is-active', isActive);
        slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      });
      indicators.forEach((indicator, indicatorIndex) => {
        indicator.classList.toggle('is-active', indicatorIndex === nextIndex);
        indicator.setAttribute('aria-pressed', indicatorIndex === nextIndex ? 'true' : 'false');
      });
      activeIndex = nextIndex;
    };

    setActive(activeIndex);

    const go = (direction) => {
      setActive(activeIndex + direction);
    };

    const restartAutoplay = () => {
      if (!autoplaySeconds) return;
      if (timer) clearInterval(timer);
      timer = setInterval(() => {
        go(1);
      }, autoplaySeconds * 1000);
    };

    prev?.addEventListener('click', () => {
      go(-1);
      restartAutoplay();
    });

    next?.addEventListener('click', () => {
      go(1);
      restartAutoplay();
    });

    indicators.forEach((indicator) => {
      indicator.addEventListener('click', () => {
        const index = Number(indicator.dataset.index);
        if (!Number.isFinite(index)) return;
        setActive(index);
        restartAutoplay();
      });
    });

    if (autoplaySeconds) {
      timer = setInterval(() => {
        go(1);
      }, autoplaySeconds * 1000);
    }
  })();`;

  return { html, css, js };
};

const learningTip = {
  intro: 'Image carousels curate a guided gallery so learners can focus on one visual story beat at a time.',
  when: 'Use them to compare variations, walk through a visual process, or showcase exemplars when the imagery carries the main insight.',
  considerations: [
    'Sequence slides intentionally and write concise captions that spotlight what to notice in each frame.',
    'Limit the deck to a manageable set—around four to six images keeps learners oriented and avoids fatigue.',
    'Provide descriptive alt text or a companion transcript so every learner can access the full narrative.'
  ],
  examples: [
    'Art history spotlight: contrast interpretations of the same theme with curator commentary per slide.',
    'Science lab prep: illustrate stages of an experiment alongside safety reminders and setup tips.',
    'Design critique: show before-and-after iterations of a prototype with notes on design decisions.'
  ]
};

export const imageCarousel = {
  id: 'imageCarousel',
  label: 'Image carousel',
  template,
  example,
  buildEditor,
  renderPreview,
  embedTemplate,
  learningTip
};
