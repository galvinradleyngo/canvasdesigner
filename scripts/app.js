import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBLj8Ql3rEOLmIiVW6IDa8uJNGFLNbhA6U",
  authDomain: "tdt-sandbox.firebaseapp.com",
  projectId: "tdt-sandbox",
  storageBucket: "tdt-sandbox.firebasestorage.app",
  messagingSenderId: "924451875699",
  appId: "1:924451875699:web:46464d31b27c4c62b3f306",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10));

const templates = {
  flipcards: () => ({
    cards: [
      {
        id: uid(),
        front: "Front face",
        back: "Back face",
      },
    ],
  }),
  accordion: () => ({
    panels: [
      {
        id: uid(),
        heading: "Accordion heading",
        content: "Add supporting information here.",
      },
    ],
  }),
  dragdrop: () => ({
    prompt: "Drag each item to the matching category.",
    drops: [
      { id: uid(), title: "Category A" },
      { id: uid(), title: "Category B" },
    ],
    items: [
      { id: uid(), label: "Item 1", correctDropId: null },
      { id: uid(), label: "Item 2", correctDropId: null },
    ],
  }),
  hotspots: () => ({
    imageUrl: "",
    altText: "",
    spots: [],
  }),
  imageSort: () => ({
    items: [
      {
        id: uid(),
        imageUrl: "",
        label: "Image label",
        altText: "Describe the image",
      },
    ],
  }),
  wordSort: () => ({
    words: [
      { id: uid(), label: "Term 1" },
      { id: uid(), label: "Term 2" },
      { id: uid(), label: "Term 3" },
    ],
  }),
  timeline: () => ({
    events: [
      {
        id: uid(),
        title: "Milestone",
        date: "2024",
        description: "Add a short description.",
      },
    ],
  }),
};

const state = {
  id: null,
  title: "",
  type: "flipcards",
  instructions: "",
  data: templates.flipcards(),
  updatedAt: null,
};

const elements = {
  title: document.getElementById("activityTitle"),
  type: document.getElementById("activityType"),
  instructions: document.getElementById("instructions"),
  instructionsPreview: document.getElementById("instructionsPreview"),
  previewCanvas: document.getElementById("previewCanvas"),
  previewToolbar: document.getElementById("previewToolbar"),
  previewTitle: document.getElementById("previewTitle"),
  srStatus: document.getElementById("srStatus"),
  builderLayout: document.getElementById("builderLayout"),
  headerActions: document.getElementById("headerActions"),
  embedLayout: document.getElementById("embedLayout"),
  embedTitle: document.getElementById("embedActivityTitle"),
  embedInstructions: document.getElementById("embedInstructions"),
  embedCanvas: document.getElementById("embedCanvas"),
  loadButton: document.getElementById("loadButton"),
  newButton: document.getElementById("newButton"),
  saveButton: document.getElementById("saveButton"),
  embedButton: document.getElementById("embedButton"),
  loadDialog: document.getElementById("loadDialog"),
  loadId: document.getElementById("loadId"),
  embedDialog: document.getElementById("embedDialog"),
  embedCode: document.getElementById("embedCode"),
  embedDetails: document.getElementById("embedDetails"),
  copyEmbed: document.getElementById("copyEmbed"),
};

if (elements.embedButton) {
  elements.embedButton.disabled = true;
}

const params = new URLSearchParams(window.location.search);
const isEmbedMode = params.get("mode") === "embed";
const initialId = params.get("id");

const toastContainer = (() => {
  const existing = document.querySelector(".toast-container");
  if (existing) return existing;
  const container = document.createElement("div");
  container.className = "toast-container";
  document.body.append(container);
  return container;
})();

function announce(message) {
  if (elements.srStatus) {
    elements.srStatus.textContent = message;
  }
}

function showToast(message) {
  const template = document.getElementById("toastTemplate");
  if (!template) return;
  const toast = template.content.firstElementChild.cloneNode(true);
  toast.textContent = message;
  toastContainer.append(toast);
  setTimeout(() => toast.remove(), 4000);
}

function cloneTemplate(type) {
  const creator = templates[type];
  return creator ? creator() : {};
}

function resetState(type = state.type) {
  state.title = "";
  state.instructions = "";
  state.type = type;
  state.data = cloneTemplate(type);
  state.id = null;
  state.updatedAt = null;
  if (elements.embedButton) {
    elements.embedButton.disabled = true;
  }
  syncFormFromState();
  renderPreview();
  announce("Started a new activity.");
}

elements.title.addEventListener("input", (event) => {
  state.title = event.target.value;
  renderPreview();
});

elements.instructions.addEventListener("input", (event) => {
  state.instructions = event.target.value;
  renderPreview();
});

elements.type.addEventListener("change", (event) => {
  const newType = event.target.value;
  state.type = newType;
  state.data = cloneTemplate(newType);
  renderPreview();
  announce(`Switched to ${event.target.selectedOptions[0].textContent} activity.`);
});

