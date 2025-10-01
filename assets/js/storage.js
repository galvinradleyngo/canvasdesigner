import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { clone, coalesce } from './utils.js';
import { getFirestoreDb, ensureAuth } from './firebaseClient.js';
import { getActivitiesCollectionName } from './firebaseSettings.js';

const COLLECTION_NAME = getActivitiesCollectionName();

const mapSnapshotToProject = (snapshot) => {
  if (!snapshot) return null;
  const data = snapshot.data();
  if (!data) return null;
  return {
    id: snapshot.id,
    title: coalesce(data.title, ''),
    description: coalesce(data.description, ''),
    type: coalesce(data.type, ''),
    data: coalesce(data.data, {}),
    updatedAt: coalesce(data.updatedAt, null)
  };
};

export const listProjects = async () => {
  await ensureAuth();
  const db = getFirestoreDb();
  const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
  const projects = querySnapshot.docs
    .map(mapSnapshotToProject)
    .filter(Boolean);

  return projects.sort((a, b) => {
    if (!a.updatedAt && !b.updatedAt) return 0;
    if (!a.updatedAt) return 1;
    if (!b.updatedAt) return -1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
};

export const saveProject = async (project) => {
  await ensureAuth();
  const db = getFirestoreDb();
  const value = clone(project);
  const updatedAt = new Date().toISOString();
  const collectionRef = collection(db, COLLECTION_NAME);
  const documentId = value.id || doc(collectionRef).id;
  value.id = documentId;
  const docRef = doc(collectionRef, documentId);
  const payload = {
    title: coalesce(value.title, ''),
    description: coalesce(value.description, ''),
    type: coalesce(value.type, ''),
    data: coalesce(value.data, {}),
    updatedAt
  };

  await setDoc(docRef, payload, { merge: true });

  return { id: documentId, ...payload };
};

export const deleteProject = async (projectId) => {
  await ensureAuth();
  const db = getFirestoreDb();
  const collectionRef = collection(db, COLLECTION_NAME);
  await deleteDoc(doc(collectionRef, projectId));
};

export const getProject = async (projectId) => {
  await ensureAuth();
  const db = getFirestoreDb();
  const collectionRef = collection(db, COLLECTION_NAME);
  const snapshot = await getDoc(doc(collectionRef, projectId));
  if (!snapshot.exists()) {
    return null;
  }
  const project = mapSnapshotToProject(snapshot);
  return project ? { ...project, data: coalesce(project.data, {}) } : null;
};
