# Canvas Designer

Canvas Designer is a lightweight, browser-based builder for creating interactive elements that can be pasted straight into a Canvas LMS page. The tool currently supports two activity types:

- **Flip cards** – great for quick knowledge checks or revealing layered information.
- **Image hotspots** – upload any hosted image, drop clickable markers, and describe each point.

Every configuration change instantly refreshes the on-page preview and regenerates a ready-to-use embed snippet. Designs are saved to the browser's local storage so you can return later without losing your work.

## Getting started

1. Open `index.html` in your preferred browser (double-click it or serve the folder via any static web server).
2. Pick an interactive type from the Builder panel.
3. Customize the settings. Hotspots can be added by clicking on the preview image or by using the **Add hotspot manually** button.
4. Click **Save design** at any time to persist the setup in your browser.
5. Copy the generated embed code and paste it into the Canvas LMS **HTML Editor**.

> **Tip:** Use the keyboard shortcut **Ctrl/⌘+S** to quickly save your design.

## Embed snippet notes

- The embed code is completely self-contained (inline CSS + JS) and does not rely on external hosting or dependencies.
- Each embed is namespaced with a unique ID so you can safely place multiple widgets on the same Canvas page.
- Hotspot embeds require the image to be hosted somewhere publicly accessible (institutional CMS, Google Drive with sharing enabled, etc.).

## Development

This project is intentionally dependency-free. If you would like to extend it:

1. Edit the HTML/CSS/JS files directly.
2. Refresh the browser tab to see your changes.

Feel free to adapt the builder to additional activity types or integrate it with a backend (Firebase credentials are provided in the task description) if persistent multi-user storage is required.
