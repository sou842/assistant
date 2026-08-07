(function() {
  let overlay = null;
  let styleEl = null;
  let focusModeActive = false;
  let focusInterval = null;

  function injectStyles() {
    if (document.getElementById("jarvis-styles")) return;
    if (!document.head) {
      setTimeout(injectStyles, 50);
      return;
    }

    const style = document.createElement("style");
    style.id = "jarvis-styles";
    style.textContent = `
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
      .jarvis-focus-hover {
        outline: 3px solid rgba(255, 140, 0, 0.9) !important;
        outline-offset: -3px !important;
        cursor: crosshair !important;
      }
      [data-jarvis-focus-step] {
        outline: 1.5px solid rgba(46, 204, 113, 0.7) !important;
        outline-offset: -1.5px !important;
      }
      [data-jarvis-focus-step].jarvis-focus-active {
        outline: 1.5px solid rgba(46, 204, 113, 0.9) !important;
        outline-offset: -1.5px !important;
        box-shadow: 0 0 10px rgba(46, 204, 113, 0.6) !important;
      }
    `;
    document.head.appendChild(style);
  }

  function injectOverlay() {
    if (document.getElementById("jarvis-ocean-waves-overlay")) {
      overlay = document.getElementById("jarvis-ocean-waves-overlay");
      if (overlay) overlay.style.opacity = "1";
      return;
    }

    if (!document.body) {
      setTimeout(injectOverlay, 50);
      return;
    }

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
        const currentEl = document.getElementById("jarvis-ocean-waves-overlay");
        if (currentEl && currentEl.parentNode) {
          currentEl.parentNode.removeChild(currentEl);
        }
      }, 300);
    }
  }

  function isDynamicId(id) {
    if (!id) return true;
    if (id.includes("headlessui-")) return true;
    if (/-\d+$/.test(id) && id.split('-').length > 2) return true;
    if (/[a-f0-9]{8,}/.test(id)) return true;
    return false;
  }

  // --- Focus Mode Selection Logic ---
  function getUniqueSelector(el) {
    let path = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.nodeName.toLowerCase();
      
      // If we find a stable ID, we can prepend it and stop climbing
      if (el.id && !isDynamicId(el.id)) {
        path.unshift(`#${CSS.escape(el.id)}`);
        break;
      }
      
      if (el.className && typeof el.className === "string") {
        const classes = Array.from(el.classList)
          .filter(c => !c.startsWith('jarvis-') && !c.includes(':') && !c.includes('[') && c.length < 30)
          .map(c => `.${CSS.escape(c)}`)
          .join('');
        if (classes) selector += classes;
      }
      let sibling = el.previousElementSibling;
      let nth = 1;
      while (sibling) {
        if (sibling.nodeName === el.nodeName) {
          nth++;
        }
        sibling = sibling.previousElementSibling;
      }
      selector += `:nth-of-type(${nth})`;
      path.unshift(selector);
      el = el.parentElement;
    }
    return path.join(' > ');
  }

  function onMouseOver(e) {
    e.target.classList.add("jarvis-focus-hover");
  }

  function onMouseOut(e) {
    e.target.classList.remove("jarvis-focus-hover");
  }

  async function onClick(e) {
    e.preventDefault();
    e.stopPropagation();

    const selector = getUniqueSelector(e.target);
    const tagName = e.target.tagName.toLowerCase();
    const textText = e.target.innerText ? e.target.innerText.trim().substring(0, 30) : "";
    const description = `${tagName}${textText ? ` ("${textText}")` : ""}`;

    // Get current focus chain
    const data = await chrome.storage.local.get({ focusChain: [] });
    const focusChain = data.focusChain || [];
    focusChain.push({ selector, description, timestamp: Date.now() });

    await chrome.storage.local.set({ 
      focusChain, 
      isFocusModeEnabled: false // Turn off selection mode after click
    });

    // Clean up current hover outline
    e.target.classList.remove("jarvis-focus-hover");
  }

  function enableFocusSelection() {
    if (focusModeActive) return;
    focusModeActive = true;
    document.addEventListener("mouseover", onMouseOver, true);
    document.addEventListener("mouseout", onMouseOut, true);
    document.addEventListener("click", onClick, true);
  }

  function disableFocusSelection() {
    if (!focusModeActive) return;
    focusModeActive = false;
    document.removeEventListener("mouseover", onMouseOver, true);
    document.removeEventListener("mouseout", onMouseOut, true);
    document.removeEventListener("click", onClick, true);
    
    // Clean up any remaining hover classes
    document.querySelectorAll(".jarvis-focus-hover").forEach(el => {
      el.classList.remove("jarvis-focus-hover");
    });
  }

  // --- Target Highlighting Logic ---
  function startTargetHighlighting() {
    if (focusInterval) clearInterval(focusInterval);
    
    focusInterval = setInterval(() => {
      chrome.storage.local.get({ focusChain: [], focusChainIndex: 0 }, (data) => {
        const chain = data.focusChain || [];
        const index = data.focusChainIndex || 0;
        
        // Remove styling and attributes from all elements first
        document.querySelectorAll("[data-jarvis-focus-step]").forEach(el => {
          el.removeAttribute("data-jarvis-focus-step");
          el.classList.remove("jarvis-focus-active");
        });

        chain.forEach((step, idx) => {
          if (step && step.selector) {
            try {
              const targetEl = document.querySelector(step.selector);
              if (targetEl) {
                targetEl.setAttribute("data-jarvis-focus-step", String(idx));
                if (idx === index) {
                  targetEl.classList.add("jarvis-focus-active");
                }
              }
            } catch (err) {
              // Ignore selector errors
            }
          }
        });
      });
    }, 250);
  }

  // Init
  injectStyles();
  chrome.storage.local.get({ 
    isAgentAutomating: false, 
    isFocusModeEnabled: false 
  }, (res) => {
    if (res.isAgentAutomating) {
      if (document.readyState === "complete" || document.readyState === "interactive") injectOverlay();
      else document.addEventListener("DOMContentLoaded", injectOverlay);
    }
    if (res.isFocusModeEnabled) {
      enableFocusSelection();
    }
    startTargetHighlighting();
  });

  // Listen for changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      if (changes.isAgentAutomating) {
        if (changes.isAgentAutomating.newValue) injectOverlay();
        else removeOverlay();
      }
      if (changes.isFocusModeEnabled) {
        if (changes.isFocusModeEnabled.newValue) enableFocusSelection();
        else disableFocusSelection();
      }
    }
  });
})();