function syncFormFromState() {
  if (elements.title.value !== state.title) {
    elements.title.value = state.title;
  }
  if (elements.instructions.value !== state.instructions) {
    elements.instructions.value = state.instructions;
  }
  if (elements.type.value !== state.type) {
    elements.type.value = state.type;
  }
}

function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(options)) {
    if (key === "class") {
      node.className = value;
    } else if (key === "text") {
      node.textContent = value;
    } else if (key === "html") {
      node.innerHTML = value;
    } else if (key === "value") {
      if ("value" in node) {
        node.value = value;
      } else {
        node.setAttribute(key, value);
      }
    } else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.substring(2).toLowerCase(), value);
    } else if (value !== null && value !== undefined) {
      node.setAttribute(key, value);
    }
  }
  if (!Array.isArray(children)) {
    children = [children];
  }
  for (const child of children) {
    if (child === null || child === undefined) continue;
    node.append(child);
  }
  return node;
}

function renderPreview() {
  elements.instructionsPreview.textContent = state.instructions;
  if (elements.previewTitle) {
    elements.previewTitle.textContent = `Preview · ${typeLabels[state.type] || "Activity"}`;
  }
  elements.previewToolbar.innerHTML = "";
  elements.previewCanvas.innerHTML = "";

  const renderer = activityRenderers[state.type];
  if (!renderer) {
    elements.previewCanvas.append(
      el("div", { class: "empty-state", text: "This activity type is not available." })
    );
    return;
  }
  renderer({
    container: elements.previewCanvas,
    toolbar: elements.previewToolbar,
    data: state.data,
    editing: true,
  });
}

const activityRenderers = {
  flipcards: renderFlipcards,
  accordion: renderAccordion,
  dragdrop: renderDragDrop,
  hotspots: renderHotspots,
  imageSort: renderImageSort,
  wordSort: renderWordSort,
  timeline: renderTimeline,
};

const typeLabels = {
  flipcards: "Flipcards",
  accordion: "Accordion",
  dragdrop: "Drag & Drop",
  hotspots: "Hotspots",
  imageSort: "Image Sorting",
  wordSort: "Word Sorting",
  timeline: "Timeline",
};

function toolbarStub() {
  return {
    append() {},
    innerHTML: "",
  };
}

function renderFlipcards({ container, toolbar, data, editing }) {
  if (editing && data.cards.length < 8) {
    toolbar.append(
      el(
        "button",
        {
          class: "secondary",
          type: "button",
          text: "Add flipcard",
          onclick: () => {
            data.cards.push({ id: uid(), front: "New front", back: "New back" });
            renderPreview();
          },
        },
        []
      )
    );
  }

  if (!data.cards.length) {
    container.append(
      el("div", { class: "empty-state", text: "Add cards to start building your flip activity." })
    );
    return;
  }

  if (editing) {
    const grid = el("div", { class: "flipcard-grid" });
    data.cards.forEach((card, index) => {
      const cardWrapper = el("article", { class: "flipcard" });
      const frontId = `flip-front-${card.id}`;
      const backId = `flip-back-${card.id}`;
      cardWrapper.append(
        el("div", { class: "card-face" }, [
          el("label", { for: frontId, text: `Front ${index + 1}` }),
          el("textarea", {
            id: frontId,
            rows: 3,
            value: card.front,
            oninput: (event) => {
              card.front = event.target.value;
            },
          }),
        ]),
        el("div", { class: "card-face" }, [
          el("label", { for: backId, text: `Back ${index + 1}` }),
          el("textarea", {
            id: backId,
            rows: 3,
            value: card.back,
            oninput: (event) => {
              card.back = event.target.value;
            },
          }),
        ]),
        el(
          "button",
          {
            type: "button",
            class: "secondary",
            text: "Remove card",
            onclick: () => {
              data.cards = data.cards.filter((c) => c.id !== card.id);
              renderPreview();
            },
          }
        )
      );
      grid.append(cardWrapper);
    });
    container.append(grid);
  } else {
    const grid = el("div", { class: "flipcard-grid" });
    data.cards.forEach((card, index) => {
      const button = el(
        "button",
        {
          type: "button",
          class: "flipcard",
          "aria-expanded": "false",
          onclick: (event) => toggleFlip(event.currentTarget),
          onkeydown: (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              toggleFlip(event.currentTarget);
            }
          },
        },
        [
          el("div", { class: "card-side card-front", text: card.front || `Front ${index + 1}` }),
          el("div", { class: "card-side card-back", text: card.back || `Back ${index + 1}` }),
        ]
      );
      grid.append(button);
    });
    container.append(grid);
  }
}

function toggleFlip(target) {
  const isBack = target.getAttribute("data-face") === "back";
  target.setAttribute("data-face", isBack ? "front" : "back");
  target.setAttribute("aria-expanded", String(!isBack));
}

