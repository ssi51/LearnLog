export const LADDER = [1, 3, 7, 21];
export const CATEGORIES = ["Uncategorized", "Engineering", "Tech", "Lifestyle", "Web Development", "Skincare"];

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_MS = 30 * DAY_MS;
const PURGE_MS = 7 * DAY_MS;

async function readNotes() {
  const { notes } = await chrome.storage.local.get("notes");
  return notes || [];
}

async function writeNotes(notes) {
  await chrome.storage.local.set({ notes });
}

export async function addNote(text, url = "", title = "", category = CATEGORIES[0]) {
  try {
    const now = Date.now();
    const note = {
      id: crypto.randomUUID(),
      text,
      source_url: url,
      source_title: title,
      category,
      created: now,
      next_review: now + LADDER[0] * DAY_MS,
      stage: 0,
      archived: false,
      deleted: false,
      deleted_at: null,
    };
    const notes = await readNotes();
    notes.push(note);
    await writeNotes(notes);
    return note;
  } catch (err) {
    console.error("LearnLog: failed to save note", err);
  }
}

export async function getDue() {
  const now = Date.now();
  const notes = await readNotes();
  return notes
    .filter((n) => !n.archived && !n.deleted && n.next_review <= now)
    .slice(0, 5);
}

export async function getAll() {
  const notes = await readNotes();
  return notes.filter((n) => !n.deleted);
}

export async function updateNote(id, patch) {
  const notes = await readNotes();
  const index = notes.findIndex((n) => n.id === id);
  if (index === -1) return;
  notes[index] = { ...notes[index], ...patch };
  await writeNotes(notes);
  return notes[index];
}

export async function advanceReview(id) {
  const notes = await readNotes();
  const index = notes.findIndex((n) => n.id === id);
  if (index === -1) return;
  const stage = notes[index].stage + 1;
  notes[index] =
    stage >= LADDER.length
      ? { ...notes[index], stage, archived: true }
      : { ...notes[index], stage, next_review: Date.now() + LADDER[stage] * DAY_MS };
  await writeNotes(notes);
  return notes[index];
}

export async function softDelete(id) {
  const notes = await readNotes();
  const index = notes.findIndex((n) => n.id === id);
  if (index === -1) return;
  notes[index] = { ...notes[index], deleted: true, deleted_at: Date.now() };
  await writeNotes(notes);
  return notes[index];
}

export async function restore(id) {
  const notes = await readNotes();
  const index = notes.findIndex((n) => n.id === id);
  if (index === -1) return;
  notes[index] = { ...notes[index], deleted: false, deleted_at: null };
  await writeNotes(notes);
  return notes[index];
}

export async function autoArchiveStale() {
  const now = Date.now();
  const notes = await readNotes();
  let changed = false;
  for (const note of notes) {
    if (!note.archived && !note.deleted && now - note.next_review > STALE_MS) {
      note.archived = true;
      changed = true;
    }
  }
  if (changed) await writeNotes(notes);
}

export async function purgeDeleted() {
  const now = Date.now();
  const notes = await readNotes();
  const remaining = notes.filter((n) => !(n.deleted && now - n.deleted_at > PURGE_MS));
  if (remaining.length !== notes.length) await writeNotes(remaining);
}