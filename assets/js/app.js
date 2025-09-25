import { activities, defaultActivityId } from './activities/index.js';
import { clone, formatDate, uid } from './utils.js';
import {
  listProjects,
  saveProject,
  deleteProject,
  getProject,
  getPersistenceMode
} from './storage.js';
import { generateEmbed } from './embed.js';

const state = {
  id: null,
  type: defaultActivityId,
  title: '',
  description: '',
  data: clone(activities[defaultActivityId].template())
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
  copyEmbedInlineBtn: document.getElementById('copyEmbedInlineBtn'),
  showEmbedBtn: document.getElementById('showEmbedBtn'),
  embedSnippet: document.getElementById('embedSnippet'),
  embedDialog: document.getElementById('embedDialog'),
  embedOutput: document.getElementById('embedOutput'),
  dialogCopyBtn: document.getElementById('dialogCopyBtn'),
  loadProjectSelect: document.getElementById('savedProjects'),
  animationToggle: document.getElementById('animationToggle'),
  statusToast: document.getElementById('statusToast')
};

const getActiveActivity = () => activities[state.type];

const showStatus = (message, tone = 'info') => {
  if (!elements.statusToast) return;
  elements.statusToast.textContent = message;
  elements.statusToast.dataset.tone = tone;
  elements.statusToast.classList.add('visible');
  setTimeout(() => {
    elements.statusToast?.classList.remove('visible');
  }, 2600);
};

const withButtonState = async (button, busyLabel, callback) => {
  if (!button) {
    return callback();
  }
  const originalLabel = button.textContent;
  button.disabled = true;
  if (busyLabel) {
    button.textContent = busyLabel;
  }
  try {
    return await callback();
  } finally {
    button.disabled = false;
    if (busyLabel) {
      button.textContent = originalLabel;
    }
  }
};

const setProjectControlsDisabled = (isDisabled) => {
  elements.savedProjects.disabled = isDisabled;
  elements.loadProjectBtn.disabled = isDisabled;
  elements.deleteProjectBtn.disabled = isDisabled;
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
      type: state.type,
      title: state.title,
      description: state.description,
      data: state.data
    });
    elements.embedSnippet.value = embed;
    elements.embedOutput.value = embed;
  } catch (error) {
    console.error(error);
    elements.embedSnippet.value = 'Unable to generate embed code. Check your content.';
  }
};

const refreshPreview = () => {
  const activity = getActiveActivity();
  if (!activity) return;
  activity.renderPreview(elements.previewArea, state.data, {
    playAnimations: elements.animationToggle.checked
  });
};

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

const refreshSavedProjects = async () => {
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
      return [];
    }

    projects.forEach((project) => {
      const option = document.createElement('option');
      option.value = project.id;
      const updated = project.updatedAt ? new Date(project.updatedAt) : new Date();
      option.textContent = `${project.title || 'Untitled'} • ${formatDate(updated)}`;
      elements.savedProjects.append(option);
    });

    const hasMatch = state.id && projects.some((project) => project.id === state.id);
    if (hasMatch) {
      elements.savedProjects.value = state.id;
    } else {
      elements.savedProjects.selectedIndex = 0;
    }

    setProjectControlsDisabled(false);
    return projects;
  } catch (error) {
    console.error('Failed to load saved activities', error);
    elements.savedProjects.innerHTML = '';
    const option = document.createElement('option');
    option.textContent = 'Unable to load saved activities';
    option.value = '';
    option.disabled = true;
    option.selected = true;
    elements.savedProjects.append(option);
    showStatus('Could not load saved activities. Check your connection and try again.', 'warning');
    return null;
  }
};

const loadTemplate = () => {
  state.data = clone(getActiveActivity().template());
  rebuildEditor();
  refreshPreview();
  refreshEmbed();
};

const loadExample = () => {
  state.data = clone(getActiveActivity().example());
  rebuildEditor();
  refreshPreview();
  refreshEmbed();
};

const resetProject = async ({ silent = false } = {}) => {
  state.id = null;
  state.title = '';
  state.description = '';
  state.data = clone(getActiveActivity().template());
  elements.titleInput.value = '';
  elements.descriptionInput.value = '';
  await refreshAll();
  if (!silent) {
    showStatus('New activity started');
  }
};

const refreshAll = async ({ refreshProjects = true } = {}) => {
  updateActivityTabs();
  rebuildEditor();
  refreshPreview();
  refreshEmbed();
  if (refreshProjects) {
    await refreshSavedProjects();
  }
};

