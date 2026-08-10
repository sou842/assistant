// background.js - Manages browser actions and state
try {
  importScripts('skills/index.js', 'skills/youtube.js', 'skills/naukri.js', 'skills/gmail.js', 'skills/whatsapp.js', 'skills/sheets.js', 'skills/google-maps.js');
  importScripts('helpers/emulator.js', 'helpers/agent.js');
} catch (e) {
  console.error("[Jarvis Skills/Helpers] Failed to load:", e);
}
console.log("[Jarvis Extension] Service worker started.");

// Set up Chrome sidepanel open behavior (Chrome-only)
if (typeof chrome !== "undefined" && chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error("Error setting side panel behavior:", error));
}

// Track the last tab we interacted with or opened
let lastInteractedTabId = null;
const pendingWorkflows = new Map();

// Global listener to abort pending workflows and reset states immediately on user stop request
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.agentStopRequested && changes.agentStopRequested.newValue === true) {
    chrome.storage.local.set({ isAgentRunning: false });
    // Proactively clean up overlay on all tabs immediately when user stops the agent
    chrome.tabs.query({}).then((tabs) => {
      for (const t of tabs) {
        if (t.id) {
          removeOceanWaves(t.id).catch(() => {});
        }
      }
    }).catch(() => {});

    for (const [messageId, { reject }] of pendingWorkflows.entries()) {
      try {
        reject(new Error("Agent stopped by user"));
      } catch (e) {
        console.error("Error rejecting pending workflow", e);
      }
      pendingWorkflows.delete(messageId);
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (lastInteractedTabId === tabId) {
    lastInteractedTabId = null;
  }
});