function renderAccordion({ container, toolbar, data, editing }) {
  if (editing) {
    toolbar.append(
      el("button", {
        class: "secondary",
        type: "button",
        text: "Add section",
        onclick: () => {
          data.panels.push({ id: uid(), heading: "New heading", content: "" });
          renderPreview();
        },
      })
    );

    if (!data.panels.length) {
      container.append(
        el("div", { class: "empty-state", text: "Add sections to build your accordion." })
      );
      return;
    }

    const list = el("div", { class: "accordion" });
    data.panels.forEach((panel) => {
      const headingId = `accordion-heading-${panel.id}`;
      const contentId = `accordion-content-${panel.id}`;
      const panelWrap = el("div", { class: "accordion-panel" });
      panelWrap.append(
        el("label", { for: headingId, text: "Heading" }),
        el("input", {
          id: headingId,
          type: "text",
          value: panel.heading,
          oninput: (event) => {
            panel.heading = event.target.value;
          },
        }),
        el("label", { for: contentId, text: "Content" }),
        el("textarea", {
          id: contentId,
          rows: 3,
          value: panel.content,
          oninput: (event) => {
            panel.content = event.target.value;
          },
        }),
        el("button", {
          type: "button",
          class: "secondary",
          text: "Remove section",
          onclick: () => {
            data.panels = data.panels.filter((p) => p.id !== panel.id);
            renderPreview();
          },
        })
      );
      list.append(panelWrap);
    });
    container.append(list);
  } else {
    const accordion = el("div", { class: "accordion" });
    data.panels.forEach((panel, index) => {
      const details = el("details", { open: index === 0 });
      details.append(
        el("summary", { text: panel.heading || `Section ${index + 1}` }),
        el("div", { class: "accordion-panel", text: panel.content || "No content." })
      );
      accordion.append(details);
    });
    container.append(accordion);
  }
}

function renderDragDrop({ container, toolbar, data, editing }) {
  if (editing) {
    const editor = el("div", { class: "dragdrop-editor" });
    const promptId = `dragprompt-${uid()}`;
    editor.append(
      el("label", { for: promptId, text: "Prompt" }),
      el("textarea", {
        id: promptId,
        rows: 2,
        value: data.prompt,
        oninput: (event) => {
          data.prompt = event.target.value;
        },
      })
    );

    const dropHeader = el("div", { class: "helper-text", text: "Drop zones" });
    editor.append(dropHeader);

    const dropGrid = el("div", { class: "dragdrop-stage" });
    data.drops.forEach((drop) => {
      const dropWrap = el("div", { class: "dropzone" });
      const dropTitleId = `drop-${drop.id}`;
      dropWrap.append(
        el("label", { for: dropTitleId, text: "Title" }),
        el("input", {
          id: dropTitleId,
          type: "text",
          value: drop.title,
          oninput: (event) => {
            drop.title = event.target.value;
          },
        }),
        el("button", {
          type: "button",
          class: "secondary",
          text: "Remove drop zone",
          onclick: () => {
            data.drops = data.drops.filter((d) => d.id !== drop.id);
            data.items.forEach((item) => {
              if (item.correctDropId === drop.id) {
                item.correctDropId = null;
              }
            });
            renderPreview();
          },
        })
      );
      dropGrid.append(dropWrap);
    });
    editor.append(dropGrid);

    const addDropButton = el("button", {
      type: "button",
      class: "secondary",
      text: "Add drop zone",
      onclick: () => {
        data.drops.push({ id: uid(), title: "New category" });
        renderPreview();
      },
    });
    editor.append(addDropButton);

    const itemsHeader = el("div", { class: "helper-text", text: "Draggable items" });
    editor.append(itemsHeader);

    const itemList = el("div", { class: "draggable-pool" });
    data.items.forEach((item) => {
      const itemWrap = el("div", { class: "draggable-item" });
      const itemLabelId = `item-${item.id}`;
      const itemSelectId = `item-select-${item.id}`;
      itemWrap.append(
        el("label", { for: itemLabelId, text: "Label" }),
        el("input", {
          id: itemLabelId,
          type: "text",
          value: item.label,
          oninput: (event) => {
            item.label = event.target.value;
          },
        }),
        el("label", { for: itemSelectId, text: "Correct drop" }),
        (() => {
          const select = el("select", { id: itemSelectId });
          select.append(el("option", { value: "", text: "No match" }));
          data.drops.forEach((drop) => {
            const option = el("option", {
              value: drop.id,
              text: drop.title,
            });
            if (item.correctDropId === drop.id) {
              option.selected = true;
            }
            select.append(option);
          });
          select.addEventListener("change", (event) => {
            item.correctDropId = event.target.value || null;
          });
          return select;
        })(),
        el("button", {
          type: "button",
          class: "secondary",
          text: "Remove item",
          onclick: () => {
            data.items = data.items.filter((i) => i.id !== item.id);
            renderPreview();
          },
        })
      );
      itemList.append(itemWrap);
    });
    editor.append(itemList);

    editor.append(
      el("button", {
        type: "button",
        class: "secondary",
        text: "Add item",
        onclick: () => {
          data.items.push({ id: uid(), label: "New item", correctDropId: null });
          renderPreview();
        },
      })
    );

    container.append(editor);
  } else {
    const wrapper = el("div", { class: "dragdrop-editor" });
    if (data.prompt) {
      wrapper.append(el("p", { text: data.prompt }));
    }
    wrapper.append(
      el("p", {
        class: "helper-text",
        text: "Drag an item into a category. Press Enter on an item to pick it up and arrow keys to move.",
      })
    );
    const stage = el("div", { class: "dragdrop-stage" });

    const pool = el("div", { class: "draggable-pool", role: "list" });
    data.items.forEach((item) => {
      const itemButton = el("button", {
        type: "button",
        class: "secondary",
        text: item.label,
        draggable: "true",
        "data-item": item.id,
        "data-correct": item.correctDropId || "",
      });
      pool.append(itemButton);
    });

    const dropZoneElements = new Map();
    data.drops.forEach((drop) => {
      const dropZone = el("div", {
        class: "dropzone",
        "data-drop": drop.id,
        role: "group",
      });
      dropZone.append(el("h3", { text: drop.title }));
      const slot = el("div", { class: "draggable-pool", "data-drop": drop.id });
      dropZone.append(slot);
      stage.append(dropZone);
      dropZoneElements.set(drop.id, slot);
    });

    wrapper.append(stage, el("h3", { text: "Items" }), pool);
    container.append(wrapper);

    setupDragDropInteraction({ pool, dropZoneElements, data });
  }
}

