import { activities, defaultActivityId } from './activities/index.js';
import { clone, formatDate, uid } from './utils.js';
import { listProjects, saveProject, deleteProject, getProject } from './storage.js';
import { generateEmbed } from './embed.js';

const state = {
  id: null,
  type: defaultActivityId,
  title: '',
  description: '',
  data: clone(activities[defaultActivityId].template())
};

const lazyActivityLoaders = {
  flipCards: async () => (await import('./activities/flipCards.js')).flipCards,
  dragDrop: async () => (await import('./activities/dragDrop.js')).dragDrop,
  hotspots: async () => (await import('./activities/hotspots.js')).hotspots,
  accordion: async () => (await import('./activities/accordion.js')).accordion,
  timeline: async () => (await import('./activities/timeline.js')).timeline,
  branchingScenarios: async () => (await import('./activities/branchingScenarios.js')).branchingScenarios,
  imageCarousel: async () => (await import('./activities/imageCarousel.js')).imageCarousel,
  immersiveText: async () => (await import('./activities/immersiveText.js')).immersiveText
};

const pendingActivityLoads = new Map();

const registerActivity = (type, activity) => {
  if (!activity || typeof activity !== 'object') {
    return null;
  }
  const key = typeof activity.id === 'string' && activity.id.trim() ? activity.id : type;
  if (key) {
    activities[key] = activity;
    if (key !== type) {
      activities[type] = activity;
    }
  }
  return activities[type] || activity;
};

const ensureActivityRegistered = async (type) => {
  if (!type) {
    return null;
  }

  if (activities[type]) {
    return activities[type];
  }

  if (pendingActivityLoads.has(type)) {
    const existing = await pendingActivityLoads.get(type);
    return existing || activities[type] || null;
  }

  const loader = lazyActivityLoaders[type];
  if (!loader) {
    return activities[type] || null;
  }

  const loadPromise = (async () => {
    try {
      const loaded = await loader();
      return registerActivity(type, loaded);
    } catch (error) {
      console.error(`Unable to load activity module "${type}"`, error);
      return null;
    } finally {
      pendingActivityLoads.delete(type);
    }
  })();

  pendingActivityLoads.set(type, loadPromise);
  return loadPromise;
};

const elements = {
  tabs: Array.from(document.querySelectorAll('.activity-tab')),
  titleInput: document.getElementById('titleInput'),
  descriptionInput: document.getElementById('descriptionInput'),
  editorContent: document.getElementById('editorContent'),
  previewArea: document.getElementById('previewArea'),
  loadTemplateBtn: document.getElementById('loadTemplateBtn'),
  loadExampleBtn: document.getElementById('loadExampleBtn'),
  saveProjectBtn: document.getElementById('saveProjectBtn'),
  loadProjectBtn: document.getElementById('loadProjectBtn'),
  deleteProjectBtn: document.getElementById('deleteProjectBtn'),
  newProjectBtn: document.getElementById('newProjectBtn'),
  savedProjects: document.getElementById('savedProjects'),
  copyEmbedBtn: document.getElementById('copyEmbedBtn'),
  showEmbedBtn: document.getElementById('showEmbedBtn'),
  closeEmbedModalBtn: document.getElementById('closeEmbedModalBtn'),
  embedSnippet: document.getElementById('embedSnippet'),
  embedModal: document.getElementById('embedModal'),
  embedModalDialog: document.getElementById('embedModalDialog'),
  statusToast: document.getElementById('statusToast'),
  animationToggle: document.getElementById('animationToggle'),
  appMain: document.querySelector('.app-main'),
  previewToggleButtons: Array.from(document.querySelectorAll('[data-preview-toggle]'))
};

const focusableModalSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

const modalState = {
  lastFocusedElement: null
};

let previewHidden = false;