// Helper: Add logs to chrome.storage for the sidepanel to render
async function logAction(action, status, detail, error = null) {
  try {
    const data = await chrome.storage.local.get({ logs: [], settings: {} });
    const logs = data.logs;
    const settings = data.settings || {};
    
    if (settings.verboseLogs) {
      console.log(`[VERBOSE LOGS] [${action}] [${status}] Details: ${detail}`);
      if (error) console.error(`[VERBOSE LOGS] Error:`, error);
    }

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

// Helper: Handle notifications, sound alerts and auto-saves on agent finish
async function handleAgentFinish(isSuccess, promptText) {
  try {
    const { settings } = await chrome.storage.local.get({ settings: {} });
    const s = settings || {};

    // 1. Play Sound (sends message to sidepanel)
    if (s.soundAlerts) {
      chrome.runtime.sendMessage({ action: "PLAY_SOUND" }).catch(() => {});
    }

    // 2. Desktop Notification
    if (s.desktopAlerts !== false) { // Default to true
      chrome.notifications.create({
        type: "basic",
        iconUrl: chrome.runtime.getURL("icon.png"),
        title: isSuccess ? "Jarvis Action Completed" : "Jarvis Action Failed",
        message: isSuccess 
          ? `Successfully completed request: "${(promptText || "").substring(0, 60)}"`
          : `Failed to complete request: "${(promptText || "").substring(0, 60)}"`,
        priority: 2
      });
    }

    // 3. File System Auto-Save (delegated to UI so it works on Firefox)
    if (s.autoSaveEnabled && s.autoSavePath) {
      const { chatHistory } = await chrome.storage.local.get({ chatHistory: [] });
      if (chatHistory.length > 0) {
        chrome.runtime.sendMessage({
          action: "TRIGGER_DOWNLOAD",
          history: chatHistory,
          path: s.autoSavePath
        }).catch(() => {});
      }
    }
  } catch (e) {
    console.error("Failed in handleAgentFinish:", e);
  }
}

// Helper: Wait for a tab to finish loading
function waitTabLoaded(tabId) {
  return new Promise((resolve, reject) => {
    let completed = false;

    chrome.storage.local.get({ agentStopRequested: false }).then((data) => {
      if (data.agentStopRequested) {
        completed = true;
        reject(new Error("Agent stopped by user"));
        return;
      }

      const stopListener = (changes, areaName) => {
        if (areaName === "local" && changes.agentStopRequested && changes.agentStopRequested.newValue === true) {
          completed = true;
          chrome.tabs.onUpdated.removeListener(tabListener);
          chrome.storage.onChanged.removeListener(stopListener);
          reject(new Error("Agent stopped by user"));
        }
      };
      chrome.storage.onChanged.addListener(stopListener);

      const tabListener = (id, info) => {
        if (id === tabId && info.status === "complete") {
          completed = true;
          chrome.tabs.onUpdated.removeListener(tabListener);
          chrome.storage.onChanged.removeListener(stopListener);
          
          // Verify if tab successfully loaded or hit a network/DNS error page
          chrome.tabs.get(tabId).then((tab) => {
            if (tab && tab.url && (tab.url.startsWith("chrome-error://") || tab.url.includes("chromewebdata"))) {
              reject(new Error("Failed to load page: Network or DNS error."));
            } else {
              resolve();
            }
          }).catch(() => {
            resolve();
          });
        }
      };
      chrome.tabs.onUpdated.addListener(tabListener);

      // Safety timeout: 10s
      setTimeout(() => {
        if (!completed) {
          completed = true;
          chrome.tabs.onUpdated.removeListener(tabListener);
          chrome.storage.onChanged.removeListener(stopListener);
          resolve();
        }
      }, 10000);
    });
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
  const { action, url, selector, query, script, description, prompt, model } = command;
  await logAction(action, "running", description || `Executing ${action}`);

  try {
    switch (action) {

      case "send_prompt": {
        if (!prompt) throw new Error("Prompt is required to send to Jarvis");

        // Find existing Jarvis tab
        const tabs = await chrome.tabs.query({});
        const jarvisTab = tabs.find(tab =>
          tab.url && (
            tab.url.includes("localhost") ||
            tab.url.includes("127.0.0.1") ||
            tab.url.includes("assistant-nine-ecru.vercel.app")          )
        );

        if (jarvisTab) {
          // Activate tab and window
          await chrome.tabs.update(jarvisTab.id, { active: true });
          if (jarvisTab.windowId) {
            await chrome.windows.update(jarvisTab.windowId, { focused: true });
          }
          // Send prompt event
          await chrome.tabs.sendMessage(jarvisTab.id, {
            source: "jarvis-extension-event",
            event: "send_prompt",
            payload: { prompt }
          });
          await logAction(action, "success", `Sent prompt to Jarvis: "${prompt.substring(0, 40)}${prompt.length > 40 ? '...' : ''}"`);
          return { success: true, tabId: jarvisTab.id };
        } else {
          // Open a new Jarvis tab
          const tab = await chrome.tabs.create({ url: "http://localhost:3000/ai" });
          lastInteractedTabId = tab.id;
          await waitTabLoaded(tab.id);

          // Wait 1.2s for listener to register
          await new Promise(resolve => setTimeout(resolve, 1200));

          await chrome.tabs.sendMessage(tab.id, {
            source: "jarvis-extension-event",
            event: "send_prompt",
            payload: { prompt }
          });
          await logAction(action, "success", `Opened Jarvis and sent prompt: "${prompt.substring(0, 40)}${prompt.length > 40 ? '...' : ''}"`);
          return { success: true, tabId: tab.id };
        }
      }

      case "open_tab": {
        if (!url) throw new Error("URL is required to open a tab");
        const tab = await chrome.tabs.create({ url });
        lastInteractedTabId = tab.id;

        // Wait for page load
        await waitTabLoaded(tab.id);

        await logAction(action, "success", `Opened tab: ${url}`);
        return { tabId: tab.id, url: tab.url, status: "loaded" };
      }

      case "proxy_get": {
        const tabs = await chrome.tabs.query({});
        const jarvisTab = tabs.find(tab =>
          tab.url && (
            tab.url.includes("localhost") ||
            tab.url.includes("127.0.0.1") ||
            tab.url.includes("assistant-nine-ecru.vercel.app")
          )
        );

        if (!jarvisTab) {
          throw new Error("Jarvis dashboard tab must be open in the browser to load workflows.");
        }

        const res = await executeTabMessageProxy(jarvisTab.id, {
          action: "ajax_get",
          url: command.url
        });
        return res;
      }

      case "proxy_post": {
        const tabs = await chrome.tabs.query({});
        const jarvisTab = tabs.find(tab =>
          tab.url && (
            tab.url.includes("localhost") ||
            tab.url.includes("127.0.0.1") ||
            tab.url.includes("assistant-nine-ecru.vercel.app")
          )
        );

        if (!jarvisTab) {
          throw new Error("Jarvis dashboard tab must be open in the browser to save workflows.");
        }

        const res = await executeTabMessageProxy(jarvisTab.id, {
          action: "ajax_post",
          url: command.url,
          data: command.data
        });
        return res;
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


      case "run_workflow": {
        if (!script) throw new Error("Workflow script is required");
        const inputs = command.inputs || {};
        
        await addAgentChatMessage(`🚀 **Starting Workflow Execution...**`);

        try {
          const cleanedScript = cleanScriptCode(script);
          let runnerCode = cleanedScript;
          if (/async\s+function\s+workflow\b/.test(cleanedScript) || /function\s+workflow\b/.test(cleanedScript)) {
            runnerCode += "\nreturn await workflow(browser, __inputs);";
          } else if (/async\s+function\s+main\b/.test(cleanedScript) || /function\s+main\b/.test(cleanedScript)) {
            runnerCode += "\nreturn await main(browser, __inputs);";
          }
          const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
          
          const executeSubWorkflow = async (workflowId, subInputs = {}) => {
            await addAgentChatMessage(`⚙️ Fetching sub-workflow: ${workflowId}`);
            const baseUrl = await getBackendBaseUrl();
            const res = await fetch(`${baseUrl}/api/workflows/${workflowId}`);
            const data = await res.json();
            if (!data.success || !data.data) {
              throw new Error(`Failed to load sub-workflow ${workflowId}: ${data.error}`);
            }
            const subScript = data.data.script;
            const subCleaned = cleanScriptCode(subScript);
            let subRunnerCode = subCleaned;
            if (/async\s+function\s+workflow\b/.test(subCleaned) || /function\s+workflow\b/.test(subCleaned)) {
              subRunnerCode += "\nreturn await workflow(browser, __inputs);";
            } else if (/async\s+function\s+main\b/.test(subCleaned) || /function\s+main\b/.test(subCleaned)) {
              subRunnerCode += "\nreturn await main(browser, __inputs);";
            }
            const subRunner = new AsyncFunction('browser', '__inputs', 'runWorkflow', subRunnerCode);
            await addAgentChatMessage(`⚙️ Executing sub-workflow: ${data.data.title}`);
            return await subRunner(browserImpl, subInputs, executeSubWorkflow);
          };

          const runner = new AsyncFunction('browser', '__inputs', 'runWorkflow', runnerCode);
          
          const result = await runner(browserImpl, inputs, executeSubWorkflow);
          await logAction(action, "success", `Workflow executed successfully`);
          if (result && result.success) {
            await addAgentChatMessage(`✅ Workflow finished successfully! Result: ${JSON.stringify(result)}`);
          } else if (result && result.success === false) {
            await addAgentChatMessage(`⚠️ Workflow reported failure: ${result.error || "Unknown error"}`);
          } else {
            await addAgentChatMessage(`✅ Workflow completed.`);
          }
          return result;
        } catch (err) {
          await addAgentChatMessage(`❌ Workflow error: ${err.message}`);
          throw new Error(`Workflow error: ${err.message}`);
        }
      }

      case "run_workflow_sandbox": {
        return new Promise((resolve, reject) => {
          const messageId = Date.now().toString();
          
          pendingWorkflows.set(messageId, { resolve, reject, isManual: command.isManual });
          
          chrome.runtime.sendMessage({
            action: "RUN_WORKFLOW_SANDBOX",
            script: script,
            inputs: command.inputs || {},
            messageId: messageId,
            isManual: command.isManual
          }, (response) => {
            if (chrome.runtime.lastError) {
              pendingWorkflows.delete(messageId);
              reject(new Error("Please open the Jarvis side panel to execute this workflow. The sandbox environment is required."));
            }
          });
        });
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

      case "log_sandbox_start": {
        await addAgentChatMessage(`⚙️ Starting Workflow Execution...`);
        return { success: true };
      }

      case "log_sandbox_result": {
        const { success: sandboxSuccess, result, error, messageId } = command;
        
        let isManual = command.isManual || false;
        if (messageId && pendingWorkflows.has(messageId)) {
          isManual = pendingWorkflows.get(messageId).isManual;
        }

          if (sandboxSuccess) {
            const formattedResult = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
            if (isManual) {
              await addAgentChatMessage(`✅ **Workflow finished successfully!**\n\n\`\`\`json\n${formattedResult}\n\`\`\``);
            } else {
              await addAgentChatMessage(`⚙️ Workflow finished successfully! Result: ${JSON.stringify(result)}`);
            }
          } else {
            await addAgentChatMessage(`🚨 Workflow error: ${error || "Unknown error"}`);
          }


        if (messageId && pendingWorkflows.has(messageId)) {
          const { resolve } = pendingWorkflows.get(messageId);
          pendingWorkflows.delete(messageId);
          resolve({ success: sandboxSuccess, result, error });
        }
        return { success: true };
      }


      case "execute_sandbox_command": {
        return await executeSandboxCommand(command);
      }


      case "run_agent": {
        if (!prompt) throw new Error("Agent prompt is required");
        // User prompt is already appended to chatHistory by sidepanel.js for instant UI responsiveness

        // Start agent loop asynchronously so it doesn't block the response
        runAgentLoop(prompt, model || "mistral-small-latest", command.chatId, sender).catch(err => {
          console.error("Agent error:", err);
        });
        return { status: "started" };
      }

      default:
        throw new Error(`Unsupported browser action: ${action}`);
    }
  } catch (err) {
    await logAction(action, "error", `Failed: ${err.message}`, err);
    throw err;
  }
}


async function addAgentChatMessage(text) {
  try {
    const data = await chrome.storage.local.get({ chatHistory: [] });
    const chatHistory = data.chatHistory;
    chatHistory.push({
      role: "agent",
      text,
      timestamp: Date.now()
    });
    // Keep last 500 messages so beginning chat doesn't disappear during long tasks
    if (chatHistory.length > 500) chatHistory.shift();
    await chrome.storage.local.set({ chatHistory });
  } catch (err) {
    console.error("Failed to add agent chat message:", err);
  }
}