function setupDragDropInteraction({ pool, dropZoneElements, data }) {
  let dragged;
  let keyboardItem = null;

  const getDropEntries = () => Array.from(dropZoneElements.entries());

  function setPicked(button, picked) {
    if (picked) {
      keyboardItem = button;
      button.classList.add("picked");
      button.setAttribute("aria-pressed", "true");
    } else {
      if (keyboardItem === button) {
        keyboardItem = null;
      }
      button.classList.remove("picked");
      button.removeAttribute("aria-pressed");
    }
  }

  function resetToPool(button) {
    const previousParent = button.closest(".dropzone");
    previousParent?.classList.remove("correct", "incorrect");
    pool.append(button);
    button.focus();
  }

  function placeInZone(button, zone) {
    const previousParent = button.closest(".dropzone");
    zone.append(button);
    const dropId = zone.dataset.drop;
    const parent = zone.closest(".dropzone");
    if (previousParent && previousParent !== parent) {
      previousParent.classList.remove("correct", "incorrect");
    }
    parent?.classList.remove("correct", "incorrect");
    const id = button.getAttribute("data-item");
    const item = data.items.find((entry) => entry.id === id);
    const correctId = item?.correctDropId || button.getAttribute("data-correct");
    if (correctId) {
      if (correctId === dropId) {
        parent?.classList.add("correct");
      } else {
        parent?.classList.add("incorrect");
      }
    }
    button.focus();
  }

  pool.querySelectorAll("button").forEach((button) => {
    button.addEventListener("dragstart", (event) => {
      if (keyboardItem === button) {
        setPicked(button, false);
      }
      dragged = event.currentTarget;
      event.dataTransfer.setData("text/plain", button.getAttribute("data-item"));
      event.dataTransfer.effectAllowed = "move";
    });
    button.addEventListener("dragend", () => {
      dragged = null;
    });
    button.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (keyboardItem === button) {
          setPicked(button, false);
        } else {
          if (keyboardItem) {
            setPicked(keyboardItem, false);
          }
          setPicked(button, true);
        }
      } else if (
        keyboardItem === button &&
        ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(event.key)
      ) {
        event.preventDefault();
        const entries = getDropEntries();
        if (!entries.length) return;
        const currentDrop = button.parentElement?.dataset.drop || null;
        let currentIndex = entries.findIndex(([id]) => id === currentDrop);
        if (currentIndex < 0) {
          currentIndex = -1;
        }
        const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
        const nextIndex = (currentIndex + direction + entries.length) % entries.length;
        const [, targetZone] = entries[nextIndex];
        placeInZone(button, targetZone);
      } else if (event.key === "Escape" && keyboardItem === button) {
        event.preventDefault();
        resetToPool(button);
        setPicked(button, false);
      }
    });
  });

  getDropEntries().forEach(([, zone]) => {
    zone.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    });
    zone.addEventListener("drop", (event) => {
      event.preventDefault();
      const id = event.dataTransfer.getData("text/plain");
      const button = dragged || pool.querySelector(`[data-item="${id}"]`);
      if (!button) return;
      placeInZone(button, zone);
      setPicked(button, false);
      dragged = null;
    });
  });

  pool.addEventListener("dragover", (event) => {
    event.preventDefault();
  });
  pool.addEventListener("drop", (event) => {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain");
    const button = dragged || pool.querySelector(`[data-item="${id}"]`);
    if (button) {
      resetToPool(button);
      setPicked(button, false);
    }
    dragged = null;
  });
}

