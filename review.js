import { getDue, advanceReview, softDelete, restore } from "./storage.js";

let queue = [];
let index = 0;

const cardEl = document.getElementById("card");

function render() {
  cardEl.innerHTML = "";

  if (index >= queue.length) {
    cardEl.textContent = "Nothing due right now.";
    return;
  }

  const note = queue[index];
  const text = document.createElement("div");
  text.textContent = note.text;
  cardEl.appendChild(text);

  if (note.source_url) {
    const source = document.createElement("div");
    source.className = "source";
    const link = document.createElement("a");
    link.href = note.source_url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = note.source_title || note.source_url;
    source.appendChild(link);
    cardEl.appendChild(source);
  }
}

function showToast(message, duration, onClick) {
  const toast = document.createElement("div");
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "16px",
    right: "16px",
    zIndex: "2147483647",
    background: "#2d3447",
    color: "#eee",
    padding: "10px 14px",
    borderRadius: "6px",
    fontSize: "14px",
    fontFamily: "sans-serif",
    opacity: "1",
    transition: "opacity 0.3s ease",
    cursor: onClick ? "pointer" : "default",
  });
  if (onClick) {
    toast.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick();
      toast.remove();
    });
  }
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

async function next() {
  const note = queue[index];
  if (note) await advanceReview(note.id);
  index++;
  render();
}

async function deleteCurrent() {
  const note = queue[index];
  if (!note) return;
  await softDelete(note.id);
  queue.splice(index, 1);
  render();
  showToast("Deleted", 5000, () => restore(note.id));
}

document.addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    next();
  } else if (e.key.toLowerCase() === "d") {
    e.preventDefault();
    deleteCurrent();
  }
});

document.addEventListener("click", next);

(async () => {
  queue = await getDue();
  render();
})();