const isElementVisible = (element) => {
  if (!element) return false;
  if (element.disabled || element.getAttribute('aria-hidden') === 'true') {
    return false;
  }

  if (element.offsetParent) {
    return true;
  }

  if (typeof element.getBoundingClientRect === 'function') {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  return true;
};

const getFocusableElements = (container) => {
  if (!container) return [];
  return Array.from(container.querySelectorAll(focusableModalSelector)).filter((element) =>
    isElementVisible(element)
  );
};

const focusElement = (element) => {
  if (!element || typeof element.focus !== 'function') {
    return;
  }
  try {
    element.focus({ preventScroll: true });
  } catch (error) {
    element.focus();
  }
};

const getActiveActivity = () => {
  const activity = activities[state.type];
  if (activity) {
    return activity;
  }
  state.type = defaultActivityId;
  return activities[state.type];
};

const showStatus = (message, tone = 'info') => {
  if (!elements.statusToast) return;
  elements.statusToast.textContent = message;
  elements.statusToast.dataset.tone = tone;
  elements.statusToast.classList.add('visible');
  setTimeout(() => {
    const toast = elements.statusToast;
    if (toast) {
      toast.classList.remove('visible');
    }
  }, 2600);
};

const updateActivityTabs = () => {
  elements.tabs.forEach((tab) => {
    const isActive = tab.dataset.activity === state.type;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
    tab.setAttribute('tabindex', isActive ? '0' : '-1');
  });
};

const refreshEmbed = () => {
  try {
    const embed = generateEmbed({
      id: state.id,
      type: state.type,
      title: state.title,
      description: state.description,
      data: state.data
    });
    if (elements.embedSnippet) {
      elements.embedSnippet.value = embed;
    }
  } catch (error) {
    console.error(error);
    if (elements.embedSnippet) {
      elements.embedSnippet.value = 'Unable to generate embed code. Check your content.';
    }
  }
};

const refreshPreview = () => {
  const activity = getActiveActivity();
  if (!activity) return;
  const shouldPlayAnimations = elements.animationToggle ? elements.animationToggle.checked : true;
  activity.renderPreview(elements.previewArea, state.data, {
    playAnimations: shouldPlayAnimations
  });
};

const updatePreviewToggleButtons = () => {
  if (!Array.isArray(elements.previewToggleButtons)) {
    return;
  }
  const label = previewHidden ? 'Show preview' : 'Hide preview';
  const ariaLabel = previewHidden ? 'Show live preview panel' : 'Hide live preview panel';
  elements.previewToggleButtons.forEach((button) => {
    if (!button) return;
    button.textContent = label;
    button.setAttribute('aria-pressed', previewHidden ? 'true' : 'false');
    button.setAttribute('aria-label', ariaLabel);
  });
};

const setPreviewHidden = (hidden) => {
  previewHidden = hidden;
  if (elements.appMain) {
    elements.appMain.classList.toggle('preview-hidden', previewHidden);
  }
  updatePreviewToggleButtons();
  if (!previewHidden) {
    refreshPreview();
  }
};

updatePreviewToggleButtons();

const rebuildEditor = () => {
  const activity = getActiveActivity();
  if (!activity) return;
  elements.editorContent.innerHTML = '';
  activity.buildEditor(elements.editorContent, clone(state.data), (newData) => {
    state.data = newData;
    refreshPreview();
    refreshEmbed();
  });
};

const refreshActivityView = () => {
  updateActivityTabs();
  rebuildEditor();
  refreshPreview();
  refreshEmbed();
};

const setProjectControlsDisabled = (disabled) => {
  elements.savedProjects.disabled = disabled;
  elements.loadProjectBtn.disabled = disabled;
  elements.deleteProjectBtn.disabled = disabled;
};

const refreshSavedProjects = async (selectedId = state.id) => {
  if (!elements.savedProjects) return;

  elements.savedProjects.innerHTML = '';
  const loadingOption = document.createElement('option');
  loadingOption.textContent = 'Loading saved activities…';
  loadingOption.value = '';
  loadingOption.disabled = true;
  loadingOption.selected = true;
  elements.savedProjects.append(loadingOption);
  setProjectControlsDisabled(true);

  try {
    const projects = await listProjects();
    elements.savedProjects.innerHTML = '';

    if (!projects.length) {
      const option = document.createElement('option');
      option.textContent = 'No saved activities yet';
      option.value = '';
      option.disabled = true;
      option.selected = true;
      elements.savedProjects.append(option);
      return;
    }

    projects.forEach((project) => {
      const option = document.createElement('option');
      option.value = project.id;
      const updated = project.updatedAt ? new Date(project.updatedAt) : null;
      const timestamp = updated ? formatDate(updated) : 'Recently saved';
      option.textContent = `${project.title || 'Untitled'} • ${timestamp}`;
      elements.savedProjects.append(option);
    });

    if (selectedId && projects.some((project) => project.id === selectedId)) {
      elements.savedProjects.value = selectedId;
    } else {
      elements.savedProjects.selectedIndex = 0;
    }

    setProjectControlsDisabled(false);
  } catch (error) {
    console.error('Unable to load saved activities', error);
    elements.savedProjects.innerHTML = '';
    const option = document.createElement('option');
    option.textContent = 'Unable to load activities';
    option.value = '';
    option.disabled = true;
    option.selected = true;
    elements.savedProjects.append(option);
    showStatus('Unable to load saved activities right now.', 'warning');
  }
};

const loadTemplate = async () => {
  const activity = await ensureActivityRegistered(state.type);
  if (!activity) {
    showStatus('Unable to load this template right now. Try refreshing the page.', 'warning');
    return;
  }
  state.data = clone(activity.template());
  refreshActivityView();
};

const loadExample = async () => {
  const activity = await ensureActivityRegistered(state.type);
  if (!activity) {
    showStatus('Unable to load this example right now. Try refreshing the page.', 'warning');
    return;
  }
  state.data = clone(activity.example());
  refreshActivityView();
};

const resetProject = async ({ refreshList = false, silent = false } = {}) => {
  let activity = await ensureActivityRegistered(state.type);
  if (!activity) {
    state.type = defaultActivityId;
    activity = await ensureActivityRegistered(state.type);
  }
  state.id = null;
  state.title = '';
  state.description = '';
  state.data = clone((activity || getActiveActivity()).template());
  elements.titleInput.value = '';
  elements.descriptionInput.value = '';
  refreshActivityView();
  if (refreshList) {
    await refreshSavedProjects();
  }
  if (!silent) {
    showStatus('New activity started');
  }
};

const handleSaveProject = async () => {
  if (!state.title.trim()) {
    showStatus('Add an activity title before saving.', 'warning');
    elements.titleInput.focus();
    return;
  }

  const project = {
    id: state.id === null || state.id === undefined ? uid('project') : state.id,
    title: state.title.trim(),
    description: state.description.trim(),
    type: state.type,
    data: state.data
  };

  elements.saveProjectBtn.disabled = true;
  try {
    const saved = await saveProject(project);
    state.id = saved.id;
    await refreshSavedProjects(saved.id);
    elements.savedProjects.value = saved.id;
    showStatus('Activity saved');
  } catch (error) {
    console.error('Unable to save activity', error);
    let message = 'Unable to save this activity right now.';
    if (error) {
      if (error.code === 'permission-denied') {
        message = 'Update your Firestore rules or enable anonymous auth to save activities.';
      } else if (error.code === 'auth/operation-not-allowed') {
        message = 'Enable anonymous auth in Firebase to save your activities.';
      } else if (typeof error.message === 'string') {
        if (error.message.indexOf('Enable anonymous authentication') !== -1) {
          message = 'Enable anonymous auth in Firebase or adjust Firestore rules to allow saving.';
        }
      }
    }
    showStatus(message, 'warning');
  } finally {
    elements.saveProjectBtn.disabled = false;
  }
};

const handleLoadProject = async () => {
  const projectId = elements.savedProjects.value;
  if (!projectId) {
    showStatus('Select a saved activity to load.', 'warning');
    return;
  }

  elements.loadProjectBtn.disabled = true;
  try {
    const project = await getProject(projectId);
    if (!project) {
      showStatus('Could not load the selected activity.', 'warning');
      return;
    }

    let nextType = project.type;
    let activity = await ensureActivityRegistered(nextType);
    if (!activity) {
      showStatus('This activity type is no longer available. Loaded the default template instead.', 'warning');
      nextType = defaultActivityId;
      activity = await ensureActivityRegistered(nextType);
    }

    state.type = nextType;
    const template = activity ? activity.template() : getActiveActivity().template();
    state.data = project.data ? clone(project.data) : clone(template);

    state.id = project.id;
    state.title = project.title || '';
    state.description = project.description || '';
    elements.titleInput.value = state.title;
    elements.descriptionInput.value = state.description;
    refreshActivityView();
    showStatus('Activity loaded');
  } catch (error) {
    console.error('Unable to load activity', error);
    showStatus('Unable to load this activity right now.', 'warning');
  } finally {
    elements.loadProjectBtn.disabled = false;
  }
};

const handleDeleteProject = async () => {
  const projectId = elements.savedProjects.value;
  if (!projectId) {
    showStatus('Select an activity to delete.', 'warning');
    return;
  }

  elements.deleteProjectBtn.disabled = true;
  try {
    await deleteProject(projectId);
    if (state.id === projectId) {
      await resetProject({ refreshList: true, silent: true });
    } else {
      await refreshSavedProjects();
    }
    showStatus('Activity deleted', 'warning');
  } catch (error) {
    console.error('Unable to delete activity', error);
    showStatus('Unable to delete this activity right now.', 'warning');
  } finally {
    elements.deleteProjectBtn.disabled = false;
  }
};

const copyToClipboard = async (value) => {
  try {
    await navigator.clipboard.writeText(value);
    showStatus('Embed code copied to clipboard');
  } catch (error) {
    console.warn('Clipboard API failed, falling back to selection.', error);
    const helper = document.createElement('textarea');
    helper.value = value;
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.append(helper);
    helper.select();
    document.execCommand('copy');
    helper.remove();
    showStatus('Embed code copied');
  }
};

const setEmbedModalOpen = (open) => {
  if (!elements.embedModal) {
    return;
  }

  const currentState = elements.embedModal.dataset.open === 'true';
  if (open === currentState) {
    return;
  }

  const nextState = open ? 'true' : 'false';
  elements.embedModal.dataset.open = nextState;
  elements.embedModal.setAttribute('aria-hidden', open ? 'false' : 'true');

  if (elements.showEmbedBtn) {
    elements.showEmbedBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  if (open) {
    modalState.lastFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (document.body) {
      document.body.classList.add('modal-open');
    }

    const dialog = elements.embedModalDialog || elements.embedModal;
    const focusable = getFocusableElements(dialog);
    const target = focusable.length ? focusable[0] : dialog;

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        focusElement(target);
      });
    } else {
      focusElement(target);
    }
  } else {
    if (document.body) {
      document.body.classList.remove('modal-open');
    }

    const returnTarget =
      modalState.lastFocusedElement && document.contains(modalState.lastFocusedElement)
        ? modalState.lastFocusedElement
        : elements.showEmbedBtn;

    modalState.lastFocusedElement = null;

    if (returnTarget) {
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => {
          focusElement(returnTarget);
        });
      } else {
        focusElement(returnTarget);
      }
    }
  }
};