function renderHotspots({ container, toolbar, data, editing }) {
  if (editing) {
    const editor = el("div", { class: "hotspot-editor" });
    const imageFieldId = `hotspot-image-${uid()}`;
    const altFieldId = `hotspot-alt-${uid()}`;
    editor.append(
      el("label", { for: imageFieldId, text: "Image URL" }),
      el("input", {
        id: imageFieldId,
        type: "url",
        placeholder: "https://example.com/image.jpg",
        value: data.imageUrl,
        oninput: (event) => {
          data.imageUrl = event.target.value;
          renderPreview();
        },
      }),
      el("label", { for: altFieldId, text: "Alternative text" }),
      el("input", {
        id: altFieldId,
        type: "text",
        value: data.altText,
        oninput: (event) => {
          data.altText = event.target.value;
        },
      }),
      el("p", {
        class: "helper-text",
        text: "Click the image to place a hotspot. Drag markers to reposition.",
      })
    );

    const wrapper = el("div", { class: "hotspot-image-wrapper" });
    if (data.imageUrl) {
      const image = new Image();
      image.alt = data.altText || "Hotspot graphic";
      image.src = data.imageUrl;
      image.addEventListener("error", () => {
        wrapper.innerHTML = "";
        wrapper.append(
          el("div", { class: "hotspot-image-placeholder", text: "Unable to load image." })
        );
      });
      wrapper.append(image);

      wrapper.addEventListener("click", (event) => {
        if (event.target.closest(".hotspot-marker")) return;
        const rect = wrapper.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        data.spots.push({
          id: uid(),
          x: Math.round(x * 100) / 100,
          y: Math.round(y * 100) / 100,
          title: `Hotspot ${data.spots.length + 1}`,
          description: "",
        });
        renderPreview();
      });

      data.spots.forEach((spot, index) => {
        const marker = el("button", {
          type: "button",
          class: "hotspot-marker",
          text: String(index + 1),
          style: `left: ${spot.x}%; top: ${spot.y}%;`,
          "aria-label": spot.title || `Hotspot ${index + 1}`,
        });
        enableHotspotDrag(marker, spot, wrapper);
        wrapper.append(marker);
      });
    } else {
      wrapper.append(
        el("div", {
          class: "hotspot-image-placeholder",
          text: "Provide an image URL to start placing hotspots.",
        })
      );
    }

    editor.append(wrapper);

    if (data.spots.length) {
      const list = el("div", { class: "hotspot-description" });
      data.spots.forEach((spot, index) => {
        const titleId = `spot-title-${spot.id}`;
        const descId = `spot-desc-${spot.id}`;
        list.append(
          el("h3", { text: `Hotspot ${index + 1}` }),
          el("label", { for: titleId, text: "Title" }),
          el("input", {
            id: titleId,
            type: "text",
            value: spot.title,
            oninput: (event) => {
              spot.title = event.target.value;
            },
          }),
          el("label", { for: descId, text: "Description" }),
          el("textarea", {
            id: descId,
            rows: 3,
            value: spot.description,
            oninput: (event) => {
              spot.description = event.target.value;
            },
          }),
          el("button", {
            type: "button",
            class: "secondary",
            text: "Remove hotspot",
            onclick: () => {
              data.spots = data.spots.filter((s) => s.id !== spot.id);
              renderPreview();
            },
          })
        );
      });
      editor.append(list);
    }

    container.append(editor);
  } else {
    const viewer = el("div", { class: "hotspot-editor" });
    const wrapper = el("div", { class: "hotspot-image-wrapper" });
    if (data.imageUrl) {
      const image = new Image();
      image.src = data.imageUrl;
      image.alt = data.altText || "Interactive image";
      wrapper.append(image);
      const descriptions = [];
      data.spots.forEach((spot, index) => {
        const descId = `hotspot-${spot.id}`;
        const marker = el("button", {
          type: "button",
          class: "hotspot-marker",
          text: String(index + 1),
          style: `left: ${spot.x}%; top: ${spot.y}%;`,
          "aria-describedby": descId,
        });
        marker.addEventListener("click", () => {
          const target = viewer.querySelector(`#${descId}`);
          if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "center" });
            target.classList.add("active");
            setTimeout(() => target.classList.remove("active"), 1200);
          }
        });
        wrapper.append(marker);
        descriptions.push(
          el("div", {
            id: descId,
            class: "hotspot-description",
            "data-description": spot.id,
          }, [
            el("h3", { text: spot.title || `Hotspot ${index + 1}` }),
            el("p", { text: spot.description || "No description provided." }),
          ])
        );
      });
      if (descriptions.length) {
        viewer.append(wrapper, ...descriptions);
      } else {
        viewer.append(
          wrapper,
          el("p", { class: "helper-text", text: "No hotspots have been added yet." })
        );
      }
    } else {
      viewer.append(
        el("div", {
          class: "hotspot-image-placeholder",
          text: "Interactive image coming soon.",
        })
      );
    }
    container.append(viewer);
  }
}

