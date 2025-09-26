import { activities, defaultActivityId } from './activities/index.js';
import { clone, formatDate, uid } from './utils.js';
import { listProjects, saveProject, deleteProject, getProject } from './storage.js';
import { generateEmbed } from './embed.js';

const PREVIEW_ERROR_TEMPLATE = `
  <div class="preview-placeholder preview-error" role="alert" aria-live="assertive">
    <strong>Unable to render preview</strong>
    <span>Check your activity content and try again.</span>
  </div>
`;

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
  const previewHost = elements.previewArea;
  if (!activity || !previewHost) return;
  try {
    activity.renderPreview(previewHost, state.data, {
      playAnimations: elements.animationToggle?.checked
    });
  } catch (error) {
    console.error('Unable to render preview', error);
    previewHost.innerHTML = PREVIEW_ERROR_TEMPLATE;
  }
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

const refreshSavedProjects = () => {
  const projects = listProjects();
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
    const updated = project.updatedAt ? new Date(project.updatedAt) : new Date();
    option.textContent = `${project.title || 'Untitled'} • ${formatDate(updated)}`;
    elements.savedProjects.append(option);
  });

  if (state.id) {
    elements.savedProjects.value = state.id;
  } else {
    elements.savedProjects.selectedIndex = 0;
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

const resetProject = () => {
  state.id = null;
  state.title = '';
  state.description = '';
  state.data = clone(getActiveActivity().template());
  elements.titleInput.value = '';
  elements.descriptionInput.value = '';
  refreshAll();
  showStatus('New activity started');
};

const refreshAll = () => {
  updateActivityTabs();
  rebuildEditor();
  refreshPreview();
  refreshEmbed();
  refreshSavedProjects();
};

const handleSaveProject = () => {
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

  const saved = saveProject(project);
  state.id = saved.id;
  showStatus('Activity saved');
  refreshSavedProjects();
  elements.savedProjects.value = saved.id;
};

const handleLoadProject = () => {
  const projectId = elements.savedProjects.value;
  if (!projectId) {
    showStatus('Select a saved activity to load.', 'warning');
    return;
  }
  const project = getProject(projectId);
  if (!project) {
    showStatus('Could not load the selected activity.', 'warning');
    return;
  }
  state.id = project.id;
  state.type = project.type;
  state.title = project.title || '';
  state.description = project.description || '';
  state.data = project.data ? clone(project.data) : clone(getActiveActivity().template());
  elements.titleInput.value = state.title;
  elements.descriptionInput.value = state.description;
  refreshAll();
  showStatus('Activity loaded');
};

const handleDeleteProject = () => {
  const projectId = elements.savedProjects.value;
  if (!projectId) {
    showStatus('Select an activity to delete.', 'warning');
    return;
  }
  deleteProject(projectId);
  if (state.id === projectId) {
    resetProject();
  }
  refreshSavedProjects();
  showStatus('Activity deleted', 'warning');
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
    tab.addEventListener('click', () => {
      const newType = tab.dataset.activity;
      if (state.type === newType) return;
      state.type = newType;
      state.id = null;
      state.data = clone(getActiveActivity().template());
      refreshAll();
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
  elements.saveProjectBtn.addEventListener('click', handleSaveProject);
  elements.loadProjectBtn.addEventListener('click', handleLoadProject);
  elements.deleteProjectBtn.addEventListener('click', handleDeleteProject);
  elements.newProjectBtn.addEventListener('click', resetProject);

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

const init = () => {
  updateActivityTabs();
  elements.titleInput.value = state.title;
  elements.descriptionInput.value = state.description;
  refreshAll();
  bindEvents();
  showStatus('Ready to create!');
};

init();
