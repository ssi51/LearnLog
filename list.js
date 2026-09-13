import { getAll, updateNote, advanceReview, softDelete, restore, CATEGORIES } from "./storage.js";

const CATEGORY_COLORS = {
  Uncategorized: "#666666",
  Engineering: "#d99a54",
  Tech: "#5b8dd9",
  Lifestyle: "#6fbf8b",
  "Web Development": "#4fb3af",
  Skincare: "#dd8fae",
};

const DAY_MS = 24 * 60 * 60 * 1000;

const queryEl = document.getElementById("query");
const filterEl = document.getElementById("filter");
const whenEl = document.getElementById("when");
const statusEl = document.getElementById("status");
const sourceEl = document.getElementById("source");
const listEl = document.getElementById("list");

let notes = [];

function populateSelect(el, options) {
  for (const [value, label] of options) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    el.appendChild(option);
  }
}

function populateFilter() {
  populateSelect(filterEl, [["all", "All categories"], ...CATEGORIES.map((c) => [c, c])]);
  populateSelect(whenEl, [
    ["all", "Any time"],
    ["today", "Today"],
    ["week", "This week"],
    ["month", "This month"],
  ]);
  populateSelect(statusEl, [
    ["active", "Active"],
    ["archived", "Archived"],
    ["any", "Any status"],
  ]);
  populateSelect(sourceEl, [
    ["any", "Any source"],
    ["has_url", "Has link"],
    ["no_url", "No link"],
  ]);
}

function formatDate(ms) {
  return new Date(ms).toLocaleDateString();
}

function renderItem(note) {
  const item = document.createElement("div");
  item.className = "item";
  item.style.borderLeftColor = CATEGORY_COLORS[note.category] || CATEGORY_COLORS.Uncategorized;

  const text = document.createElement("div");
  text.className = "text";
  text.textContent = note.text;
  item.appendChild(text);

  const meta = document.createElement("div");
  meta.className = "meta";

  const date = document.createElement("span");
  date.textContent = formatDate(note.created);
  meta.appendChild(date);

  const categorySelect = document.createElement("select");
  for (const category of CATEGORIES) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    if (category === note.category) option.selected = true;
    categorySelect.appendChild(option);
  }
  categorySelect.addEventListener("change", async () => {
    note.category = categorySelect.value;
    await updateNote(note.id, { category: note.category });
  });
  meta.appendChild(categorySelect);

  const reviewedControl = document.createElement("span");
  reviewedControl.className = "reviewed";
  reviewedControl.textContent = "Mark reviewed";
  reviewedControl.addEventListener("click", () => handleReview(note));
  meta.appendChild(reviewedControl);

  if (note.source_url) {
    const link = document.createElement("a");
    link.href = note.source_url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = note.source_title || "source";
    meta.appendChild(link);
  }

  const deleteControl = document.createElement("span");
  deleteControl.className = "delete";
  deleteControl.textContent = "Delete";
  deleteControl.addEventListener("click", () => handleDelete(note));
  meta.appendChild(deleteControl);

  item.appendChild(meta);
  return item;
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
    toast.addEventListener("click", () => {
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

async function handleReview(note) {
  const updated = await advanceReview(note.id);
  if (!updated) return;
  Object.assign(note, updated);
  render();
  showToast("Reviewed", 1000);
}

async function handleDelete(note) {
  await softDelete(note.id);
  notes = notes.filter((n) => n.id !== note.id);
  render();
  showToast("Deleted", 5000, async () => {
    await restore(note.id);
    note.deleted = false;
    note.deleted_at = null;
    notes.push(note);
    notes.sort((a, b) => b.created - a.created);
    render();
  });
}

function matchesQuery(note, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return note.text.toLowerCase().includes(q) || (note.source_title || "").toLowerCase().includes(q);
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

function isYesterday(ms) {
  const d = new Date(ms);
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return d.getFullYear() === y.getFullYear() && d.getMonth() === y.getMonth() && d.getDate() === y.getDate();
}

function dateLabel(ms) {
  if (isToday(ms)) return "Today";
  if (isYesterday(ms)) return "Yesterday";
  return formatDate(ms);
}

function groupByDate(list) {
  const groups = new Map();
  for (const note of list) {
    const label = dateLabel(note.created);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(note);
  }
  return groups;
}

function renderDivider(label) {
  const divider = document.createElement("div");
  divider.className = "divider";
  divider.textContent = label;
  return divider;
}

function matchesWhen(note, when) {
  if (when === "all") return true;
  if (when === "today") return isToday(note.created);
  const days = when === "week" ? 7 : 30;
  return Date.now() - note.created <= days * DAY_MS;
}

function matchesStatus(note, status) {
  if (status === "any") return true;
  return status === "archived" ? note.archived : !note.archived;
}

function matchesSource(note, source) {
  if (source === "any") return true;
  return source === "has_url" ? Boolean(note.source_url) : !note.source_url;
}

function render() {
  const category = filterEl.value;
  const query = queryEl.value.trim();
  const when = whenEl.value;
  const status = statusEl.value;
  const source = sourceEl.value;
  const filtered = notes.filter(
    (n) =>
      (category === "all" || n.category === category) &&
      matchesQuery(n, query) &&
      matchesWhen(n, when) &&
      matchesStatus(n, status) &&
      matchesSource(n, source)
  );

  listEl.innerHTML = "";

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Nothing here yet.";
    listEl.appendChild(empty);
    return;
  }

  const unreviewed = filtered.filter((n) => n.stage === 0);
  const reviewed = filtered.filter((n) => n.stage > 0);

  for (const [label, items] of groupByDate(unreviewed)) {
    listEl.appendChild(renderDivider(label));
    for (const note of items) listEl.appendChild(renderItem(note));
  }

  if (reviewed.length > 0) {
    listEl.appendChild(renderDivider("Reviewed"));
    for (const note of reviewed) listEl.appendChild(renderItem(note));
  }
}

filterEl.addEventListener("change", render);
whenEl.addEventListener("change", render);
statusEl.addEventListener("change", render);
sourceEl.addEventListener("change", render);
queryEl.addEventListener("input", render);

(async () => {
  populateFilter();
  notes = (await getAll()).sort((a, b) => b.created - a.created);
  render();
})();