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

chrome.tabs.onRemoved.addListener((tabId) => {
  if (lastInteractedTabId === tabId) {
    lastInteractedTabId = null;
  }
});

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
            tab.url.includes("localhost:3000") ||
            tab.url.includes("127.0.0.1") ||
            tab.url.includes("sou842.github.io") ||
            tab.url.includes("assistant-nine-ecru.vercel.app") ||
            tab.url.includes("sourav-samnta-fabg.vercel.app")
          )
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

      case "run_agent": {
        if (!prompt) throw new Error("Agent prompt is required");
        // Append user prompt to chat history so it shows in companion panel
        try {
          const data = await chrome.storage.local.get({ chatHistory: [] });
          const chatHistory = data.chatHistory;
          chatHistory.push({
            role: "user",
            text: prompt,
            timestamp: Date.now()
          });
          if (chatHistory.length > 50) chatHistory.shift();
          await chrome.storage.local.set({ chatHistory });
        } catch (err) {
          console.error("Failed to append run_agent message to chat history:", err);
        }

        // Start agent loop asynchronously so it doesn't block the response
        runAgentLoop(prompt, model || "gemini-2.5-flash").catch(err => {
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

// GEMINI_API_KEY is retrieved securely from the backend

async function addAgentChatMessage(text) {
  try {
    const data = await chrome.storage.local.get({ chatHistory: [] });
    const chatHistory = data.chatHistory;
    chatHistory.push({
      role: "agent",
      text,
      timestamp: Date.now()
    });
    // Keep last 50 messages
    if (chatHistory.length > 50) chatHistory.shift();
    await chrome.storage.local.set({ chatHistory });
  } catch (err) {
    console.error("Failed to add agent chat message:", err);
  }
}

async function runAgentLoop(prompt, model) {
  await chrome.storage.local.set({ isAgentRunning: true, agentStopRequested: false });
  try {
    await logAction("agent", "running", `Starting Browser Agent [${model}] with goal: "${prompt}"`);
    await addAgentChatMessage(`🔍 Page analysis started [${model}] to accomplish your request: "${prompt}"`);

    const usageData = await chrome.storage.local.get({ currentTokenUsage: null });
    let promptTokens = usageData.currentTokenUsage?.prompt || 0;
    let completionTokens = usageData.currentTokenUsage?.completion || 0;
    let totalTokens = usageData.currentTokenUsage?.total || 0;

    let targetTabId = lastInteractedTabId;
    
    // Verify targetTabId is valid
    if (targetTabId) {
      try {
        await chrome.tabs.get(targetTabId);
      } catch (e) {
        targetTabId = null;
      }
    }

    if (!targetTabId) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        await logAction("agent", "error", "No active tab detected to start agent on.");
        await addAgentChatMessage("❌ No active tab detected to interact with.");
        return;
      }
      targetTabId = tab.id;
      lastInteractedTabId = targetTabId;
    }

    const maxSteps = 15;
    const actionHistory = [];
    for (let step = 1; step <= maxSteps; step++) {
      // Check if stop requested
      const stopCheck = await chrome.storage.local.get({ agentStopRequested: false });
      if (stopCheck.agentStopRequested) {
        await logAction("agent", "error", "Agent execution stopped by user.");
        await addAgentChatMessage("🛑 **Stopped by user.**");
        break;
      }

      try {
        // Get tab details to check for restricted URLs
        const tab = await chrome.tabs.get(targetTabId);
        const tabUrl = tab.url || "";
        const isRestricted = tabUrl.startsWith("chrome://") ||
          tabUrl.startsWith("chrome-extension://") ||
          tabUrl.startsWith("edge://") ||
          tabUrl.startsWith("about:");

        let pageData;
        let frameMapping = {};

        if (isRestricted) {
          pageData = {
            url: tabUrl,
            title: tab.title || "System Page",
            elements: []
          };
        } else {
          // 1. Extract DOM from all frames
          const domResults = await chrome.scripting.executeScript({
            target: { tabId: targetTabId, allFrames: true },
            func: () => {
              const interactiveSelectors = [
                'a', 'button', 'input', 'textarea', 'select',
                '[role="button"]', '[role="link"]', '[role="checkbox"]', '[role="menuitem"]',
                '[onclick]', '[cursor="pointer"]'
              ];
              const elements = [];
              let idx = 0;

              function traverse(root) {
                if (!root) return;
                if (root.nodeType === Node.ELEMENT_NODE) {
                  const el = root;
                  let isInteractive = false;
                  try {
                    isInteractive = el.matches(interactiveSelectors.join(','));
                  } catch (e) { }

                  if (isInteractive) {
                    const rect = el.getBoundingClientRect();
                    const style = window.getComputedStyle(el);
                    const isVisible = rect.width > 0 && rect.height > 0 &&
                      style.display !== 'none' &&
                      style.visibility !== 'hidden' &&
                      style.opacity !== '0';
                    if (isVisible) {
                      el.setAttribute('data-agent-id', String(idx));
                      const elData = { index: idx, tag: el.tagName.toLowerCase() };
                      const type = el.getAttribute('type'); if (type) elData.type = type;
                      const name = el.getAttribute('name'); if (name) elData.name = name;
                      const id = el.getAttribute('id'); if (id) elData.id = id;
                      const placeholder = el.getAttribute('placeholder'); if (placeholder) elData.placeholder = placeholder;
                      const ariaLabel = el.getAttribute('aria-label'); if (ariaLabel) elData.ariaLabel = ariaLabel;
                      const title = el.getAttribute('title'); if (title) elData.title = title;
                      const ariaPressed = el.getAttribute('aria-pressed'); if (ariaPressed !== null) elData.ariaPressed = ariaPressed;
                      const ariaChecked = el.getAttribute('aria-checked'); if (ariaChecked !== null) elData.ariaChecked = ariaChecked;
                      const ariaExpanded = el.getAttribute('aria-expanded'); if (ariaExpanded !== null) elData.ariaExpanded = ariaExpanded;
                      const text = el.innerText ? el.innerText.trim().substring(0, 80) : ""; if (text) elData.text = text;
                      const value = el.value ? el.value.substring(0, 100) : null; if (value) elData.value = value;
                      elements.push(elData);
                      idx++;
                    }
                  }

                  if (el.shadowRoot) {
                    traverse(el.shadowRoot);
                  }
                }

                let child = root.firstChild;
                while (child) {
                  traverse(child);
                  child = child.nextSibling;
                }
              }

              function clearAgentIds(root) {
                if (!root) return;
                if (root.nodeType === Node.ELEMENT_NODE) {
                  root.removeAttribute('data-agent-id');
                  if (root.shadowRoot) {
                    clearAgentIds(root.shadowRoot);
                  }
                }
                let child = root.firstChild;
                while (child) {
                  clearAgentIds(child);
                  child = child.nextSibling;
                }
              }

              if (document.body) {
                clearAgentIds(document.body);
                traverse(document.body);
              }

              return {
                url: window.location.href,
                title: document.title,
                elements: elements
              };
            }
          });

          const allElements = [];
          frameMapping = {};
          let globalIdx = 0;

          if (domResults && domResults.length > 0) {
            domResults.forEach(frameResult => {
              const frameId = frameResult.frameId;
              const framePageData = frameResult.result;
              if (!framePageData || !framePageData.elements) return;

              framePageData.elements.forEach(el => {
                const localIndex = el.index;
                const mappedElement = {
                  ...el,
                  index: globalIdx
                };
                allElements.push(mappedElement);
                frameMapping[globalIdx] = { frameId, localIndex };
                globalIdx++;
              });
            });

            const topFrameResult = domResults.find(r => r.frameId === 0) || domResults[0];
            pageData = {
              url: topFrameResult?.result?.url || "",
              title: topFrameResult?.result?.title || "",
              elements: allElements
            };
          } else {
            pageData = { url: "", title: "", elements: [] };
          }
        }

        if (!pageData) {
          throw new Error("Failed to extract page elements");
        }

        await logAction("dom_extraction", "success", JSON.stringify(pageData));
        await logAction("agent_reasoning", "running", `Step ${step}/${maxSteps}: Analyzing page and deciding next step...`);
        await addAgentChatMessage(`⚡ Step ${step}/${maxSteps}: Reading elements on the page...`);

        // 2. Query Gemini/OpenAI/Mistral API via queryLLM router
        const requestPayload = {
          prompt: prompt,
          model: model,
          step: step,
          maxSteps: maxSteps,
          url: pageData.url,
          title: pageData.title,
          elementsCount: pageData.elements.length
        };
        await logAction("api_call", "running", JSON.stringify(requestPayload));

        const llmResult = await queryLLM(model, prompt, step, maxSteps, pageData, actionHistory);
        const rawText = llmResult.text;

        promptTokens += llmResult.promptTokens;
        completionTokens += llmResult.completionTokens;
        totalTokens += llmResult.totalTokens;

        await chrome.storage.local.set({
          currentTokenUsage: {
            prompt: promptTokens,
            completion: completionTokens,
            total: totalTokens,
            model: model
          }
        });

        await logAction("api_response", "success", rawText);

        const decision = JSON.parse(rawText);
        await logAction("agent_decision", "running", `Thought: ${decision.thought}`);
        await addAgentChatMessage(`💡 *Thinking:* ${decision.thought}`);

        if (decision.action === "finish") {
          await logAction("agent", "success", `Agent complete! Answer: ${decision.answer}`);
          await addAgentChatMessage(`✅ **Completed successfully!** ${decision.answer}`);
          break;
        }

        switch (decision.action) {
          case "click": {
            const clickSelector = String(decision.selector);
            let globalIndex = null;
            const match = clickSelector.match(/data-agent-id=["']?(\d+)["']?/);
            if (match) globalIndex = parseInt(match[1], 10);
            else {
              const numMatch = clickSelector.match(/\d+/);
              if (numMatch) globalIndex = parseInt(numMatch[0], 10);
            }

            // Find element details in local dom copy to make log message user friendly
            const targetEl = pageData.elements.find(
              e => e.index === globalIndex
            );

            const detailStr = targetEl
              ? `"${targetEl.text || targetEl.ariaLabel || targetEl.title || targetEl.placeholder || targetEl.tag}"`
              : clickSelector;

            if (globalIndex === null) {
              throw new Error(`Invalid selector "${clickSelector}". You must provide the numeric data-agent-id (e.g. "[data-agent-id='15']").`);
            }

            const targetMapping = frameMapping[globalIndex];
            if (!targetMapping) {
              throw new Error(`Element with data-agent-id '${globalIndex}' is no longer valid or visible on the page.`);
            }

            await logAction("agent_action", "running", `Action: Clicking element matching ${clickSelector}`);
            await addAgentChatMessage(`👉 Clicking the ${detailStr} button/link`);

            const targetFrameId = targetMapping.frameId;
            const localIndex = targetMapping.localIndex;

            const clickResult = await chrome.scripting.executeScript({
              target: { tabId: targetTabId, frameIds: [targetFrameId] },
              func: async (localId) => {
                const el = (() => {
                  function search(root) {
                    if (!root) return null;
                    if (root.nodeType === Node.ELEMENT_NODE) {
                      if (root.getAttribute('data-agent-id') === String(localId)) return root;
                      if (root.shadowRoot) {
                        const found = search(root.shadowRoot);
                        if (found) return found;
                      }
                    }
                    let child = root.firstChild;
                    while (child) {
                      const found = search(child);
                      if (found) return found;
                      child = child.nextSibling;
                    }
                    return null;
                  }
                  return search(document.body);
                })();

                if (el) {
                  el.scrollIntoView({ block: "center" });

                  // Apply cyan highlight glow
                  const origOutline = el.style.outline;
                  const origShadow = el.style.boxShadow;
                  const origTransition = el.style.transition;

                  el.style.transition = "outline 0.2s ease, box-shadow 0.2s ease";
                  el.style.outline = "3px solid #00d2ff";
                  el.style.boxShadow = "0 0 15px #00d2ff";

                  await new Promise(resolve => setTimeout(resolve, 800));

                  // Restore styles
                  el.style.outline = origOutline;
                  el.style.boxShadow = origShadow;
                  el.style.transition = origTransition;

                  el.click();

                  return { success: true };
                }

                return {
                  success: false,
                  error: `Element with local agent id '${localId}' not found`
                };
              },
              args: [localIndex]
            });

            if (!clickResult[0]?.result?.success) {
              throw new Error(
                clickResult[0]?.result?.error || "Click failed"
              );
            }

            await logAction("agent_action", "success", "Clicked element successfully");

            break;
          }

          case "type": {
            const typeSelector = String(decision.selector);
            const textVal = decision.text || "";
            
            let globalIndex = null;
            const match = typeSelector.match(/data-agent-id=["']?(\d+)["']?/);
            if (match) globalIndex = parseInt(match[1], 10);
            else {
              const numMatch = typeSelector.match(/\d+/);
              if (numMatch) globalIndex = parseInt(numMatch[0], 10);
            }

            const targetEl = pageData.elements.find(
              e => e.index === globalIndex
            );

            const detailStr = targetEl
              ? `"${targetEl.placeholder || targetEl.ariaLabel || targetEl.title || targetEl.name || targetEl.tag}"`
              : typeSelector;

            if (globalIndex === null) {
              throw new Error(`Invalid selector "${typeSelector}". You must provide the numeric data-agent-id (e.g. "[data-agent-id='15']").`);
            }

            const targetMapping = frameMapping[globalIndex];
            if (!targetMapping) {
              throw new Error(`Element with data-agent-id '${globalIndex}' is no longer valid or visible on the page.`);
            }

            await logAction("agent_action", "running", `Action: Typing "${textVal}" into element matching ${typeSelector}`);
            await addAgentChatMessage(`✏️ Typing "${textVal}" into ${detailStr} field`);

            const targetFrameId = targetMapping.frameId;
            const localIndex = targetMapping.localIndex;

            const typeResult = await chrome.scripting.executeScript({
              target: { tabId: targetTabId, frameIds: [targetFrameId] },
              func: async (localId, val) => {
                const el = (() => {
                  function search(root) {
                    if (!root) return null;
                    if (root.nodeType === Node.ELEMENT_NODE) {
                      if (root.getAttribute('data-agent-id') === String(localId)) return root;
                      if (root.shadowRoot) {
                        const found = search(root.shadowRoot);
                        if (found) return found;
                      }
                    }
                    let child = root.firstChild;
                    while (child) {
                      const found = search(child);
                      if (found) return found;
                      child = child.nextSibling;
                    }
                    return null;
                  }
                  return search(document.body);
                })();

                if (el) {
                  el.scrollIntoView({ block: "center" });

                  // Apply purple highlight glow
                  const origOutline = el.style.outline;
                  const origShadow = el.style.boxShadow;
                  const origTransition = el.style.transition;

                  el.style.transition = "outline 0.2s ease, box-shadow 0.2s ease";

                  el.style.outline = "3px solid #9d4edd";
                  el.style.boxShadow = "0 0 15px #9d4edd";

                  await new Promise(resolve => setTimeout(resolve, 800));

                  // Restore styles
                  el.style.outline = origOutline;
                  el.style.boxShadow = origShadow;
                  el.style.transition = origTransition;

                  el.focus();
                  el.value = val;

                  el.dispatchEvent(new Event("input", { bubbles: true }));
                  el.dispatchEvent(new Event("change", { bubbles: true }));

                  const enterEvent = new KeyboardEvent("keydown", {
                    key: "Enter",
                    code: "Enter",
                    keyCode: 13,
                    which: 13,
                    bubbles: true
                  });

                  el.dispatchEvent(enterEvent);

                  return { success: true };
                }

                return {
                  success: false,
                  error: `Element with local agent id '${localId}' not found`
                };
              },
              args: [localIndex, textVal]
            });

            if (!typeResult[0]?.result?.success) {
              throw new Error(
                typeResult[0]?.result?.error || "Typing failed"
              );
            }

            await logAction("agent_action", "success", "Typed and submitted text successfully");

            break;
          }

          case "scroll": {
            const direction = decision.text === "up" ? -500 : 500;

            await logAction("agent_action", "running", `Action: Scrolling ${decision.text || "down"}`);

            await addAgentChatMessage(`📜 Scrolling the page ${decision.text || "down"}...`);

            await chrome.scripting.executeScript({
              target: { tabId: targetTabId },
              func: (y) => window.scrollBy(0, y),
              args: [direction]
            });

            await logAction("agent_action", "success", "Scrolled successfully");

            break;
          }

          case "navigate": {
            const destUrl = decision.url;
            let currentUrl = "";

            try {
              const curTab = await chrome.tabs.get(targetTabId);
              currentUrl = curTab.url || "";
            } catch (e) {
              // ignore
            }

            const getDomain = (u) => {
              try {
                return new URL(u).hostname.replace("www.", "");
              } catch (e) {
                return "";
              }
            };

            const currentDomain = getDomain(currentUrl);
            const destDomain = getDomain(destUrl);

            const isJarvisPage =
              currentUrl.includes("localhost:3000") ||
              currentUrl.includes("127.0.0.1") ||
              currentUrl.includes("sou842.github.io") ||
              currentUrl.includes("vercel.app");

            const shouldOpenNewTab =
              isJarvisPage ||
              !currentDomain ||
              currentDomain !== destDomain;

            if (shouldOpenNewTab) {
              await logAction("agent_action", "running", `Action: Opening new tab for ${destUrl}`);

              await addAgentChatMessage(`Opening new tab for: ${destUrl}`);

              const newTab = await chrome.tabs.create({
                url: destUrl
              });

              targetTabId = newTab.id;
              lastInteractedTabId = newTab.id;
            } else {
              await logAction("agent_action", "running", `Action: Navigating current tab to ${destUrl}`);
              await addAgentChatMessage(`Navigating current tab to: ${destUrl}`);
              await chrome.tabs.update(targetTabId, {
                url: destUrl
              });
            }

            await waitTabLoaded(targetTabId);
            await logAction("agent_action", "success", `Navigation completed`);

            break;
          }

          case "wait": {
            const ms = decision.milliseconds || 1000;

            await logAction("agent_action", "running", `Action: Waiting for ${ms}ms`);
            await addAgentChatMessage(`Waiting for ${ms / 1000}s for page to update...`);
            await new Promise(resolve => setTimeout(resolve, ms));
            await logAction("agent_action", "success", "Wait finished");

            break;
          }

          default: {
            throw new Error(`Unknown action: ${decision.action}`);
          }
        }

        if (decision.action !== "finish") {
          actionHistory.push(`Step ${step}: ${decision.action} on ${decision.selector || decision.url || decision.text || ''}`);
        }

        // Add a small delay between steps
        await new Promise(resolve => setTimeout(resolve, 1500));

      } catch (err) {
        await logAction("agent", "error", `Step ${step} failed: ${err.message}`, err);
        
        if (err.message.toLowerCase().includes("quota") || err.message.toLowerCase().includes("key") || err.message.toLowerCase().includes("rate limit")) {
          await addAgentChatMessage(`❌ **Failed at step ${step}:** ${err.message}`);
          break;
        }

        await addAgentChatMessage(`⚠️ **Step ${step} error:** ${err.message}`);
        actionHistory.push(`Step ${step} FAILED: ${err.message}`);
        // Loop continues to allow AI to self-correct
      }
    }
  } finally {
    await chrome.storage.local.set({ isAgentRunning: false });
  }
}

async function getBackendBaseUrl() {
  try {
    await fetch("http://localhost:3000");
    return "http://localhost:3000";
  } catch (e) {
    return "https://assistant-nine-ecru.vercel.app";
  }
}

async function queryLLM(model, prompt, step, maxSteps, pageData, actionHistory = []) {
  const compactElements = pageData.elements.map(e => {
    let s = `[data-agent-id="${e.index}"] ${e.tag}`;
    if (e.id) s += ` id="${e.id}"`;
    if (e.name) s += ` name="${e.name}"`;
    if (e.type) s += ` type="${e.type}"`;
    if (e.placeholder) s += ` placeholder="${e.placeholder}"`;
    if (e.ariaLabel) s += ` aria-label="${e.ariaLabel}"`;
    if (e.title) s += ` title="${e.title}"`;
    if (e.ariaPressed) s += ` aria-pressed="${e.ariaPressed}"`;
    if (e.ariaChecked) s += ` aria-checked="${e.ariaChecked}"`;
    if (e.ariaExpanded) s += ` aria-expanded="${e.ariaExpanded}"`;
    if (e.value) s += ` value="${e.value}"`;
    if (e.text) s += ` text="${e.text}"`;
    return s;
  }).join('\n');

  const historyText = actionHistory.length > 0 
    ? `\nPrevious actions taken:\n${actionHistory.join('\n')}\n`
    : "";

  const systemInstruction = `You are a browser control agent. Your goal is: "${prompt}"
Step: ${step}/${maxSteps}
Current page URL: ${pageData.url}
Current page title: ${pageData.title}
${historyText}
Here is a list of interactive elements found on the page:
${compactElements}

Please decide the next step to achieve the goal. Respond ONLY with a JSON object in the following format:
{
  "thought": "why you are taking this action and what you expect",
  "action": "click" | "type" | "scroll" | "navigate" | "wait" | "finish",
  "selector": "[data-agent-id='X']" where X is the index of the element (required for click/type),
  "text": "text value to input" (required for type),
  "url": "absolute URL to load" (required for navigate),
  "milliseconds": integer wait time (required for wait),
  "answer": "final message to the user explaining what you accomplished" (required for finish)
}

CRITICAL RULES:
1. If you have completed the user's request (e.g. submitted the search, filled out the form, navigated to the correct page, or confirmed the requested information is visible), you MUST immediately select "action": "finish" and explain what you accomplished in "answer". Do NOT continue to click or perform unnecessary actions.
2. If the user's goal is already satisfied by the current page view, immediately return "finish".`;

  const baseUrl = await getBackendBaseUrl();
  const response = await fetch(`${baseUrl}/api/extension/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      systemInstruction
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Backend Proxy Error: ${response.status} - ${errorText}`);
  }

  const resJson = await response.json();
  let text = resJson.text || "";
  text = text.trim();
  if (text.startsWith("```")) {
    const match = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (match && match[1]) {
      text = match[1].trim();
    }
  }

  return {
    text: text,
    promptTokens: resJson.promptTokens || 0,
    completionTokens: resJson.completionTokens || 0,
    totalTokens: resJson.totalTokens || 0
  };
}
