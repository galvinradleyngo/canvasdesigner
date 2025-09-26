# Canvas Designer Studio

Canvas Designer Studio is a modern single-page web app for crafting interactive learning activities that can be embedded in Canvas LMS. It provides visual editors, live previews, and copy-ready embed code for three activity types: flip cards, drag & drop, and hotspots.

## Features

- 🎯 **Activity builder** – Guided authoring panels for flip cards, drag & drop matchers, and hotspot explorations.
- ✨ **Live preview** – Interactions update in real time with accessible controls and animation toggles.
- ☁️ **Cloud saving** – Store and retrieve activities securely in Firebase so they follow you across devices.
- 🔗 **Canvas-ready embed code** – Generates an iframe snippet that loads a hosted viewer suitable for Canvas LMS (or any LMS that accepts iframe embeds).
- 🖼️ **Image hotspots** – Upload a custom image, place hotspots visually, and describe each point of interest.
- 🌈 **Polished UI** – Responsive layout, rich styling, and subtle animations for an inspiring authoring experience.

## Getting started

1. Open `index.html` in your preferred browser.
2. Choose an activity type and customize its content in the left-hand panel.
3. Use **Save activity** to sync work-in-progress to Firebase. Saved activities appear in the dropdown for easy retrieval on any device.
4. Preview the interaction on the right. Use the toggle to pause or resume entrance animations.
5. Copy the generated embed snippet from the **Embed code** section or open the dialog for a full-screen view. Paste the snippet into the Canvas LMS HTML editor.

> **Tip:** Canvas strips external scripts in the rich content editor. The generated snippet now uses an iframe that points to the GitHub Pages viewer, so it keeps working even after Canvas sanitizes the HTML. The viewer page now falls back to the canonical GitHub Pages bundle if the relative path 404s (for example, when the snippet is rendered from within Canvas).

## Project structure

```
index.html
assets/
  styles/
    main.css
  js/
    app.js            # Application bootstrap and state management
    embed.js          # Canvas embed code generator
    embedViewer.js    # Lightweight runtime for the hosted viewer
    storage.js        # Firebase persistence helpers
    utils.js          # Shared helpers
    activities/
      index.js        # Activity registry
      flipCards.js    # Flip card editor + renderer
      dragDrop.js     # Drag & drop editor + renderer
      hotspots.js     # Hotspot editor + renderer
docs/
  embed.html          # Read-only viewer published to GitHub Pages
```

## Development notes

- The app uses vanilla JavaScript modules (`type="module"`) so it can run from the filesystem without a build step.
- Activity editors encapsulate their own input rendering logic to avoid conflicts during concurrent development.
- Embed snippets now render via a sandboxed iframe hitting `https://galvinradleyngo.github.io/canvasdesigner/embed.html`, keeping Canvas-compatible markup while isolating scripts and styles.
- Payloads are encoded into the iframe URL hash instead of the query string so large activities are no longer rejected by LMS proxy layers that enforce strict request-length limits.
- The hosted viewer validates the payload version, activity type, and text fields before rendering to guard against tampered URLs.

### Viewer base URL configuration

- The embed generator now derives the viewer URL from the page's origin or an explicit override.
- If you host the authoring app from a different domain (for example while testing locally from `file://` URLs), define `window.CANVASDESIGNER_VIEWER_BASE_URL` before loading `assets/js/app.js`.
- For scripted builds, you can also export `CANVASDESIGNER_VIEWER_BASE_URL` in the environment so the generator works when the modules are imported outside the browser.
- The value should be the absolute base of your deployment and must include a trailing slash. Example:

  ```html
  <script>
    window.CANVASDESIGNER_VIEWER_BASE_URL = 'https://your-org.github.io/canvasdesigner/';
  </script>
  <script type="module" src="assets/js/app.js"></script>
  ```

This keeps the generated iframe pointed at the live `docs/embed.html` viewer so LMS embeds continue to work after deployment.

## Browser support

The app targets evergreen desktop browsers (Chrome, Edge, Firefox, Safari). Clipboard features gracefully fall back to legacy selection when the asynchronous Clipboard API is unavailable.
