import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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
