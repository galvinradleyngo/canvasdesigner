import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously
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
  const promise = new Promise((resolve, reject) => {
    let settled = false;
    let unsubscribe = () => {};

    const completeResolve = (user) => {
      if (settled) {
        return;
      }
      settled = true;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
      resolve(user);
    };

    const completeReject = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
      reject(error);
    };

    unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          completeResolve(user);
        }
      },
      (error) => {
        completeReject(error);
      }
    );

    if (auth.currentUser) {
      completeResolve(auth.currentUser);
      return;
    }

    signInAnonymously(auth).catch((error) => {
      if (error && error.code === 'auth/operation-not-allowed') {
        completeReject(
          new Error('Enable anonymous authentication or adjust Firestore rules to allow saving activities.')
        );
      } else {
        completeReject(error);
      }
    });
  });

  authReadyPromise = promise.then(
    (user) => user,
    (error) => {
      console.warn('Firebase authentication issue', error);
      authReadyPromise = null;
      throw error;
    }
  );

  return authReadyPromise;
};