function enableHotspotDrag(marker, spot, wrapper) {
  let pointerId = null;
  function handlePointerMove(event) {
    if (pointerId !== event.pointerId) return;
    const rect = wrapper.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    spot.x = Math.min(100, Math.max(0, Math.round(x * 100) / 100));
    spot.y = Math.min(100, Math.max(0, Math.round(y * 100) / 100));
    marker.style.left = `${spot.x}%`;
    marker.style.top = `${spot.y}%`;
  }
  marker.addEventListener("pointerdown", (event) => {
    pointerId = event.pointerId;
    marker.setPointerCapture(pointerId);
  });
  marker.addEventListener("pointermove", handlePointerMove);
  marker.addEventListener("pointerup", () => {
    marker.releasePointerCapture(pointerId);
    pointerId = null;
  });
  marker.addEventListener("pointercancel", () => {
    pointerId = null;
  });
}

function renderImageSort({ container, toolbar, data, editing }) {
  if (editing) {
    toolbar.append(
      el("button", {
        type: "button",
        class: "secondary",
        text: "Add image",
        onclick: () => {
          data.items.push({
            id: uid(),
            imageUrl: "",
            label: "Image label",
            altText: "",
          });
          renderPreview();
        },
      })
    );

    const grid = el("div", { class: "sorting-editor" });
    data.items.forEach((item, index) => {
      const imageId = `image-${item.id}`;
      const labelId = `image-label-${item.id}`;
      const altId = `image-alt-${item.id}`;
      const card = el("div", { class: "sortable-item" });
      card.append(
        el("label", { for: imageId, text: "Image URL" }),
        el("input", {
          id: imageId,
          type: "url",
          value: item.imageUrl,
          oninput: (event) => {
            item.imageUrl = event.target.value;
          },
        }),
        el("label", { for: labelId, text: "Label" }),
        el("input", {
          id: labelId,
          type: "text",
          value: item.label,
          oninput: (event) => {
            item.label = event.target.value;
          },
        }),
        el("label", { for: altId, text: "Alt text" }),
        el("input", {
          id: altId,
          type: "text",
          value: item.altText,
          oninput: (event) => {
            item.altText = event.target.value;
          },
        }),
        el("div", { class: "preview-toolbar-actions" }, [
          el("button", {
            type: "button",
            class: "secondary",
            text: "Move up",
            onclick: () => {
              if (index === 0) return;
              const [removed] = data.items.splice(index, 1);
              data.items.splice(index - 1, 0, removed);
              renderPreview();
            },
          }),
          el("button", {
            type: "button",
            class: "secondary",
            text: "Move down",
            onclick: () => {
              if (index === data.items.length - 1) return;
              const [removed] = data.items.splice(index, 1);
              data.items.splice(index + 1, 0, removed);
              renderPreview();
            },
          }),
          el("button", {
            type: "button",
            class: "secondary",
            text: "Remove",
            onclick: () => {
              data.items = data.items.filter((i) => i.id !== item.id);
              renderPreview();
            },
          }),
        ])
      );
      grid.append(card);
    });
    container.append(grid);
  } else {
    const helper = el("p", {
      class: "helper-text",
      text: "Drag the cards to arrange them in the desired order.",
    });
    const pool = el("div", { class: "sortable-grid" });
    data.items.forEach((item) => {
      const card = el("figure", { class: "sortable-item", draggable: "true", "data-id": item.id });
      if (item.imageUrl) {
        const img = new Image();
        img.src = item.imageUrl;
        img.alt = item.altText || item.label || "Sortable image";
        card.append(img);
      }
      if (item.label) {
        card.append(el("figcaption", { text: item.label }));
      }
      pool.append(card);
    });
    container.append(helper, pool);
    enableSimpleReorder(pool, data.items, (newOrder) => {
      data.items = newOrder;
    });
  }
}

function renderWordSort({ container, toolbar, data, editing }) {
  if (editing) {
    toolbar.append(
      el("button", {
        type: "button",
        class: "secondary",
        text: "Add word",
        onclick: () => {
          data.words.push({ id: uid(), label: "New word" });
          renderPreview();
        },
      })
    );
    const list = el("div", { class: "sorting-editor" });
    data.words.forEach((word, index) => {
      const inputId = `word-${word.id}`;
      list.append(
        el("label", { for: inputId, text: `Word ${index + 1}` }),
        el("input", {
          id: inputId,
          type: "text",
          value: word.label,
          oninput: (event) => {
            word.label = event.target.value;
          },
        }),
        el("div", { class: "preview-toolbar-actions" }, [
          el("button", {
            type: "button",
            class: "secondary",
            text: "Move up",
            onclick: () => {
              if (index === 0) return;
              const [removed] = data.words.splice(index, 1);
              data.words.splice(index - 1, 0, removed);
              renderPreview();
            },
          }),
          el("button", {
            type: "button",
            class: "secondary",
            text: "Move down",
            onclick: () => {
              if (index === data.words.length - 1) return;
              const [removed] = data.words.splice(index, 1);
              data.words.splice(index + 1, 0, removed);
              renderPreview();
            },
          }),
          el("button", {
            type: "button",
            class: "secondary",
            text: "Remove",
            onclick: () => {
              data.words = data.words.filter((w) => w.id !== word.id);
              renderPreview();
            },
          }),
        ])
      );
    });
    container.append(list);
  } else {
    const helper = el("p", {
      class: "helper-text",
      text: "Drag words into the correct order.",
    });
    const list = el("ol", { class: "sortable-grid" });
    data.words.forEach((word) => {
      const item = el("li", {
        class: "sortable-item",
        draggable: "true",
        "data-id": word.id,
      });
      item.append(el("span", { text: word.label }));
      list.append(item);
    });
    container.append(helper, list);
    enableSimpleReorder(list, data.words, (newOrder) => {
      data.words = newOrder;
    });
  }
}

