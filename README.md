# Canvas Interactive Builder

Canvas Interactive Builder is a lightweight web application for authoring interactive learning elements inspired by H5P. Educators can create activities and embed them inside Canvas LMS pages using an automatically generated iframe snippet.

## Features

- **Activity templates** for flipcards, accordions, drag & drop, hotspots, image sorting, word sorting, and timelines.
- **Inline editing** directly inside the preview canvas with accessible form controls.
- **Firebase-backed saving** so activities can be stored, revisited, and shared by ID.
- **Embed dialog** that produces a ready-to-use iframe code snippet for Canvas LMS.
- **Responsive layout** with guidance for inclusive, accessible content design.

## Getting started

1. Open `index.html` in your browser.
2. Choose an activity type and customize content directly within the preview.
3. Save the activity to generate a shareable code.
4. Use the **Embed Code** button to copy the iframe HTML for Canvas LMS.

## Firebase configuration

The application is pre-configured to use the following Firebase project:

```
const firebaseConfig = {
  apiKey: "AIzaSyBLj8Ql3rEOLmIiVW6IDa8uJNGFLNbhA6U",
  authDomain: "tdt-sandbox.firebaseapp.com",
  projectId: "tdt-sandbox",
  storageBucket: "tdt-sandbox.firebasestorage.app",
  messagingSenderId: "924451875699",
  appId: "1:924451875699:web:46464d31b27c4c62b3f306"
};
```

## Development notes

- The app uses the Firebase modular SDK (v10+) via ESM imports.
- All functionality lives in `scripts/app.js`; styles are in `styles/main.css`.
- No build tooling is required—everything runs in the browser.