const handleEmbedModalKeydown = (event) => {
  if (!elements.embedModal || elements.embedModal.dataset.open !== 'true') {
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    setEmbedModalOpen(false);
    return;
  }

  if (event.key !== 'Tab') {
    return;
  }

  const dialog = elements.embedModalDialog || elements.embedModal;
  const focusable = getFocusableElements(dialog);

  if (!focusable.length) {
    event.preventDefault();
    focusElement(dialog);
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const activeElement = document.activeElement;
  const focusIsInside = activeElement && dialog.contains(activeElement);

  if (event.shiftKey) {
    if (!focusIsInside || activeElement === first) {
      event.preventDefault();
      focusElement(last);
    }
    return;
  }

  if (!focusIsInside || activeElement === last) {
    event.preventDefault();
    focusElement(first);
  }
};

const openEmbedModal = () => {
  refreshEmbed();
  setEmbedModalOpen(true);
};

const closeEmbedModal = () => {
  setEmbedModalOpen(false);
};

const bindEvents = () => {
  elements.tabs.forEach((tab) => {
    tab.addEventListener('click', async () => {
      const newType = tab.dataset.activity;
      if (!newType || state.type === newType) return;
      tab.disabled = true;
      tab.dataset.loading = 'true';
      try {
        const activity = await ensureActivityRegistered(newType);
        if (!activity) {
          showStatus('Unable to load that activity right now. Try refreshing the page.', 'warning');
          return;
        }

        state.type = newType;
        state.id = null;
        state.title = '';
        state.description = '';
        state.data = clone(activity.template());
        elements.titleInput.value = '';
        elements.descriptionInput.value = '';
        refreshActivityView();
        elements.titleInput.focus();
        showStatus(`${activity.label} template loaded`);
      } catch (error) {
        console.error(error);
        showStatus('Something went wrong while switching activities.', 'warning');
      } finally {
        tab.disabled = false;
        delete tab.dataset.loading;
      }
    });
  });

  elements.titleInput.addEventListener('input', (event) => {
    state.title = event.target.value;
    refreshEmbed();
  });

  elements.descriptionInput.addEventListener('input', (event) => {
    state.description = event.target.value;
    refreshEmbed();
  });

  elements.loadTemplateBtn.addEventListener('click', () => {
    loadTemplate().catch((error) => {
      console.error(error);
    });
  });
  elements.loadExampleBtn.addEventListener('click', () => {
    loadExample().catch((error) => {
      console.error(error);
    });
  });
  elements.saveProjectBtn.addEventListener('click', () => {
    handleSaveProject().catch((error) => {
      console.error(error);
    });
  });
  elements.loadProjectBtn.addEventListener('click', () => {
    handleLoadProject().catch((error) => {
      console.error(error);
    });
  });
  elements.deleteProjectBtn.addEventListener('click', () => {
    handleDeleteProject().catch((error) => {
      console.error(error);
    });
  });
  elements.newProjectBtn.addEventListener('click', () => {
    resetProject().catch((error) => {
      console.error(error);
    });
  });

  if (elements.copyEmbedBtn) {
    elements.copyEmbedBtn.addEventListener('click', () => {
      if (!elements.embedSnippet) {
        return;
      }
      copyToClipboard(elements.embedSnippet.value);
    });
  }

  if (elements.showEmbedBtn) {
    elements.showEmbedBtn.addEventListener('click', openEmbedModal);
  }

  if (elements.closeEmbedModalBtn) {
    elements.closeEmbedModalBtn.addEventListener('click', closeEmbedModal);
  }

  if (elements.embedModal) {
    elements.embedModal.addEventListener('keydown', handleEmbedModalKeydown);
    elements.embedModal.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      if (target.dataset.modalDismiss === 'true' || target === elements.embedModal) {
        closeEmbedModal();
      }
    });
  }

  if (elements.animationToggle) {
    elements.animationToggle.addEventListener('change', () => {
      refreshPreview();
    });
  }

  if (Array.isArray(elements.previewToggleButtons)) {
    elements.previewToggleButtons.forEach((button) => {
      if (!button) return;
      button.addEventListener('click', () => {
        setPreviewHidden(!previewHidden);
      });
    });
  }
};

const init = async () => {
  await ensureActivityRegistered(state.type);
  refreshActivityView();
  elements.titleInput.value = state.title;
  elements.descriptionInput.value = state.description;
  bindEvents();
  setEmbedModalOpen(false);
  await refreshSavedProjects();
  showStatus('Ready to create!');
};

init().catch((error) => {
  console.error('Failed to initialise the app', error);
  showStatus('Something went wrong while starting the app.', 'warning');
});