function renderTimeline({ container, toolbar, data, editing }) {
  if (editing) {
    toolbar.append(
      el("button", {
        type: "button",
        class: "secondary",
        text: "Add event",
        onclick: () => {
          data.events.push({ id: uid(), title: "New event", date: "", description: "" });
          renderPreview();
        },
      })
    );

    const list = el("div", { class: "timeline" });
    data.events.forEach((eventItem, index) => {
      const wrap = el("div", { class: "timeline-event" });
      const titleId = `timeline-title-${eventItem.id}`;
      const dateId = `timeline-date-${eventItem.id}`;
      const descId = `timeline-desc-${eventItem.id}`;
      wrap.append(
        el("label", { for: titleId, text: "Title" }),
        el("input", {
          id: titleId,
          type: "text",
          value: eventItem.title,
          oninput: (event) => {
            eventItem.title = event.target.value;
          },
        }),
        el("label", { for: dateId, text: "Date or year" }),
        el("input", {
          id: dateId,
          type: "text",
          value: eventItem.date,
          oninput: (event) => {
            eventItem.date = event.target.value;
          },
        }),
        el("label", { for: descId, text: "Description" }),
        el("textarea", {
          id: descId,
          rows: 3,
          value: eventItem.description,
          oninput: (event) => {
            eventItem.description = event.target.value;
          },
        }),
        el("div", { class: "preview-toolbar-actions" }, [
          el("button", {
            type: "button",
            class: "secondary",
            text: "Move up",
            onclick: () => {
              if (index === 0) return;
              const [removed] = data.events.splice(index, 1);
              data.events.splice(index - 1, 0, removed);
              renderPreview();
            },
          }),
          el("button", {
            type: "button",
            class: "secondary",
            text: "Move down",
            onclick: () => {
              if (index === data.events.length - 1) return;
              const [removed] = data.events.splice(index, 1);
              data.events.splice(index + 1, 0, removed);
              renderPreview();
            },
          }),
          el("button", {
            type: "button",
            class: "secondary",
            text: "Remove",
            onclick: () => {
              data.events = data.events.filter((evt) => evt.id !== eventItem.id);
              renderPreview();
            },
          }),
        ])
      );
      list.append(wrap);
    });
    container.append(list);
  } else {
    const timeline = el("ol", { class: "timeline" });
    data.events.forEach((eventItem) => {
      const item = el("li", { class: "timeline-event" });
      item.append(el("h3", { text: eventItem.title }));
      if (eventItem.date) {
        item.append(el("p", { text: eventItem.date }));
      }
      if (eventItem.description) {
        item.append(el("p", { text: eventItem.description }));
      }
      timeline.append(item);
    });
    container.append(timeline);
  }
}

function enableSimpleReorder(container, items, onReorder) {
  let currentItems = items;
  let dragged = null;
  container.querySelectorAll("[draggable='true']").forEach((element) => {
    element.addEventListener("dragstart", (event) => {
      dragged = element;
      element.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
    });
    element.addEventListener("dragend", () => {
      element.classList.remove("dragging");
      dragged = null;
      if (typeof onReorder === "function") {
        const newOrder = Array.from(container.querySelectorAll("[draggable='true']")).map((node) => {
          const id = node.getAttribute("data-id");
          return currentItems.find((item) => item.id === id);
        });
        onReorder(newOrder);
        currentItems = newOrder;
      }
    });
  });

  container.addEventListener("dragover", (event) => {
    event.preventDefault();
    const afterElement = getDragAfterElement(container, event.clientY);
    if (!dragged) return;
    if (afterElement == null) {
      container.append(dragged);
    } else {
      container.insertBefore(dragged, afterElement);
    }
  });
}

function getDragAfterElement(container, y) {
  const elements = [...container.querySelectorAll("[draggable='true']:not(.dragging)")];
  return elements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}

async function saveActivity() {
  const payload = {
    title: state.title,
    type: state.type,
    instructions: state.instructions,
    data: state.data,
    updatedAt: serverTimestamp(),
  };

  let docId = state.id;
  if (docId) {
    await setDoc(doc(db, "activities", docId), payload, { merge: true });
  } else {
    const docRef = await addDoc(collection(db, "activities"), {
      ...payload,
      createdAt: serverTimestamp(),
    });
    docId = docRef.id;
    state.id = docId;
  }
  state.updatedAt = new Date().toISOString();
  showToast("Activity saved.");
  announce("Activity saved.");
  return docId;
}

