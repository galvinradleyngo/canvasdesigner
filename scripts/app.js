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

function sanitizeEditableText(node, multiline = false) {
  let text = multiline ? node.innerText : node.textContent;
  if (!text) return "";
  text = text.replace(/\u00a0/g, " ");
  if (multiline) {
    text = text.replace(/\r/g, "");
    text = text
      .split("\n")
      .map((line) => line.replace(/\s+$/g, ""))
      .join("\n");
  } else {
    text = text.replace(/\s+/g, " ");
  }
  return text.trim();
}

function createEditable({
  tag = "div",
  className = "",
  value = "",
  placeholder = "",
  label = "Editable text",
  multiline = false,
  onChange,
} = {}) {
  const node = document.createElement(tag);
  node.classList.add("editable");
  if (className) {
    node.classList.add(...className.split(" ").filter(Boolean));
  }
  node.contentEditable = "true";
  node.setAttribute("role", "textbox");
  node.setAttribute("spellcheck", "true");
  if (label) {
    node.setAttribute("aria-label", label);
  }
  if (multiline) {
    node.setAttribute("aria-multiline", "true");
    node.dataset.multiline = "true";
  } else {
    node.dataset.singleLine = "true";
  }
  if (placeholder) {
    node.dataset.placeholder = placeholder;
  }
  if (value) {
    node.textContent = value;
  } else {
    node.innerHTML = "";
  }

  let lastValue = sanitizeEditableText(node, multiline);
  node.classList.toggle("is-empty", !lastValue);

  const emitChange = () => {
    const text = sanitizeEditableText(node, multiline);
    node.classList.toggle("is-empty", !text);
    if (typeof onChange === "function" && text !== lastValue) {
      lastValue = text;
      onChange(text);
    }
  };

  node.addEventListener("input", emitChange);

  node.addEventListener("blur", () => {
    const text = sanitizeEditableText(node, multiline);
    node.textContent = text;
    if (!text) {
      node.innerHTML = "";
    }
    emitChange();
  });

  node.addEventListener("paste", (event) => {
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain") || "";
    if (document.queryCommandSupported?.("insertText")) {
      document.execCommand("insertText", false, text);
    } else {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        node.textContent += text;
        emitChange();
        return;
      }
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
    }
  });

  if (!multiline) {
    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        node.blur();
      }
    });
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
      el("button", {
        class: "secondary",
        type: "button",
        text: "Add flipcard",
        onclick: () => {
          data.cards.push({ id: uid(), front: "New front", back: "New back" });
          renderPreview();
        },
      })
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
      const cardWrapper = el("article", { class: "flipcard-card" });
      cardWrapper.dataset.face = "front";
      const faces = el("div", { class: "flipcard-faces" });
      const frontFace = createEditable({
        className: "card-side card-front",
        value: card.front,
        placeholder: "Front content",
        label: `Front content for card ${index + 1}`,
        multiline: true,
        onChange: (text) => {
          card.front = text;
        },
      });
      const backFace = createEditable({
        className: "card-side card-back",
        value: card.back,
        placeholder: "Back content",
        label: `Back content for card ${index + 1}`,
        multiline: true,
        onChange: (text) => {
          card.back = text;
        },
      });
      faces.append(frontFace, backFace);
      const controls = el("div", { class: "card-actions" });
      const toggle = el("button", {
        type: "button",
        class: "secondary",
        text: "Show back",
        onclick: () => {
          const showingBack = cardWrapper.dataset.face === "back";
          cardWrapper.dataset.face = showingBack ? "front" : "back";
          toggle.textContent = showingBack ? "Show back" : "Show front";
        },
      });
      const remove = el("button", {
        type: "button",
        class: "secondary",
        text: "Remove card",
        onclick: () => {
          data.cards = data.cards.filter((c) => c.id !== card.id);
          renderPreview();
        },
      });
      controls.append(toggle, remove);
      cardWrapper.append(faces, controls);
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

    const list = el("div", { class: "accordion-editor" });
    data.panels.forEach((panel, index) => {
      const item = el("article", { class: "accordion-item" });
      const heading = createEditable({
        className: "accordion-heading",
        value: panel.heading,
        placeholder: `Section ${index + 1} heading`,
        label: `Accordion heading ${index + 1}`,
        multiline: false,
        onChange: (text) => {
          panel.heading = text;
        },
      });
      const content = createEditable({
        className: "accordion-content",
        value: panel.content,
        placeholder: "Describe this accordion section",
        label: `Accordion content ${index + 1}`,
        multiline: true,
        onChange: (text) => {
          panel.content = text;
        },
      });
      const controls = el("div", { class: "item-controls" });
      controls.append(
        el("button", {
          type: "button",
          class: "secondary",
          text: "Move up",
          onclick: () => {
            const currentIndex = data.panels.findIndex((p) => p.id === panel.id);
            if (currentIndex > 0) {
              const [removed] = data.panels.splice(currentIndex, 1);
              data.panels.splice(currentIndex - 1, 0, removed);
              renderPreview();
            }
          },
        }),
        el("button", {
          type: "button",
          class: "secondary",
          text: "Move down",
          onclick: () => {
            const currentIndex = data.panels.findIndex((p) => p.id === panel.id);
            if (currentIndex >= 0 && currentIndex < data.panels.length - 1) {
              const [removed] = data.panels.splice(currentIndex, 1);
              data.panels.splice(currentIndex + 1, 0, removed);
              renderPreview();
            }
          },
        }),
        el("button", {
          type: "button",
          class: "secondary",
          text: "Remove",
          onclick: () => {
            data.panels = data.panels.filter((p) => p.id !== panel.id);
            renderPreview();
          },
        })
      );
      item.append(heading, content, controls);
      list.append(item);
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
    const promptField = createEditable({
      className: "dragdrop-prompt",
      value: data.prompt,
      placeholder: "Describe what learners should do",
      label: "Prompt",
      multiline: true,
      onChange: (text) => {
        data.prompt = text;
      },
    });
    editor.append(promptField);

    editor.append(el("div", { class: "helper-text", text: "Drop zones" }));

    const dropGrid = el("div", { class: "dragdrop-stage edit-mode" });
    const itemList = el("div", { class: "draggable-pool edit-mode" });

    function refreshAssignments() {
      const assignments = new Map();
      data.drops.forEach((drop) => assignments.set(drop.id, []));
      data.items.forEach((item) => {
        if (item.correctDropId && assignments.has(item.correctDropId)) {
          assignments.get(item.correctDropId).push(item);
        }
      });
      dropGrid.querySelectorAll(".dropzone-editor").forEach((zone) => {
        const list = zone.querySelector(".assignment-list");
        const dropId = zone.getAttribute("data-drop");
        const entries = assignments.get(dropId) || [];
        list.innerHTML = "";
        if (!entries.length) {
          list.append(el("li", { class: "assignment-empty", text: "No assigned items yet." }));
        } else {
          entries.forEach((entry) => {
            list.append(el("li", { text: entry.label || "Untitled item" }));
          });
        }
      });
      itemList.querySelectorAll("[data-item]").forEach((card) => {
        const chip = card.querySelector(".assignment-chip");
        if (!chip) return;
        const id = card.getAttribute("data-item");
        const item = data.items.find((entry) => entry.id === id);
        if (!item || !item.correctDropId) {
          chip.textContent = "No match yet";
          return;
        }
        const drop = data.drops.find((target) => target.id === item.correctDropId);
        chip.textContent = drop && drop.title ? `Matches: ${drop.title}` : "No match yet";
      });
    }

    data.drops.forEach((drop, index) => {
      const dropzone = el("div", { class: "dropzone dropzone-editor", "data-drop": drop.id });
      const header = el("div", { class: "dropzone-header" });
      const titleField = createEditable({
        className: "dropzone-title",
        value: drop.title,
        placeholder: `Category ${index + 1}`,
        label: `Drop zone ${index + 1} title`,
        multiline: false,
        onChange: (text) => {
          drop.title = text;
          refreshAssignments();
        },
      });
      const removeButton = el("button", {
        type: "button",
        class: "secondary",
        text: "Remove",
        onclick: () => {
          data.drops = data.drops.filter((d) => d.id !== drop.id);
          data.items.forEach((item) => {
            if (item.correctDropId === drop.id) {
              item.correctDropId = null;
            }
          });
          renderPreview();
        },
      });
      header.append(titleField, el("div", { class: "item-controls" }, [removeButton]));
      const assignmentList = el("ul", { class: "assignment-list" });
      dropzone.append(header, assignmentList);
      dropGrid.append(dropzone);
    });
    editor.append(dropGrid);

    editor.append(
      el("button", {
        type: "button",
        class: "secondary",
        text: "Add drop zone",
        onclick: () => {
          data.drops.push({ id: uid(), title: `Category ${data.drops.length + 1}` });
          renderPreview();
        },
      })
    );

    editor.append(el("div", { class: "helper-text", text: "Draggable items" }));

    data.items.forEach((item, index) => {
      const card = el("div", { class: "draggable-item editor", "data-item": item.id });
      const labelField = createEditable({
        className: "draggable-label",
        value: item.label,
        placeholder: `Item ${index + 1}`,
        label: `Draggable item ${index + 1}`,
        multiline: false,
        onChange: (text) => {
          item.label = text;
          refreshAssignments();
        },
      });
      const selectId = `item-select-${item.id}`;
      const select = el("select", { id: selectId, class: "assignment-select" });
      select.append(el("option", { value: "", text: "No match" }));
      data.drops.forEach((drop) => {
        const option = el("option", { value: drop.id, text: drop.title || "Untitled drop" });
        if (item.correctDropId === drop.id) {
          option.selected = true;
        }
        select.append(option);
      });
      select.addEventListener("change", (event) => {
        item.correctDropId = event.target.value || null;
        refreshAssignments();
      });
      const selectWrapper = el("div", { class: "assignment-control" });
      selectWrapper.append(
        el("label", {
          class: "sr-only",
          for: selectId,
          text: `Correct drop for ${item.label || `item ${index + 1}`}`,
        }),
        select,
        el("span", { class: "assignment-chip" })
      );
      const removeButton = el("button", {
        type: "button",
        class: "secondary",
        text: "Remove",
        onclick: () => {
          data.items = data.items.filter((i) => i.id !== item.id);
          renderPreview();
        },
      });
      card.append(labelField, selectWrapper, removeButton);
      itemList.append(card);
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
    refreshAssignments();
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
    let liveImage = null;
    editor.append(
      el("label", { for: imageFieldId, text: "Image URL" }),
      el("input", {
        id: imageFieldId,
        type: "url",
        placeholder: "https://example.com/image.jpg",
        value: data.imageUrl,
        oninput: (event) => {
          data.imageUrl = event.target.value;
        },
        onchange: () => {
          renderPreview();
        },
      })
    );

    const altField = createEditable({
      className: "hotspot-alt",
      value: data.altText,
      placeholder: "Describe the image for screen readers",
      label: "Alternative text",
      multiline: false,
      onChange: (text) => {
        data.altText = text;
        if (liveImage) {
          liveImage.alt = text || "Hotspot graphic";
        }
      },
    });
    editor.append(altField);

    editor.append(
      el("p", {
        class: "helper-text",
        text: "Click the image to place a hotspot. Drag markers to reposition.",
      })
    );

    const wrapper = el("div", { class: "hotspot-image-wrapper" });
    const markers = new Map();
    if (data.imageUrl) {
      const image = new Image();
      liveImage = image;
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
        marker.addEventListener("click", () => {
          const detail = editor.querySelector(`[data-spot="${spot.id}"]`);
          if (detail) {
            detail.scrollIntoView({ behavior: "smooth", block: "center" });
            const editable = detail.querySelector(".editable");
            editable?.focus({ preventScroll: true });
          }
        });
        enableHotspotDrag(marker, spot, wrapper);
        wrapper.append(marker);
        markers.set(spot.id, marker);
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
      const list = el("div", { class: "hotspot-details" });
      data.spots.forEach((spot, index) => {
        const block = el("article", { class: "hotspot-detail", "data-spot": spot.id });
        block.append(
          el("h3", { text: `Hotspot ${index + 1}` })
        );
        const titleField = createEditable({
          className: "hotspot-title",
          value: spot.title,
          placeholder: "Hotspot title",
          label: `Hotspot ${index + 1} title`,
          multiline: false,
          onChange: (text) => {
            spot.title = text;
            const marker = markers.get(spot.id);
            if (marker) {
              marker.setAttribute("aria-label", text || `Hotspot ${index + 1}`);
            }
          },
        });
        const descField = createEditable({
          className: "hotspot-text",
          value: spot.description,
          placeholder: "Describe this hotspot",
          label: `Hotspot ${index + 1} description`,
          multiline: true,
          onChange: (text) => {
            spot.description = text;
          },
        });
        const removeButton = el("button", {
          type: "button",
          class: "secondary",
          text: "Remove",
          onclick: () => {
            data.spots = data.spots.filter((s) => s.id !== spot.id);
            renderPreview();
          },
        });
        block.append(titleField, descField, removeButton);
        list.append(block);
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

    const grid = el("div", { class: "image-card-grid" });
    data.items.forEach((item, index) => {
      const card = el("figure", { class: "image-card", "data-item": item.id });
      const frame = el("div", { class: "image-frame" });
      let imageElement = null;
      const updateFrame = () => {
        frame.innerHTML = "";
        if (item.imageUrl) {
          const img = new Image();
          imageElement = img;
          img.src = item.imageUrl;
          img.alt = item.altText || item.label || `Image ${index + 1}`;
          img.addEventListener("error", () => {
            frame.innerHTML = "";
            frame.append(el("div", { class: "image-placeholder", text: "Image unavailable" }));
          });
          frame.append(img);
        } else {
          imageElement = null;
          frame.append(el("div", { class: "image-placeholder", text: "Add image URL" }));
        }
      };
      updateFrame();

      const urlId = `image-${item.id}`;
      const urlInput = el("input", {
        id: urlId,
        type: "url",
        class: "image-url",
        value: item.imageUrl,
        placeholder: "https://...",
        oninput: (event) => {
          item.imageUrl = event.target.value;
        },
        onchange: () => {
          updateFrame();
        },
      });

      const labelField = createEditable({
        className: "image-label",
        value: item.label,
        placeholder: "Image label",
        label: `Image ${index + 1} label`,
        multiline: false,
        onChange: (text) => {
          item.label = text;
          if (imageElement) {
            imageElement.alt = item.altText || text || `Image ${index + 1}`;
          }
        },
      });

      const altField = createEditable({
        className: "image-alt",
        value: item.altText,
        placeholder: "Alt text for screen readers",
        label: `Image ${index + 1} alternative text`,
        multiline: false,
        onChange: (text) => {
          item.altText = text;
          if (imageElement) {
            imageElement.alt = text || item.label || `Image ${index + 1}`;
          }
        },
      });

      const controls = el("div", { class: "item-controls" });
      controls.append(
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
        })
      );

      card.append(
        frame,
        el("label", { class: "sr-only", for: urlId, text: `Image ${index + 1} URL` }),
        urlInput,
        labelField,
        altField,
        controls
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
    const list = el("div", { class: "word-chip-list" });
    data.words.forEach((word, index) => {
      const chip = el("div", { class: "word-chip", "data-word": word.id });
      const textField = createEditable({
        className: "word-text",
        value: word.label,
        placeholder: `Word ${index + 1}`,
        label: `Word ${index + 1}`,
        multiline: false,
        onChange: (text) => {
          word.label = text;
        },
      });
      const controls = el("div", { class: "item-controls" });
      controls.append(
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
        })
      );
      chip.append(textField, controls);
      list.append(chip);
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

    const list = el("ol", { class: "timeline timeline-editor" });
    data.events.forEach((eventItem, index) => {
      const item = el("li", { class: "timeline-event", "data-event": eventItem.id });
      const titleField = createEditable({
        className: "timeline-title",
        value: eventItem.title,
        placeholder: `Event ${index + 1} title`,
        label: `Timeline event ${index + 1} title`,
        multiline: false,
        onChange: (text) => {
          eventItem.title = text;
        },
      });
      const dateField = createEditable({
        className: "timeline-date",
        value: eventItem.date,
        placeholder: "Date or year",
        label: `Timeline event ${index + 1} date`,
        multiline: false,
        onChange: (text) => {
          eventItem.date = text;
        },
      });
      const descField = createEditable({
        className: "timeline-text",
        value: eventItem.description,
        placeholder: "Describe this milestone",
        label: `Timeline event ${index + 1} description`,
        multiline: true,
        onChange: (text) => {
          eventItem.description = text;
        },
      });
      const controls = el("div", { class: "item-controls" });
      controls.append(
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
        })
      );
      item.append(titleField, dateField, descField, controls);
      list.append(item);
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
