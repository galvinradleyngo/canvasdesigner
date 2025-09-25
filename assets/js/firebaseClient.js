import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBLj8Ql3rEOLmIiVW6IDa8uJNGFLNbhA6U',
  authDomain: 'tdt-sandbox.firebaseapp.com',
  projectId: 'tdt-sandbox',
  storageBucket: 'tdt-sandbox.firebasestorage.app',
  messagingSenderId: '924451875699',
  appId: '1:924451875699:web:46464d31b27c4c62b3f306'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
