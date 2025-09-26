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
  animationToggle: document.getElementById('animationToggle'),
  statusToast: document.getElementById('statusToast')
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
    elements.statusToast?.classList.remove('visible');
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
    playAnimations: elements.animationToggle?.checked
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

const loadTemplate = () => {
  state.data = clone(getActiveActivity().template());
  refreshActivityView();
};

const loadExample = () => {
  state.data = clone(getActiveActivity().example());
  refreshActivityView();
};

const resetProject = async ({ refreshList = false, silent = false } = {}) => {
  state.id = null;
  state.title = '';
  state.description = '';
  state.data = clone(getActiveActivity().template());
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
    id: state.id ?? uid('project'),
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
    showStatus('Unable to save this activity right now.', 'warning');
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

    if (!activities[project.type]) {
      showStatus('This activity type is no longer available. Loaded the default template instead.', 'warning');
      state.type = defaultActivityId;
      state.data = clone(getActiveActivity().template());
    } else {
      state.type = project.type;
      state.data = project.data ? clone(project.data) : clone(getActiveActivity().template());
    }

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

const bindEvents = () => {
  elements.tabs.forEach((tab) => {
    tab.addEventListener('click', async () => {
      const newType = tab.dataset.activity;
      if (!activities[newType] || state.type === newType) return;
      state.type = newType;
      state.id = null;
      state.title = '';
      state.description = '';
      state.data = clone(getActiveActivity().template());
      elements.titleInput.value = '';
      elements.descriptionInput.value = '';
      refreshActivityView();
      elements.titleInput.focus();
      showStatus(`${getActiveActivity().label} template loaded`);
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
  refreshActivityView();
  elements.titleInput.value = state.title;
  elements.descriptionInput.value = state.description;
  bindEvents();
  await refreshSavedProjects();
  showStatus('Ready to create!');
};

init().catch((error) => {
  console.error('Failed to initialise the app', error);
  showStatus('Something went wrong while starting the app.', 'warning');
});
