import { clone, uid, escapeHtml } from '../utils.js';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const createSampleHotspots = () => [
  {
    id: uid('hotspot'),
    title: 'North America',
    description: 'Home to diverse climates and ecosystems from the Arctic to the tropics.',
    x: 25,
    y: 35
  },
  {
    id: uid('hotspot'),
    title: 'Africa',
    description: 'Known for the Sahara Desert and lush rainforests near the equator.',
    x: 55,
    y: 58
  },
  {
    id: uid('hotspot'),
    title: 'Australia',
    description: 'An island continent featuring the Outback and the Great Barrier Reef.',
    x: 78,
    y: 75
  }
];

const createSampleImage = () => ({
  src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAoAAAAHgCAYAAAB+7H0bAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAL+wAAC/sB4X8xJQAAABl0RVh0U29mdHdhcmUAZ2lmLm5ldCAyLjAuMTGsK74ZAAAI/klEQVR4nO3dQQ2DMBQEQfT+/2lHgx6UTKwxLBzME4f6HaW9rCaDz8ffP5/9wTzHAtBAAAAAAAAAPCVWdP2/Wv697P38eHL78v8zl+d/l+f37+ncF5rzuZ8l9PHGhYhfvbsRHxaYV+88VEcWmFevPFZHFpiXrxw3HNH2c9Z6/OZ8l1PGtjxh2l+W6PGHYX5bo8Ydhflujxh2F+W6PGHYX5bo8Ydhflujxh2F+W6PGHYX5bo8Ydhflujxh2F+W6PGHYX5bo8Ydhflujxh2F+W6PGHYX5bo8Ydhflujxh2F+W6PGHYX5bq8cv1+8Zz32j9O7P5nvM5X5/k+f37et7Xv78bfv+7j4h4tg0AAAAAAACAj40hA1Czbt0AAAAAAADgB+wBlcW3ya2F9DsAAAAASUVORK5CYII=',
  alt: 'World map with highlighted continents'
});

const template = () => ({
  image: createSampleImage(),
  hotspots: createSampleHotspots()
});

const example = () => ({
  image: createSampleImage(),
  hotspots: createSampleHotspots()
});

