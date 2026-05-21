// background.js - Manages browser actions and state
console.log("[Jarvis Extension] Service worker started.");

// Set up Chrome sidepanel open behavior (Chrome-only)
if (typeof chrome !== "undefined" && chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error("Error setting side panel behavior:", error));
}

// Track the last tab we interacted with or opened
let lastInteractedTabId = null;

// Helper: Add logs to chrome.storage for the sidepanel to render
async function logAction(action, status, detail, error = null) {
  try {
    const data = await chrome.storage.local.get({ logs: [] });
    const logs = data.logs;
    logs.unshift({
      timestamp: new Date().toISOString(),
      action,
      status,
      detail,
      error: error ? String(error) : null
    });
    // Keep last 50 logs
    if (logs.length > 50) logs.pop();
    await chrome.storage.local.set({ logs });
    
    // Broadcast event to active content scripts
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            source: "jarvis-extension-event",
            event: "log_updated",
            payload: { action, status, detail, error }
          }).catch(() => {
            // Ignore error for tabs without content scripts
          });
        }
      });
    });
  } catch (err) {
    console.error("Failed to save log:", err);
  }
}

// Helper: Wait for a tab to finish loading
function waitTabLoaded(tabId) {
  return new Promise((resolve) => {
    let completed = false;
    
    const listener = (id, info) => {
      if (id === tabId && info.status === "complete") {
        completed = true;
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    
    chrome.tabs.onUpdated.addListener(listener);
    
    // Safety timeout: 10s
    setTimeout(() => {
      if (!completed) {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }, 10000);
  });
}

// Listen to messages from content scripts (representing the webpage)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action } = message;

  if (action === "ping") {
    sendResponse({ status: "pong", version: "1.0.0" });
    return true;
  }

  if (action === "update_ai_status") {
    const { status, thought } = message;
    chrome.storage.local.set({
      aiStatus: {
        status,
        thought,
        timestamp: Date.now()
      }
    }).then(() => {
      sendResponse({ success: true });
    }).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  // Handle open_companion synchronously/immediately to preserve user gesture
  if (action === "open_companion") {
    const tabId = sender?.tab?.id;

    // Chrome Sidepanel opening
    if (typeof chrome !== "undefined" && chrome.sidePanel && chrome.sidePanel.open) {
      if (tabId) {
        chrome.sidePanel.open({ tabId })
          .then(() => {
            logAction(action, "success", "Opened companion sidepanel");
            sendResponse({ success: true });
          })
          .catch((err) => {
            logAction(action, "error", `Failed to open sidepanel: ${err.message}`, err);
            sendResponse({ success: false, error: err.message });
          });
        return true;
      }
    }

    // Firefox Sidebar opening
    if (typeof browser !== "undefined" && browser.sidebarAction && browser.sidebarAction.open) {
      browser.sidebarAction.open()
        .then(() => {
          logAction(action, "success", "Opened companion sidebar");
          sendResponse({ success: true });
        })
        .catch((err) => {
          logAction(action, "error", `Failed to open sidebar: ${err.message}`, err);
          sendResponse({ success: false, error: err.message });
        });
      return true;
    } else {
      // Firefox fallback namespace
      try {
        chrome.sidebarAction.open()
          .then(() => {
            logAction(action, "success", "Opened companion sidebar");
            sendResponse({ success: true });
          })
          .catch((err) => {
            logAction(action, "error", `Failed to open sidebar: ${err.message}`, err);
            sendResponse({ success: false, error: err.message });
          });
        return true;
      } catch (e) {
        logAction(action, "error", "Programmatic open not supported", e);
        sendResponse({ success: false, error: "Not supported" });
        return true;
      }
    }
  }

  // Handle other asynchronous commands
  handleBrowserCommand(message, sender)
    .then((result) => {
      sendResponse({ success: true, result });
    })
    .catch((err) => {
      sendResponse({ success: false, error: err.message || String(err) });
    });

  return true; // Keep channel open for async response
});

// Main router for browser actions
async function handleBrowserCommand(command, sender) {
  const { action, url, selector, query, script, description } = command;
  await logAction(action, "running", description || `Executing ${action}`);

  try {
    switch (action) {

      case "open_tab": {
        if (!url) throw new Error("URL is required to open a tab");
        const tab = await chrome.tabs.create({ url });
        lastInteractedTabId = tab.id;
        
        // Wait for page load
        await waitTabLoaded(tab.id);
        
        await logAction(action, "success", `Opened tab: ${url}`);
        return { tabId: tab.id, url: tab.url, status: "loaded" };
      }

      case "get_active_tab": {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error("No active tab found");
        lastInteractedTabId = tab.id;
        await logAction(action, "success", `Retrieved active tab: ${tab.title || tab.url}`);
        return { tabId: tab.id, url: tab.url, title: tab.title };
      }

      case "search": {
        if (!query) throw new Error("Search query is required");
        // Default search to google unless youtube is specified in description/url
        const isYoutube = query.toLowerCase().includes("youtube") || (url && url.includes("youtube"));
        const searchUrl = isYoutube 
          ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
          : `https://www.google.com/search?q=${encodeURIComponent(query)}`;
          
        const tab = await chrome.tabs.create({ url: searchUrl });
        lastInteractedTabId = tab.id;
        
        await waitTabLoaded(tab.id);
        await logAction(action, "success", `Searched for: "${query}"`);
        return { tabId: tab.id, url: tab.url, query };
      }

      case "click_element": {
        if (!selector) throw new Error("Selector is required to click an element");
        
        // Determine tab to run script in
        let targetTabId = lastInteractedTabId;
        if (!targetTabId) {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab) throw new Error("No active tab found to click element in");
          targetTabId = tab.id;
        }

        const results = await chrome.scripting.executeScript({
          target: { tabId: targetTabId },
          func: (sel) => {
            const el = document.querySelector(sel);
            if (el) {
              // Scroll element into view first
              el.scrollIntoView({ block: "center" });
              
              // Trigger click
              el.click();
              
              // Also check for standard anchor links that might need manual navigation if click() isn't caught
              if (el.tagName === "A" && el.href && !el.click) {
                window.location.href = el.href;
              }
              
              return { success: true, tagName: el.tagName, text: el.innerText || el.value };
            }
            return { success: false, error: `Element matching '${sel}' not found` };
          },
          args: [selector]
        });

        const executionResult = results[0]?.result;
        if (!executionResult || !executionResult.success) {
          throw new Error(executionResult?.error || "Failed to click element");
        }

        await logAction(action, "success", `Clicked element '${selector}' on tab ID ${targetTabId}`);
        return executionResult;
      }

      case "execute_script": {
        if (!script) throw new Error("Script is required to execute");

        let targetTabId = lastInteractedTabId;
        if (!targetTabId) {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab) throw new Error("No active tab found to execute script in");
          targetTabId = tab.id;
        }

        const results = await chrome.scripting.executeScript({
          target: { tabId: targetTabId },
          func: (codeStr) => {
            try {
              // Execute code in tab context
              const result = eval(codeStr);
              return { success: true, val: result };
            } catch (err) {
              return { success: false, error: err.message };
            }
          },
          args: [script]
        });

        const executionResult = results[0]?.result;
        if (!executionResult || !executionResult.success) {
          throw new Error(executionResult?.error || "Script execution failed");
        }

        await logAction(action, "success", `Executed custom script on tab ID ${targetTabId}`);
        return executionResult.val;
      }

      default:
        throw new Error(`Unsupported browser action: ${action}`);
    }
  } catch (err) {
    await logAction(action, "error", `Failed: ${err.message}`, err);
    throw err;
  }
}
