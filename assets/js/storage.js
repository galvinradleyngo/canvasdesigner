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

const projectsCollection = collection(db, COLLECTION_KEY);

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

export const listProjects = async () => {
  try {
    const snapshot = await getDocs(projectsCollection);
    const projects = snapshot.docs
      .map((docSnapshot) => normalizeProject(docSnapshot))
      .filter(Boolean);
    return projects.sort((a, b) => {
      const left = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const right = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return right - left;
    });
  } catch (error) {
    console.warn('Unable to read saved activities', error);
    throw error;
  }
};

export const saveProject = async (project) => {
  const value = clone(project);
  const timestamp = new Date().toISOString();
  value.updatedAt = timestamp;
  if (!value.createdAt) {
    value.createdAt = timestamp;
  }

  try {
    await setDoc(doc(projectsCollection, value.id), value);
    return value;
  } catch (error) {
    console.warn('Unable to save activity', error);
    throw error;
  }
};

export const deleteProject = async (projectId) => {
  try {
    await deleteDoc(doc(projectsCollection, projectId));
  } catch (error) {
    console.warn('Unable to delete activity', error);
    throw error;
  }
};

export const getProject = async (projectId) => {
  try {
    const snapshot = await getDoc(doc(projectsCollection, projectId));
    if (!snapshot.exists()) {
      return null;
    }
    const project = normalizeProject(snapshot);
    return project ? clone(project) : null;
  } catch (error) {
    console.warn('Unable to fetch activity', error);
    throw error;
  }
};
