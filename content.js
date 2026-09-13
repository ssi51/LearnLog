if (!window.__learnlogInjected) {
  window.__learnlogInjected = true;

  window.__learnlogGetSelection = function () {
    return window.getSelection().toString().trim();
  };

  window.__learnlogShowToast = function (message, duration = 1000) {
    const toast = document.createElement("div");
    toast.textContent = message;
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "16px",
      right: "16px",
      zIndex: "2147483647",
      background: "#1a1a1a",
      color: "#eee",
      padding: "10px 14px",
      borderRadius: "6px",
      fontSize: "14px",
      fontFamily: "sans-serif",
      opacity: "1",
      transition: "opacity 0.3s ease",
    });
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, duration);
  };
}