const handleSaveProject = async () => {
  if (!state.title.trim()) {
    showStatus('Add an activity title before saving.', 'warning');
    elements.titleInput.focus();
    return;
  }

  const project = {
    id: state.id ?? uid('project'),
    title: state.title.trim(),
    description: state.description.trim(),
    type: state.type,
    data: state.data
  };

  try {
    const saved = await withButtonState(elements.saveProjectBtn, 'Saving…', async () => {
      const record = await saveProject(project);
      return record;
    });
    state.id = saved.id;
    showStatus('Activity saved');
    const projects = await refreshSavedProjects();
    if (projects && projects.some((project) => project.id === saved.id)) {
      elements.savedProjects.value = saved.id;
    }
  } catch (error) {
    console.error('Failed to save activity', error);
    showStatus('Could not save activity. Please try again.', 'warning');
  }
};

const handleLoadProject = async () => {
  const projectId = elements.savedProjects.value;
  if (!projectId) {
    showStatus('Select a saved activity to load.', 'warning');
    return;
  }
  try {
    await withButtonState(elements.loadProjectBtn, 'Loading…', async () => {
      const project = await getProject(projectId);
      if (!project) {
        showStatus('Could not load the selected activity.', 'warning');
        await refreshSavedProjects();
        return;
      }
      state.id = project.id;
      state.type = project.type;
      state.title = project.title || '';
      state.description = project.description || '';
      state.data = project.data ? clone(project.data) : clone(getActiveActivity().template());
      elements.titleInput.value = state.title;
      elements.descriptionInput.value = state.description;
      await refreshAll({ refreshProjects: false });
      const projects = await refreshSavedProjects();
      if (projects && projects.some((item) => item.id === project.id)) {
        elements.savedProjects.value = project.id;
      }
      showStatus('Activity loaded');
    });
  } catch (error) {
    console.error('Failed to load activity', error);
    showStatus('Could not load the selected activity. Please try again.', 'warning');
  }
};

const handleDeleteProject = async () => {
  const projectId = elements.savedProjects.value;
  if (!projectId) {
    showStatus('Select an activity to delete.', 'warning');
    return;
  }
  try {
    await withButtonState(elements.deleteProjectBtn, 'Deleting…', async () => {
      await deleteProject(projectId);
      if (state.id === projectId) {
        await resetProject({ silent: true });
      } else {
        await refreshSavedProjects();
      }
      showStatus('Activity deleted', 'warning');
    });
  } catch (error) {
    console.error('Failed to delete activity', error);
    showStatus('Could not delete the selected activity. Please try again.', 'warning');
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

const bindEvents = () => {
  elements.tabs.forEach((tab) => {
    tab.addEventListener('click', async () => {
      const newType = tab.dataset.activity;
      if (state.type === newType) return;
      state.type = newType;
      state.id = null;
      state.data = clone(getActiveActivity().template());
      try {
        await refreshAll({ refreshProjects: false });
        elements.titleInput.focus();
        showStatus(`${getActiveActivity().label} template loaded`);
      } catch (error) {
        console.error('Failed to switch activity', error);
        showStatus('Could not switch activity. Please refresh and try again.', 'warning');
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

  elements.animationToggle.addEventListener('change', refreshPreview);
  elements.loadTemplateBtn.addEventListener('click', loadTemplate);
  elements.loadExampleBtn.addEventListener('click', loadExample);
  elements.saveProjectBtn.addEventListener('click', () => {
    handleSaveProject();
  });
  elements.loadProjectBtn.addEventListener('click', () => {
    handleLoadProject();
  });
  elements.deleteProjectBtn.addEventListener('click', () => {
    handleDeleteProject();
  });
  elements.newProjectBtn.addEventListener('click', () => {
    resetProject();
  });

  elements.copyEmbedInlineBtn.addEventListener('click', () => {
    copyToClipboard(elements.embedSnippet.value);
  });

  elements.showEmbedBtn.addEventListener('click', () => {
    elements.embedOutput.value = elements.embedSnippet.value;
    elements.embedDialog.showModal();
  });

  elements.dialogCopyBtn.addEventListener('click', () => {
    copyToClipboard(elements.embedOutput.value);
  });

  elements.embedDialog.addEventListener('close', () => {
    elements.embedOutput.value = elements.embedSnippet.value;
  });
};

const init = async () => {
  updateActivityTabs();
  elements.titleInput.value = state.title;
  elements.descriptionInput.value = state.description;
  if (typeof window !== 'undefined') {
    window.addEventListener('storage-mode-changed', (event) => {
      const mode = event.detail?.mode;
      if (mode === 'local') {
        showStatus('Offline mode: saving to this browser until the network returns.', 'warning');
      } else if (mode === 'cloud') {
        showStatus('Cloud saving restored. Activities will sync to Firebase.', 'info');
      }
    });
  }
  await refreshAll();
  if (getPersistenceMode() === 'local') {
    showStatus('Offline mode: saving to this browser until the network returns.', 'warning');
  } else {
    showStatus('Ready to create!');
  }
  bindEvents();
};

init().catch((error) => {
  console.error('Failed to initialize app', error);
  showStatus('Something went wrong while loading. Refresh the page.', 'warning');
});
