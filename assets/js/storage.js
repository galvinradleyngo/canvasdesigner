import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { clone } from './utils.js';
import { getFirestoreDb } from './firebaseClient.js';

const COLLECTION_NAME = 'canvasDesignerActivities';

const mapSnapshotToProject = (snapshot) => {
  if (!snapshot) return null;
  const data = snapshot.data();
  if (!data) return null;
  return {
    id: snapshot.id,
    title: data.title ?? '',
    description: data.description ?? '',
    type: data.type ?? '',
    data: data.data ?? {},
    updatedAt: data.updatedAt ?? null
  };
};

export const listProjects = async () => {
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
  const db = getFirestoreDb();
  const value = clone(project);
  const updatedAt = new Date().toISOString();
  const collectionRef = collection(db, COLLECTION_NAME);
  const documentId = value.id || doc(collectionRef).id;
  value.id = documentId;
  const docRef = doc(collectionRef, documentId);
  const payload = {
    title: value.title ?? '',
    description: value.description ?? '',
    type: value.type ?? '',
    data: value.data ?? {},
    updatedAt
  };

  await setDoc(docRef, payload, { merge: true });

  return { id: documentId, ...payload };
};

export const deleteProject = async (projectId) => {
  const db = getFirestoreDb();
  const collectionRef = collection(db, COLLECTION_NAME);
  await deleteDoc(doc(collectionRef, projectId));
};

export const getProject = async (projectId) => {
  const db = getFirestoreDb();
  const collectionRef = collection(db, COLLECTION_NAME);
  const snapshot = await getDoc(doc(collectionRef, projectId));
  if (!snapshot.exists()) {
    return null;
  }
  const project = mapSnapshotToProject(snapshot);
  return project ? { ...project, data: project.data ?? {} } : null;
};
