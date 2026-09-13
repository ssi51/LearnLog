function reportTheme() {
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  chrome.runtime.sendMessage({ type: "learnlog-theme", dark });
}

reportTheme();
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", reportTheme);