import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import {
  getAuth,
  signInWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirebaseConfig, getServiceAccountConfig } from './firebaseSettings.js';

const firebaseConfig = getFirebaseConfig();
const { email: SERVICE_USER_EMAIL, password: SERVICE_USER_PASSWORD } = getServiceAccountConfig();

let appInstance;
let firestoreInstance;
let authInstance;
let authReadyPromise;

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
