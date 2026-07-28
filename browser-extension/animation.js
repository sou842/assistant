(function() {
  let overlay = null;
  let styleEl = null;

  function injectOverlay() {
    if (document.getElementById("jarvis-ocean-waves-overlay")) {
      overlay = document.getElementById("jarvis-ocean-waves-overlay");
      if (overlay) overlay.style.opacity = "1";
      return;
    }

    if (!document.head || !document.body) {
      // Retrying if head or body is not ready yet
      setTimeout(injectOverlay, 50);
      return;
    }

    styleEl = document.createElement("style");
    styleEl.id = "jarvis-ocean-waves-style";
    styleEl.textContent = `
      @keyframes jarvis-glow-pulse {
        0% { box-shadow: inset 0 0 12px rgba(0, 191, 255, 0.35), 0 0 8px rgba(0, 191, 255, 0.25); }
        50% { box-shadow: inset 0 0 24px rgba(0, 229, 255, 0.6), 0 0 16px rgba(0, 229, 255, 0.45); }
        100% { box-shadow: inset 0 0 12px rgba(0, 191, 255, 0.35), 0 0 8px rgba(0, 191, 255, 0.25); }
      }
      .jarvis-overlay-wrapper {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 2147483647;
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
        box-sizing: border-box;
      }
      .jarvis-ai-glow-border {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        box-sizing: border-box;
        border: 3px solid rgba(0, 191, 255, 0.45);
        animation: jarvis-glow-pulse 3s ease-in-out infinite;
        pointer-events: none;
      }
    `;
    document.head.appendChild(styleEl);

    overlay = document.createElement("div");
    overlay.id = "jarvis-ocean-waves-overlay";
    overlay.className = "jarvis-overlay-wrapper";
    overlay.innerHTML = `<div class="jarvis-ai-glow-border"></div>`;
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
    });
  }

  function removeOverlay() {
    const el = document.getElementById("jarvis-ocean-waves-overlay");
    if (el) {
      el.style.opacity = "0";
      setTimeout(() => {
        // Double check it still exists before removing
        const currentEl = document.getElementById("jarvis-ocean-waves-overlay");
        if (currentEl && currentEl.parentNode) {
          currentEl.parentNode.removeChild(currentEl);
        }
        const style = document.getElementById("jarvis-ocean-waves-style");
        if (style && style.parentNode) {
          style.parentNode.removeChild(style);
        }
      }, 300);
    }
  }

  // Check initial state
  chrome.storage.local.get({ isAgentAutomating: false }, (res) => {
    if (res.isAgentAutomating) {
      if (document.readyState === "complete" || document.readyState === "interactive") {
        injectOverlay();
      } else {
        document.addEventListener("DOMContentLoaded", injectOverlay);
      }
    }
  });

  // Listen for changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.isAgentAutomating) {
      if (changes.isAgentAutomating.newValue) {
        injectOverlay();
      } else {
        removeOverlay();
      }
    }
  });
})();
