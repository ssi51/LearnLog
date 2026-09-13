import { addNote, getAll, CATEGORIES } from "./storage.js";

const textarea = document.getElementById("text");
const categorySelect = document.getElementById("category");
const saveButton = document.getElementById("save");
const exportButton = document.getElementById("export");
const listLink = document.getElementById("list");

for (const category of CATEGORIES) {
  const option = document.createElement("option");
  option.value = category;
  option.textContent = category;
  categorySelect.appendChild(option);
}

function showToast(message, duration = 1000) {
  const toast = document.createElement("div");
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "16px",
    right: "16px",
    zIndex: "2147483647",
    background: "#2d3447",
    color: "#eee",
    padding: "8px 12px",
    borderRadius: "6px",
    fontSize: "13px",
    fontFamily: "sans-serif",
    opacity: "1",
    transition: "opacity 0.3s ease",
  });
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

async function save() {
  const text = textarea.value.trim();
  if (!text) return;
  await addNote(text, "", "", categorySelect.value);
  textarea.value = "";
  showToast("Saved");
  textarea.focus();
}

function isToday(ms) {
  const d = new Date(ms);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function dateHeader() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function toMarkdown(notes) {
  const lines = notes.map((n) =>
    n.source_url ? `- ${n.text} [src](${n.source_url})` : `- ${n.text}`
  );
  return `## ${dateHeader()}\n\n${lines.join("\n")}\n`;
}

async function exportToday() {
  try {
    const notes = (await getAll()).filter((n) => isToday(n.created)).sort((a, b) => a.created - b.created);
    if (notes.length === 0) {
      showToast("Nothing to export today");
      return;
    }
    await navigator.clipboard.writeText(toMarkdown(notes));
    showToast("Copied");
  } catch (err) {
    console.error("LearnLog: export failed", err);
  }
}

saveButton.addEventListener("click", save);
exportButton.addEventListener("click", exportToday);
textarea.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    save();
  }
});

listLink.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("list.html") });
});