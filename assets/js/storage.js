import { clone } from './utils.js';

const STORAGE_KEY = 'canvasDesignerStudio.projects.v1';

const readStore = () => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.warn('Unable to read saved activities', error);
    return [];
  }
};

const writeStore = (projects) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.warn('Unable to save activities', error);
  }
};

export const listProjects = () => {
  return readStore().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
};

export const saveProject = (project) => {
  const projects = readStore();
  const index = projects.findIndex((item) => item.id === project.id);
  const value = clone(project);
  value.updatedAt = new Date().toISOString();
  if (index >= 0) {
    projects[index] = value;
  } else {
    projects.push(value);
  }
  writeStore(projects);
  return value;
};

export const deleteProject = (projectId) => {
  const projects = readStore();
  const filtered = projects.filter((item) => item.id !== projectId);
  writeStore(filtered);
  return filtered;
};

export const getProject = (projectId) => {
  return readStore().find((item) => item.id === projectId) || null;
};