async function loadActivityById(id) {
  const docRef = doc(db, "activities", id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) {
    throw new Error("Activity not found");
  }
  const data = snapshot.data();
  state.id = id;
  state.title = data.title || "";
  state.type = data.type || "flipcards";
  state.instructions = data.instructions || "";
  state.data = data.data || cloneTemplate(state.type);
  state.updatedAt = data.updatedAt?.toDate?.()?.toISOString?.() || null;
  syncFormFromState();
  renderPreview();
  if (elements.embedButton) {
    elements.embedButton.disabled = false;
  }
  showToast("Activity loaded.");
  announce(`Loaded activity ${id}.`);
}

async function handleSave() {
  try {
    elements.saveButton.disabled = true;
    const id = await saveActivity();
    elements.embedButton.disabled = false;
    showToast(`Share this activity with code: ${id}`);
  } catch (error) {
    console.error(error);
    showToast("Unable to save right now. Please try again.");
  } finally {
    elements.saveButton.disabled = false;
  }
}

function handleNew() {
  resetState(state.type);
}

function handleLoad() {
  elements.loadId.value = "";
  elements.loadDialog.showModal();
}

elements.loadDialog.addEventListener("close", () => {
  if (elements.loadDialog.returnValue === "confirm") {
    const id = elements.loadId.value.trim();
    if (!id) return;
    loadActivityById(id).catch((error) => {
      console.error(error);
      showToast("Unable to locate that activity code.");
    });
  }
});

function openEmbedDialog() {
  if (!state.id) {
    showToast("Save the activity first to generate embed code.");
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.set("mode", "embed");
  url.searchParams.set("id", state.id);
  const embedHtml = `<iframe src="${url.toString()}" title="${state.title || "Canvas interactive"}" width="100%" height="640" allowfullscreen loading="lazy"></iframe>`;
  elements.embedCode.value = embedHtml;
  elements.embedDetails.textContent = `Embed height can be adjusted inside Canvas. Activity code: ${state.id}`;
  elements.embedDialog.showModal();
}

elements.copyEmbed.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(elements.embedCode.value);
    showToast("Embed code copied to clipboard.");
  } catch (error) {
    showToast("Copy failed. Select the text and copy manually.");
  }
});

elements.embedDialog.addEventListener("close", () => {
  elements.embedCode.value = "";
});

elements.saveButton.addEventListener("click", handleSave);

elements.newButton.addEventListener("click", handleNew);

elements.loadButton.addEventListener("click", handleLoad);

elements.embedButton.addEventListener("click", openEmbedDialog);

function setEmbedModeLayout() {
  document.body.classList.add("embed-mode");
  if (elements.headerActions) {
    elements.headerActions.hidden = true;
  }
  if (elements.builderLayout) {
    elements.builderLayout.hidden = true;
  }
  if (elements.embedLayout) {
    elements.embedLayout.hidden = false;
  }
}

async function initEmbedMode() {
  setEmbedModeLayout();
  if (!initialId) {
    elements.embedCanvas.append(
      el("div", {
        class: "empty-state",
        text: "No activity specified. Provide an embed id to view an activity.",
      })
    );
    return;
  }
  try {
    const docRef = doc(db, "activities", initialId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) {
      throw new Error("Activity not found");
    }
    const data = snapshot.data();
    const embedState = {
      title: data.title || "Canvas interactive",
      instructions: data.instructions || "",
      type: data.type || "flipcards",
      data: data.data || cloneTemplate(data.type || "flipcards"),
    };
    if (embedState.title) {
      document.title = `${embedState.title} · Canvas Interactive`;
    }
    elements.embedTitle.textContent = embedState.title;
    elements.embedInstructions.textContent = embedState.instructions;
    const renderer = activityRenderers[embedState.type];
      if (renderer) {
        renderer({
          container: elements.embedCanvas,
          toolbar: toolbarStub(),
          data: embedState.data,
          editing: false,
        });
      } else {
      elements.embedCanvas.append(
        el("div", { class: "empty-state", text: "Unsupported activity type." })
      );
    }
  } catch (error) {
    console.error(error);
    elements.embedCanvas.append(
      el("div", {
        class: "empty-state",
        text: "We couldn't load that activity. Check the embed link and try again.",
      })
    );
  }
}

if (isEmbedMode) {
  initEmbedMode();
} else {
  syncFormFromState();
  renderPreview();
  if (initialId) {
    loadActivityById(initialId).catch((error) => {
      console.error(error);
      showToast("Unable to load the requested activity. Starting fresh.");
    });
  }
}

document.addEventListener("keydown", (event) => {
  if (event.key === "s" && (event.metaKey || event.ctrlKey)) {
    if (!isEmbedMode) {
      event.preventDefault();
      handleSave();
    }
  }
});
