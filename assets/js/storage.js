import { clone } from './utils.js';
import { db } from './firebaseClient.js';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const COLLECTION_KEY = 'projects';
const STORAGE_KEY = 'canvasDesignerStudio.projects.v1';
const DELETION_KEY = 'canvasDesignerStudio.projects.deleted.v1';
const UPDATE_KEY = 'canvasDesignerStudio.projects.updated.v1';

const projectsCollection = collection(db, COLLECTION_KEY);

let persistenceMode = 'cloud';
let isSyncingLocal = false;

const safeTimestamp = (value) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

const dispatchModeChange = (mode) => {
  if (persistenceMode === mode) return;
  persistenceMode = mode;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('storage-mode-changed', {
        detail: { mode }
      })
    );
  }
};

const normalizeProject = (docSnapshot) => {
  const data = docSnapshot.data();
  if (!data) return null;
  const record = {
    id: data.id || docSnapshot.id,
    title: data.title || '',
    description: data.description || '',
    type: data.type,
    data: data.data,
    updatedAt: data.updatedAt || data.createdAt || null,
    createdAt: data.createdAt || null
  };
  return record.id ? record : null;
};

const readLocalProjects = () => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.id === 'string');
  } catch (error) {
    console.warn('Unable to read local activities', error);
    return [];
  }
};

const writeLocalProjects = (projects) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.warn('Unable to save activities locally', error);
  }
};

const readPendingDeletes = () => {
  try {
    const value = localStorage.getItem(DELETION_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id) => typeof id === 'string');
  } catch (error) {
    console.warn('Unable to read pending deletions', error);
    return [];
  }
};

const writePendingDeletes = (ids) => {
  try {
    if (!ids.length) {
      localStorage.removeItem(DELETION_KEY);
    } else {
      localStorage.setItem(DELETION_KEY, JSON.stringify(ids));
    }
  } catch (error) {
    console.warn('Unable to persist pending deletions', error);
  }
};

const enqueueDelete = (projectId) => {
  const queue = readPendingDeletes();
  if (queue.includes(projectId)) return;
  queue.push(projectId);
  writePendingDeletes(queue);
};

const clearPendingDelete = (projectId) => {
  const queue = readPendingDeletes();
  const filtered = queue.filter((id) => id !== projectId);
  if (filtered.length !== queue.length) {
    writePendingDeletes(filtered);
  }
};

const readPendingUpdates = () => {
  try {
    const value = localStorage.getItem(UPDATE_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id) => typeof id === 'string');
  } catch (error) {
    console.warn('Unable to read pending updates', error);
    return [];
  }
};

const writePendingUpdates = (ids) => {
  try {
    if (!ids.length) {
      localStorage.removeItem(UPDATE_KEY);
    } else {
      localStorage.setItem(UPDATE_KEY, JSON.stringify(ids));
    }
  } catch (error) {
    console.warn('Unable to persist pending updates', error);
  }
};

const enqueueUpdate = (projectId) => {
  const queue = readPendingUpdates();
  if (queue.includes(projectId)) return;
  queue.push(projectId);
  writePendingUpdates(queue);
};

const clearPendingUpdate = (projectId) => {
  const queue = readPendingUpdates();
  const filtered = queue.filter((id) => id !== projectId);
  if (filtered.length !== queue.length) {
    writePendingUpdates(filtered);
  }
};

const replaceLocalProjects = (projects) => {
  writeLocalProjects(projects.map((project) => clone(project)));
};

const mergeLocalProjects = (projects) => {
  if (!projects?.length) return;
  const current = readLocalProjects();
  const map = new Map(current.map((project) => [project.id, project]));
  projects.forEach((project) => {
    if (!project?.id) return;
    const incoming = clone(project);
    const existing = map.get(incoming.id);
    const existingTime = existing ? safeTimestamp(existing.updatedAt) : 0;
    const incomingTime = safeTimestamp(incoming.updatedAt);
    if (!existing || incomingTime >= existingTime) {
      map.set(incoming.id, incoming);
    }
  });
  writeLocalProjects(Array.from(map.values()));
};

const pruneLocalProjects = (remoteIds) => {
  const allowedIds = new Set(remoteIds);
  const pendingUpdates = new Set(readPendingUpdates());
  const pendingDeletes = new Set(readPendingDeletes());
  const filtered = readLocalProjects().filter((project) => {
    if (!project?.id) return false;
    if (pendingUpdates.has(project.id)) return true;
    if (pendingDeletes.has(project.id)) return false;
    return allowedIds.has(project.id);
  });
  writeLocalProjects(filtered);
};

const listLocalProjects = () => {
  return readLocalProjects()
    .map((project) => clone(project))
    .sort((a, b) => safeTimestamp(b.updatedAt) - safeTimestamp(a.updatedAt));
};

const stampProject = (project) => {
  const value = clone(project);
  const timestamp = new Date().toISOString();
  value.updatedAt = timestamp;
  if (!value.createdAt) {
    value.createdAt = timestamp;
  }
  return value;
};