const buildEditor = (container, data, onUpdate) => {
  const working = clone(data);
  if (!Array.isArray(working.hotspots)) {
    working.hotspots = [];
  }
  const firstHotspot = working.hotspots.length > 0 ? working.hotspots[0] : null;
  let activeId = firstHotspot ? firstHotspot.id : null;

  const emit = (refresh = true) => {
    onUpdate(clone(working));
    if (refresh) rerender();
  };

  const handleImageUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const existingAlt = working.image && typeof working.image.alt === 'string' ? working.image.alt : '';
      const defaultAlt = file
        ? file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
        : '';
      working.image = {
        src: reader.result,
        alt: existingAlt || defaultAlt
      };
      emit();
    };
    reader.readAsDataURL(file);
  };

  const rerender = () => {
    container.innerHTML = '';

    const imageSection = document.createElement('div');
    imageSection.className = 'hotspot-image-input';

    const uploadLabel = document.createElement('label');
    uploadLabel.className = 'field';
    uploadLabel.innerHTML = `<span class="field-label">Upload image</span>`;
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.addEventListener('change', (event) => {
      const [file] = event.target.files;
      handleImageUpload(file);
    });
    uploadLabel.append(fileInput);
    imageSection.append(uploadLabel);

    if (working.image) {
      const altLabel = document.createElement('label');
      altLabel.className = 'field';
      altLabel.innerHTML = `<span class="field-label">Image description (for screen readers)</span>`;
      const altInput = document.createElement('input');
      altInput.type = 'text';
      altInput.className = 'text-input';
      altInput.value = working.image.alt || '';
      altInput.addEventListener('input', () => {
        working.image.alt = altInput.value;
        emit(false);
      });
      altLabel.append(altInput);

      const preview = document.createElement('div');
      preview.className = 'hotspot-image-preview';
      const img = document.createElement('img');
      img.src = working.image.src;
      img.alt = working.image.alt || '';
      preview.append(img);

      const overlay = document.createElement('div');
      overlay.className = 'hotspot-overlay';
      overlay.setAttribute('role', 'presentation');

      const updateActiveMarkers = () => {
        overlay.querySelectorAll('.hotspot-marker').forEach((el) => {
          if (el.dataset.id === activeId) {
            el.classList.add('active');
          } else {
            el.classList.remove('active');
          }
        });
      };

      overlay.addEventListener('click', (event) => {
        if (!activeId) return;
        const rect = preview.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        const hotspot = working.hotspots.find((spot) => spot.id === activeId);
        if (hotspot) {
          hotspot.x = Math.round(x * 10) / 10;
          hotspot.y = Math.round(y * 10) / 10;
          emit();
        }
      });

      working.hotspots.forEach((spot, index) => {
        const marker = document.createElement('div');
        marker.className = 'hotspot-marker';
        marker.style.left = `${spot.x}%`;
        marker.style.top = `${spot.y}%`;
        marker.textContent = index + 1;
        marker.dataset.id = spot.id;
        marker.addEventListener('click', (event) => {
          event.stopPropagation();
          activeId = spot.id;
          emit();
        });
        marker.addEventListener('pointerdown', (event) => {
          event.stopPropagation();
          const pointerId = event.pointerId;
          let isDragging = false;
          const rect = preview.getBoundingClientRect();
          activeId = spot.id;
          emit(false);
          updateActiveMarkers();

          const updatePosition = (clientX, clientY) => {
            const relativeX = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
            const relativeY = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
            spot.x = Math.round(relativeX * 10) / 10;
            spot.y = Math.round(relativeY * 10) / 10;
            marker.style.left = `${spot.x}%`;
            marker.style.top = `${spot.y}%`;
            emit(false);
          };

          const handlePointerMove = (moveEvent) => {
            moveEvent.preventDefault();
            if (!isDragging) {
              isDragging = true;
              marker.classList.add('dragging');
            }
            updatePosition(moveEvent.clientX, moveEvent.clientY);
          };

          const cleanup = () => {
            if (isDragging) {
              marker.classList.remove('dragging');
            }
            try {
              marker.releasePointerCapture(pointerId);
            } catch (error) {
              /* noop */
            }
            marker.removeEventListener('pointermove', handlePointerMove);
            marker.removeEventListener('pointerup', handlePointerUp);
            marker.removeEventListener('pointercancel', handlePointerCancel);
            if (isDragging) {
              emit();
            }
          };

          const handlePointerUp = (upEvent) => {
            upEvent.preventDefault();
            cleanup();
          };

          const handlePointerCancel = () => {
            cleanup();
          };

          marker.setPointerCapture(pointerId);
          marker.addEventListener('pointermove', handlePointerMove);
          marker.addEventListener('pointerup', handlePointerUp);
          marker.addEventListener('pointercancel', handlePointerCancel);
        });
        overlay.append(marker);
      });

      updateActiveMarkers();
      preview.append(overlay);

      const helper = document.createElement('p');
      helper.className = 'hint';
      helper.textContent = 'Select a hotspot below, then click on the image to place it.';

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'ghost-button danger';
      removeButton.textContent = 'Remove image';
      removeButton.addEventListener('click', () => {
        working.image = null;
        emit();
      });

      imageSection.append(altLabel, preview, helper, removeButton);
    }

    container.append(imageSection);

    const hotspotSection = document.createElement('div');
    hotspotSection.className = 'editor-content';

    const addHotspotButton = document.createElement('button');
    addHotspotButton.type = 'button';
    addHotspotButton.className = 'ghost-button';
    addHotspotButton.textContent = 'Add hotspot';
    addHotspotButton.addEventListener('click', () => {
      const spot = {
        id: uid('hotspot'),
        title: `Hotspot ${working.hotspots.length + 1}`,
        description: 'Add supporting detail.',
        x: 50,
        y: 50
      };
      working.hotspots.push(spot);
      activeId = spot.id;
      emit();
    });

    working.hotspots.forEach((spot, index) => {
      const item = document.createElement('div');
      item.className = 'editor-item';
      if (spot.id === activeId) item.classList.add('active');

      const header = document.createElement('div');
      header.className = 'editor-item-header';
      header.innerHTML = `<span>Hotspot ${index + 1}</span>`;

      const actions = document.createElement('div');
      actions.className = 'editor-item-actions';

      const selectBtn = document.createElement('button');
      selectBtn.type = 'button';
      selectBtn.className = 'muted-button';
      selectBtn.textContent = spot.id === activeId ? 'Selected' : 'Select';
      selectBtn.addEventListener('click', () => {
        activeId = spot.id;
        emit();
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'muted-button';
      deleteBtn.textContent = 'Remove';
      deleteBtn.addEventListener('click', () => {
        const idx = working.hotspots.findIndex((s) => s.id === spot.id);
        if (idx >= 0) working.hotspots.splice(idx, 1);
        if (activeId === spot.id) {
          const nextHotspot = working.hotspots.length > 0 ? working.hotspots[0] : null;
          activeId = nextHotspot ? nextHotspot.id : null;
        }
        emit();
      });

      actions.append(selectBtn, deleteBtn);
      header.append(actions);

      const titleLabel = document.createElement('label');
      titleLabel.className = 'field';
      titleLabel.innerHTML = `<span class="field-label">Title</span>`;
      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.className = 'text-input';
      titleInput.value = spot.title;
      titleInput.addEventListener('input', () => {
        spot.title = titleInput.value;
        emit(false);
      });
      titleLabel.append(titleInput);

      const descLabel = document.createElement('label');
      descLabel.className = 'field';
      descLabel.innerHTML = `<span class="field-label">Description</span>`;
      const descInput = document.createElement('textarea');
      descInput.rows = 3;
      descInput.value = spot.description;
      descInput.addEventListener('input', () => {
        spot.description = descInput.value;
        emit(false);
      });
      descLabel.append(descInput);

      const posRow = document.createElement('div');
      posRow.className = 'editor-row';

      const xLabel = document.createElement('label');
      xLabel.className = 'field';
      xLabel.innerHTML = `<span class="field-label">Left (%)</span>`;
      const xInput = document.createElement('input');
      xInput.type = 'number';
      xInput.className = 'text-input';
      xInput.min = 0;
      xInput.max = 100;
      xInput.step = 0.1;
      xInput.value = spot.x;
      xInput.addEventListener('input', () => {
        spot.x = Number(xInput.value);
        emit(false);
        rerender();
      });
      xLabel.append(xInput);

      const yLabel = document.createElement('label');
      yLabel.className = 'field';
      yLabel.innerHTML = `<span class="field-label">Top (%)</span>`;
      const yInput = document.createElement('input');
      yInput.type = 'number';
      yInput.className = 'text-input';
      yInput.min = 0;
      yInput.max = 100;
      yInput.step = 0.1;
      yInput.value = spot.y;
      yInput.addEventListener('input', () => {
        spot.y = Number(yInput.value);
        emit(false);
        rerender();
      });
      yLabel.append(yInput);

      posRow.append(xLabel, yLabel);

      item.append(header, titleLabel, descLabel, posRow);
      hotspotSection.append(item);
    });

    hotspotSection.append(addHotspotButton);
    container.append(hotspotSection);
  };

  rerender();
};

const renderPreview = (container, data) => {
  container.innerHTML = '';
  if (!data.image) {
    container.innerHTML = '<p class="hint">Upload an image to start creating hotspots.</p>';
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'hotspot-preview';
  const img = document.createElement('img');
  img.src = data.image.src;
  img.alt = data.image.alt || '';
  wrapper.append(img);

  const overlay = document.createElement('div');
  overlay.className = 'hotspot-overlay';
  wrapper.append(overlay);

  let openPopover = null;
  let openSpotId = null;

  const closePopover = () => {
    if (openPopover && openPopover.parentElement) {
      openPopover.parentElement.removeChild(openPopover);
    }
    openPopover = null;
    openSpotId = null;
  };

  data.hotspots.forEach((spot, index) => {
    const marker = document.createElement('div');
    marker.className = 'hotspot-marker';
    marker.style.left = `${spot.x}%`;
    marker.style.top = `${spot.y}%`;
    marker.textContent = index + 1;
    marker.setAttribute('tabindex', '0');
    marker.setAttribute('role', 'button');
    marker.setAttribute('aria-label', spot.title);

    const open = () => {
      closePopover();
      const popover = document.createElement('div');
      popover.className = 'hotspot-popover';
      const heading = document.createElement('h3');
      heading.textContent = spot.title || `Hotspot ${index + 1}`;
      const description = document.createElement('p');
      description.textContent = spot.description || '';
      popover.append(heading, description);
      popover.style.left = `${spot.x}%`;
      popover.style.top = `${spot.y}%`;
      overlay.append(popover);
      openPopover = popover;
      openSpotId = spot.id;
    };

    marker.addEventListener('click', (event) => {
      event.stopPropagation();
      if (openSpotId === spot.id) {
        closePopover();
      } else {
        open();
      }
    });
    marker.addEventListener('keypress', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });

    overlay.append(marker);
  });

  overlay.addEventListener('click', () => closePopover());

  container.append(wrapper);
};

const embedTemplate = (data, containerId) => ({
  html: `
    <div class="cd-hotspot">
      ${data.image ? `<img src="${data.image.src}" alt="${escapeHtml(data.image.alt || '')}" />` : ''}
      <div class="cd-hotspot-overlay">
        ${data.hotspots
          .map(
            (spot, index) => `
              <button class="cd-hotspot-marker" style="left:${spot.x}%;top:${spot.y}%;" aria-label="${escapeHtml(spot.title)}" data-title="${escapeHtml(spot.title)}" data-description="${escapeHtml(spot.description)}">
                <span>${index + 1}</span>
              </button>`
          )
          .join('')}
      </div>
      <div class="cd-hotspot-popover" hidden>
        <button class="cd-hotspot-close" type="button" aria-label="Close">×</button>
        <h3></h3>
        <p></p>
      </div>
    </div>
  `,
  css: `
    #${containerId} .cd-hotspot {
      position: relative;
      display: inline-block;
      max-width: 100%;
      font-family: 'Inter', system-ui, sans-serif;
    }
    #${containerId} .cd-hotspot img {
      max-width: 100%;
      display: block;
      border-radius: 16px;
      box-shadow: 0 24px 40px rgba(15, 23, 42, 0.18);
    }
    #${containerId} .cd-hotspot-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    #${containerId} .cd-hotspot-marker {
      position: absolute;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: none;
      background: rgba(99, 102, 241, 0.92);
      color: white;
      font-weight: 600;
      cursor: pointer;
      pointer-events: auto;
      transform: translate(-50%, -50%);
      box-shadow: 0 14px 26px rgba(99, 102, 241, 0.35);
    }
    #${containerId} .cd-hotspot-marker span {
      pointer-events: none;
    }
    #${containerId} .cd-hotspot-popover {
      position: absolute;
      min-width: 240px;
      max-width: min(320px, 90vw);
      padding: 1rem;
      border-radius: 14px;
      background: white;
      border: 1px solid rgba(15, 23, 42, 0.12);
      box-shadow: 0 28px 48px rgba(15, 23, 42, 0.25);
      transform: translate(-50%, -110%);
      z-index: 5;
    }
    #${containerId} .cd-hotspot-popover[hidden] {
      display: none;
    }
    #${containerId} .cd-hotspot-popover h3 {
      margin: 0 0 0.5rem;
      font-size: 1rem;
    }
    #${containerId} .cd-hotspot-popover p {
      margin: 0;
      font-size: 0.95rem;
      line-height: 1.45;
    }
    #${containerId} .cd-hotspot-close {
      position: absolute;
      top: 0.25rem;
      right: 0.5rem;
      border: none;
      background: transparent;
      font-size: 1.4rem;
      cursor: pointer;
      color: rgba(15, 23, 42, 0.55);
    }
  `,
  js: `
    (function(){
      const root = document.getElementById('${containerId}');
      if (!root) return;
      const markers = root.querySelectorAll('.cd-hotspot-marker');
      const popover = root.querySelector('.cd-hotspot-popover');
      if (!popover) return;
      const titleEl = popover.querySelector('h3');
      const descEl = popover.querySelector('p');
      const closeBtn = popover.querySelector('.cd-hotspot-close');

      const open = (marker) => {
        titleEl.textContent = marker.dataset.title;
        descEl.textContent = marker.dataset.description;
        popover.style.left = marker.style.left;
        popover.style.top = marker.style.top;
        popover.hidden = false;
      };

      markers.forEach((marker) => {
        marker.addEventListener('click', (event) => {
          event.stopPropagation();
          if (!popover.hidden && titleEl.textContent === marker.dataset.title) {
            popover.hidden = true;
          } else {
            open(marker);
          }
        });
      });

      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          popover.hidden = true;
        });
      }

      root.addEventListener('click', (event) => {
        if (!popover.contains(event.target) && !event.target.closest('.cd-hotspot-marker')) {
          popover.hidden = true;
        }
      });
    })();
  `
});

export const hotspots = {
  id: 'hotspots',
  label: 'Hotspots',
  template,
  example,
  buildEditor,
  renderPreview,
  embedTemplate
};
