import { addNote, autoArchiveStale, purgeDeleted } from "./storage.js";

async function captureSelection(tab) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    const [{ result: text }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.__learnlogGetSelection(),
    });

    if (!text) return;

    await addNote(text, tab.url || "", tab.title || "");

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (msg) => window.__learnlogShowToast(msg),
      args: ["Saved"],
    });
  } catch (err) {
    console.error("LearnLog: capture failed", err);
  }
}

async function ensureOffscreenDocument() {
  try {
    if (chrome.offscreen.hasDocument && (await chrome.offscreen.hasDocument())) return;
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["MATCH_MEDIA"],
      justification: "Detect the browser's dark/light theme to pick the matching toolbar icon.",
    });
  } catch (err) {
    console.error("LearnLog: offscreen document setup failed", err);
  }
}

function setIconForTheme(dark) {
  const variant = dark ? "dark" : "light";
  chrome.action.setIcon({
    path: {
      16: `icons/${variant}/icon16.png`,
      48: `icons/${variant}/icon48.png`,
      128: `icons/${variant}/icon128.png`,
    },
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "learnlog-theme") return;
  setIconForTheme(message.dark);
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "learnlog-capture",
    title: "Save to LearnLog",
    contexts: ["selection"],
  });
  chrome.alarms.create("learnlog-daily", { periodInMinutes: 1440 });
  ensureOffscreenDocument();
});

chrome.runtime.onStartup.addListener(ensureOffscreenDocument);

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "learnlog-daily") return;
  await autoArchiveStale();
  await purgeDeleted();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "learnlog-capture" || !tab) return;
  await captureSelection(tab);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "capture-selection") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) await captureSelection(tab);
});