const saveLocalProject = (project, { stamp = true, recordUpdate = false } = {}) => {
  const value = stamp ? stampProject(project) : clone(project);
  mergeLocalProjects([value]);
  clearPendingDelete(value.id);
  if (recordUpdate) {
    enqueueUpdate(value.id);
  } else {
    clearPendingUpdate(value.id);
  }
  return clone(value);
};

const deleteLocalProject = (projectId, { recordDeletion = false } = {}) => {
  const remaining = readLocalProjects().filter((item) => item.id !== projectId);
  writeLocalProjects(remaining);
  if (recordDeletion) {
    enqueueDelete(projectId);
  } else {
    clearPendingDelete(projectId);
  }
  clearPendingUpdate(projectId);
};

const getLocalProject = (projectId) => {
  const project = readLocalProjects().find((item) => item.id === projectId);
  return project ? clone(project) : null;
};

const syncLocalProjectsToCloud = async () => {
  if (isSyncingLocal) return;
  const pendingUpdates = readPendingUpdates();
  const pendingDeletes = readPendingDeletes();
  if (!pendingUpdates.length && !pendingDeletes.length) {
    return;
  }
  isSyncingLocal = true;
  try {
    const localProjects = readLocalProjects();
    const projectMap = new Map(localProjects.map((project) => [project.id, project]));
    const remainingUpdates = [];
    for (const projectId of pendingUpdates) {
      const project = projectMap.get(projectId);
      if (!project) {
        continue;
      }
      try {
        await setDoc(doc(projectsCollection, projectId), project);
      } catch (error) {
        console.warn(`Unable to sync activity ${projectId}`, error);
        remainingUpdates.push(projectId);
      }
    }
    const remainingDeletes = [];
    for (const projectId of pendingDeletes) {
      try {
        await deleteDoc(doc(projectsCollection, projectId));
      } catch (error) {
        console.warn(`Unable to sync delete for activity ${projectId}`, error);
        remainingDeletes.push(projectId);
      }
    }
    writePendingUpdates(remainingUpdates);
    writePendingDeletes(remainingDeletes);
  } catch (error) {
    console.warn('Unable to sync local activities to cloud', error);
    throw error;
  } finally {
    isSyncingLocal = false;
  }
};

const withCloudFallback = async (operation, fallback, { syncOnSuccess = false } = {}) => {
  const wasLocal = persistenceMode === 'local';
  try {
    const result = await operation({ wasLocal });
    if (syncOnSuccess && wasLocal) {
      try {
        await syncLocalProjectsToCloud();
      } catch (syncError) {
        console.warn('Failed to sync offline changes to cloud', syncError);
      }
    }
    dispatchModeChange('cloud');
    return result;
  } catch (error) {
    if (persistenceMode !== 'local') {
      console.warn('Cloud persistence unavailable, using local storage instead.', error);
    }
    dispatchModeChange('local');
    return fallback();
  }
};

export const listProjects = async () => {
  return withCloudFallback(
    async ({ wasLocal }) => {
      const snapshot = await getDocs(projectsCollection);
      const remoteProjects = snapshot.docs
        .map((docSnapshot) => normalizeProject(docSnapshot))
        .filter(Boolean)
        .sort((a, b) => safeTimestamp(b.updatedAt) - safeTimestamp(a.updatedAt));
      if (wasLocal) {
        mergeLocalProjects(remoteProjects);
        pruneLocalProjects(remoteProjects.map((project) => project.id));
        return listLocalProjects();
      }
      replaceLocalProjects(remoteProjects);
      return remoteProjects.map((project) => clone(project));
    },
    async () => listLocalProjects(),
    { syncOnSuccess: true }
  );
};

export const saveProject = async (project) => {
  const stamped = stampProject(project);
  return withCloudFallback(
    async () => {
      await setDoc(doc(projectsCollection, stamped.id), stamped);
      saveLocalProject(stamped, { stamp: false });
      return clone(stamped);
    },
    async () => saveLocalProject(project, { stamp: true, recordUpdate: true }),
    { syncOnSuccess: true }
  );
};

export const deleteProject = async (projectId) => {
  return withCloudFallback(
    async () => {
      await deleteDoc(doc(projectsCollection, projectId));
      deleteLocalProject(projectId);
    },
    async () => {
      deleteLocalProject(projectId, { recordDeletion: true });
    },
    { syncOnSuccess: true }
  );
};

export const getProject = async (projectId) => {
  return withCloudFallback(
    async () => {
      const snapshot = await getDoc(doc(projectsCollection, projectId));
      if (!snapshot.exists()) {
        deleteLocalProject(projectId);
        return null;
      }
      const project = normalizeProject(snapshot);
      if (!project) {
        deleteLocalProject(projectId);
        return null;
      }
      saveLocalProject(project, { stamp: false });
      return clone(project);
    },
    async () => getLocalProject(projectId),
    { syncOnSuccess: true }
  );
};

export const getPersistenceMode = () => persistenceMode;
