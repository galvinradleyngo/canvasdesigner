import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import {
  getAuth,
  signInWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBLj8Ql3rEOLmIiVW6IDa8uJNGFLNbhA6U',
  authDomain: 'tdt-sandbox.firebaseapp.com',
  projectId: 'tdt-sandbox',
  storageBucket: 'tdt-sandbox.firebasestorage.app',
  messagingSenderId: '924451875699',
  appId: '1:924451875699:web:46464d31b27c4c62b3f306'
};

let appInstance;
let firestoreInstance;
let authInstance;
let authReadyPromise;

const decodeBase64 = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  if (typeof globalThis !== 'undefined' && typeof globalThis.atob === 'function') {
    return globalThis.atob(value);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'base64').toString('utf-8');
  }
  return value;
};

const SERVICE_USER_EMAIL = 'canvasdesigner-service@tdt-sandbox.firebaseapp.com';
const SERVICE_USER_PASSWORD = decodeBase64('c2FsdGlzYXNpbg==');

export const getFirebaseApp = () => {
  if (!appInstance) {
    const apps = getApps();
    appInstance = apps.length ? apps[0] : initializeApp(firebaseConfig);
  }
  return appInstance;
};

export const getFirestoreDb = () => {
  if (!firestoreInstance) {
    firestoreInstance = getFirestore(getFirebaseApp());
  }
  return firestoreInstance;
};

export const getFirebaseAuth = () => {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
  }
  return authInstance;
};

export const ensureAuth = () => {
  if (authReadyPromise) {
    return authReadyPromise;
  }

  const auth = getFirebaseAuth();
  if (auth.currentUser && auth.currentUser.email === SERVICE_USER_EMAIL) {
    return Promise.resolve(auth.currentUser);
  }

  const loginPromise = signInWithEmailAndPassword(auth, SERVICE_USER_EMAIL, SERVICE_USER_PASSWORD).then(
    (credential) => credential.user
  );

  authReadyPromise = loginPromise.catch((error) => {
    console.warn('Firebase authentication issue', error);
    authReadyPromise = null;
    throw error;
  });

  return authReadyPromise;
};
