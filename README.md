# Canvas Designer Studio

Canvas Designer Studio is a modern single-page web app for crafting interactive learning activities that can be embedded in Canvas LMS. It provides visual editors, live previews, and copy-ready embed code for four activity types: flip cards, accordions, hotspots, and drag & drop categorization.

## Features

- 🎯 **Activity builder** – Guided authoring panels for flip cards, accordions, hotspots, and drag & drop sorting challenges.
- ✨ **Live preview** – Interactions update in real time with accessible controls and animation toggles.
- 💾 **Local saving** – Store an unlimited number of activities in the browser and reload them for future edits.
- 🔗 **Canvas-ready embed code** – Generates a self-contained HTML/CSS/JS snippet suitable for Canvas LMS (or any LMS that accepts iframe/HTML embeds).
- 🖼️ **Image hotspots** – Upload a custom image, place hotspots visually, and describe each point of interest.
- 🌈 **Polished UI** – Responsive layout, rich styling, and subtle animations for an inspiring authoring experience.

## Getting started

1. Open `index.html` in your preferred browser.
2. Choose an activity type and customize its content in the left-hand panel.
3. Use **Save activity** to keep work-in-progress in local storage. Saved activities appear in the dropdown for easy retrieval.
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
    storage.js        # Local storage helper utilities
    utils.js          # Shared helpers
    activities/
      index.js        # Activity registry
      flipCards.js    # Flip card editor + renderer
      accordions.js   # Accordion editor + renderer
      hotspots.js     # Hotspot editor + renderer
      dragDrop.js     # Drag & drop categorization editor + renderer
```

## Development notes

- The app uses vanilla JavaScript modules (`type="module"`) so it can run from the filesystem without a build step.
- Activity editors encapsulate their own input rendering logic to avoid conflicts during concurrent development.
- Embed snippets scope their CSS and JavaScript by unique IDs so multiple embeds can coexist on the same Canvas page.

## Browser support

The app targets evergreen desktop browsers (Chrome, Edge, Firefox, Safari). Clipboard features gracefully fall back to legacy selection when the asynchronous Clipboard API is unavailable.
