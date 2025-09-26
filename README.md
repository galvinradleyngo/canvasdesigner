# Canvas Designer Studio

Canvas Designer Studio is a modern single-page web app for crafting interactive learning activities that can be embedded in Canvas LMS. It provides visual editors, live previews, and copy-ready embed code for three activity types: flip cards, drag & drop, and hotspots.

## Features

- 🎯 **Activity builder** – Guided authoring panels for flip cards, drag & drop matchers, and hotspot explorations.
- ✨ **Live preview** – Interactions update in real time with accessible controls and animation toggles.
- ☁️ **Cloud saving** – Store and retrieve activities securely in Firebase so they follow you across devices.
- 🔗 **Canvas-ready embed code** – Generates a self-contained HTML/CSS/JS snippet suitable for Canvas LMS (or any LMS that accepts iframe/HTML embeds).
- 🖼️ **Image hotspots** – Upload a custom image, place hotspots visually, and describe each point of interest.
- 🌈 **Polished UI** – Responsive layout, rich styling, and subtle animations for an inspiring authoring experience.

## Getting started

1. Open `index.html` in your preferred browser.
2. Choose an activity type and customize its content in the left-hand panel.
3. Use **Save activity** to sync work-in-progress to Firebase. Saved activities appear in the dropdown for easy retrieval on any device.
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
    storage.js        # Firebase persistence helpers
    utils.js          # Shared helpers
    activities/
      index.js        # Activity registry
      flipCards.js    # Flip card editor + renderer
      dragDrop.js     # Drag & drop editor + renderer
      hotspots.js     # Hotspot editor + renderer
```

## Development notes

- The app uses vanilla JavaScript modules (`type="module"`) so it can run from the filesystem without a build step.
- Activity editors encapsulate their own input rendering logic to avoid conflicts during concurrent development.
- Embed snippets scope their CSS and JavaScript by unique IDs so multiple embeds can coexist on the same Canvas page.

## Browser support

The app targets evergreen desktop browsers (Chrome, Edge, Firefox, Safari). Clipboard features gracefully fall back to legacy selection when the asynchronous Clipboard API is unavailable.
