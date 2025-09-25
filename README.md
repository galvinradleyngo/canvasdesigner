# Canvas Designer Studio

Canvas Designer Studio is a modern single-page web app for crafting interactive learning activities that can be embedded in Canvas LMS. It provides visual editors, live previews, and copy-ready embed code for three activity types: flip cards, accordions, and hotspots.

## Features

- 🎯 **Activity builder** – Guided authoring panels for flip cards, accordions, and hotspot explorations.
- ✨ **Live preview** – Interactions update in real time with accessible controls and animation toggles.
- ☁️ **Cloud saving with offline fallback** – Securely store activities in Firebase with automatic local-storage fallback when the network is unavailable. Offline saves are queued and sync back to Firestore once a connection returns.
- 🔗 **Canvas-ready embed code** – Generates a self-contained HTML/CSS/JS snippet suitable for Canvas LMS (or any LMS that accepts iframe/HTML embeds).
- 🖼️ **Image hotspots** – Upload a custom image, place hotspots visually, and describe each point of interest.
- 🌈 **Polished UI** – Responsive layout, rich styling, and subtle animations for an inspiring authoring experience.

## Getting started

1. Open `index.html` in your preferred browser.
2. Choose an activity type and customize its content in the left-hand panel.
3. Use **Save activity** to keep work-in-progress in Firebase Cloud Firestore. If the network is unavailable, Canvas Designer Studio falls back to private local storage and syncs again the next time Firestore is reachable. Saved activities appear in the dropdown for easy retrieval on any device.
4. Preview the interaction on the right. Use the toggle to pause or resume entrance animations.
5. Copy the generated embed snippet from the **Embed code** section or open the dialog for a full-screen view. Paste the snippet into the Canvas LMS HTML editor.

> **Tip:** Canvas strips external scripts in the rich content editor. The generated embed code is completely self-contained, so it will keep working when pasted into Canvas pages, assignments, or modules.

## Project structure

```
index.html
assets/
  styles/
    main.css
  js/
    app.js            # Application bootstrap and state management
    embed.js          # Canvas embed code generator
    firebaseClient.js # Firebase initialization
    storage.js        # Cloud + local persistence utilities
    utils.js          # Shared helpers
    activities/
      index.js        # Activity registry
      flipCards.js    # Flip card editor + renderer
      accordions.js   # Accordion editor + renderer
      hotspots.js     # Hotspot editor + renderer
```

## Development notes

- The app uses vanilla JavaScript modules (`type="module"`) so it can run from the filesystem without a build step.
- Activity editors encapsulate their own input rendering logic to avoid conflicts during concurrent development.
- Embed snippets scope their CSS and JavaScript by unique IDs so multiple embeds can coexist on the same Canvas page.
- Firebase Cloud Firestore powers persistence. The bundled configuration connects to the provided sandbox project, automatically
  falling back to local storage when the network is unavailable. When the app switches persistence modes it dispatches a
  `storage-mode-changed` event so the UI can surface status messaging and any custom integrations can react.

## Browser support

The app targets evergreen desktop browsers (Chrome, Edge, Firefox, Safari). Clipboard features gracefully fall back to legacy selection when the asynchronous Clipboard API is unavailable.
