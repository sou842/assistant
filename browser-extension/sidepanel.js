// sidepanel.js - Controls sidepanel UI, chat history, and logs
console.log("[Jarvis Extension] Sidepanel chat script loaded.");

// DOM Elements
const statusDot = document.getElementById("statusDot");
const activeTabInfo = document.getElementById("activeTabInfo");
const chatArea = document.getElementById("chatArea");
const consoleLogsSection = document.getElementById("consoleLogsSection");
const consoleLogs = document.getElementById("consoleLogs");
const btnClearLogs = document.getElementById("btnClearLogs");
const cmdInput = document.getElementById("cmdInput");
const btnToggleLog = document.getElementById("btnToggleLog");
const btnRunScript = document.getElementById("btnRunScript");
const btnSend = document.getElementById("btnSend");
const btnStop = document.getElementById("btnStop");
const modelSelect = document.getElementById("modelSelect");
const tokenUsage = document.getElementById("tokenUsage");

// New Chat & History Elements
const btnNewChat = document.getElementById("btnNewChat");
const btnToggleHistory = document.getElementById("btnToggleHistory");
const historyPanel = document.getElementById("historyPanel");
const btnCloseHistory = document.getElementById("btnCloseHistory");
const historyList = document.getElementById("historyList");

// State
let currentChatId = "";

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  updateActiveTabInfo();
  loadLogs();
  await initChatSession();
  checkJarvisConnection();

  // Load saved token usage
  chrome.storage.local.get({ currentTokenUsage: null }, (res) => {
    updateTokenUsageDisplay(res.currentTokenUsage);
  });

  // Load saved model selection
  chrome.storage.local.get({ selectedModel: "mistral-small-latest", isAgentRunning: false }, (res) => {
    if (res.selectedModel) {
      modelSelect.value = res.selectedModel;
    }
    updateAgentRunningState(res.isAgentRunning);
  });

  // Save selection on change
  modelSelect.addEventListener("change", () => {
    chrome.storage.local.set({ selectedModel: modelSelect.value });
  });

  // Poll active tab and connection status every 2 seconds
  setInterval(() => {
    updateActiveTabInfo();
    checkJarvisConnection();
  }, 2000);

  // Auto-resize textarea as user types
  cmdInput.addEventListener("input", () => {
    cmdInput.style.height = "auto";
    cmdInput.style.height = (cmdInput.scrollHeight - 4) + "px";
  });
});

// Initialize or restore current chat session
async function initChatSession() {
  const data = await chrome.storage.local.get(["currentChatId"]);
  if (data.currentChatId) {
    currentChatId = data.currentChatId;
  } else {
    currentChatId = "chat-" + Date.now();
    await chrome.storage.local.set({ currentChatId });
  }
  await loadChatHistory();
}

// Load Chat History from chrome.storage
async function loadChatHistory() {
  try {
    const data = await chrome.storage.local.get({ chatHistory: [] });
    renderChatHistory(data.chatHistory);
  } catch (err) {
    console.error("Error loading chat history:", err);
  }
}

// Render Chat history
function renderChatHistory(history) {
  const defaultWelcome = `
    <div class="chat-bubble agent">
      Hello! I am your Jarvis Browser Agent. Type any command below (e.g. "search Google for cat pictures") to control this browser tab.
      <span class="timestamp">System</span>
    </div>
  `;

  if (!history || history.length === 0) {
    chatArea.innerHTML = defaultWelcome;
    return;
  }

  chatArea.innerHTML = history.map(msg => {
    const isUser = msg.role === "user";
    const bubbleClass = isUser ? "user" : "agent";
    const senderName = isUser ? "You" : "Jarvis";
    const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Simple markdown formatting helper
    let formattedText = msg.text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");

    return `
      <div class="chat-bubble ${bubbleClass}">
        ${formattedText}
        <span class="timestamp">${senderName} • ${timeStr}</span>
      </div>
    `;
  }).join("");

  // Scroll to bottom
  chatArea.scrollTop = chatArea.scrollHeight;
}

// Load Logs from chrome.storage
async function loadLogs() {
  try {
    const data = await chrome.storage.local.get({ logs: [] });
    renderLogs(data.logs);
  } catch (err) {
    console.error("Error loading logs:", err);
  }
}

// Render Logs into DOM
function renderLogs(logs) {
  if (!logs || logs.length === 0) {
    consoleLogs.innerHTML = `<div style="color: var(--text-muted); text-align: center; margin-top: 10px;">No logs recorded yet.</div>`;
    return;
  }

  consoleLogs.innerHTML = logs.map(log => {
    const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    let statusClass = "status-running";
    let statusText = "⚡ Running";
    if (log.status === "success") {
      statusClass = "status-success";
      statusText = "✓ Success";
    } else if (log.status === "error") {
      statusClass = "status-error";
      statusText = `✗ Error: ${log.error || "Failed"}`;
    }

    let detailedContent = log.detail;
    if (log.detail && (log.detail.trim().startsWith('{') || log.detail.trim().startsWith('['))) {
      try {
        const parsed = JSON.parse(log.detail);
        detailedContent = `<pre style="font-family: 'JetBrains Mono', monospace; font-size: 10px; background: rgba(0,0,0,0.4); padding: 6px; border-radius: 6px; overflow-x: auto; margin-top: 4px; border: 1px solid var(--border); white-space: pre-wrap; max-width: 100%; word-break: break-all; color: #a5f3fc;">${JSON.stringify(parsed, null, 2)}</pre>`;
      } catch (e) {
        // Fallback to text
      }
    }

    return `
      <div class="log-entry">
        <div class="log-header">
          <span class="log-action ${log.action}">${log.action}</span>
          <span class="log-time">${timeStr}</span>
        </div>
        <div class="log-detail">${detailedContent}</div>
        <div class="log-status ${statusClass}">${statusText}</div>
      </div>
    `;
  }).join("");
}

// Load and Render History Panel
async function loadHistoryPanel() {
  try {
    const data = await chrome.storage.local.get({ savedChats: [] });
    const savedChats = data.savedChats;

    if (savedChats.length === 0) {
      historyList.innerHTML = `<div style="color: var(--text-muted); text-align: center; margin-top: 40px; font-size: 12.5px;">No saved conversations yet.</div>`;
      return;
    }

    historyList.innerHTML = savedChats.map(c => {
      const activeStyle = c.id === currentChatId ? "border-color: var(--primary); background: rgba(0, 210, 255, 0.05);" : "";
      const dateStr = new Date(c.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      return `
        <div class="history-item" style="border: 1px solid var(--border); padding: 10px; border-radius: 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; ${activeStyle}" data-chat-id="${c.id}">
          <div class="history-info" style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px;" data-chat-id="${c.id}">
            <div style="font-size: 13px; font-weight: 500; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; pointer-events: none;">${c.title}</div>
            <div style="font-size: 10px; color: var(--text-muted); pointer-events: none;">${dateStr}</div>
          </div>
          <button class="btn-delete-chat" data-chat-id="${c.id}" style="padding: 4px 8px; font-size: 10px; border: 1px solid rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.03); color: var(--error); border-radius: 6px;">Delete</button>
        </div>
      `;
    }).join("");

    // Hook click select handlers
    historyList.querySelectorAll(".history-item").forEach(item => {
      item.addEventListener("click", async (e) => {
        if (e.target.classList.contains("btn-delete-chat")) return;
        const targetId = e.currentTarget.getAttribute("data-chat-id");
        await selectChatConversation(targetId);
      });
    });

    // Hook delete handlers
    historyList.querySelectorAll(".btn-delete-chat").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const targetId = e.target.getAttribute("data-chat-id");
        await deleteChatConversation(targetId);
      });
    });

  } catch (err) {
    console.error("Failed to load history list:", err);
  }
}

// Select a chat from history
async function selectChatConversation(chatId) {
  currentChatId = chatId;
  await chrome.storage.local.set({ currentChatId });

  const data = await chrome.storage.local.get({ savedChats: [] });
  const selected = data.savedChats.find(c => c.id === chatId);
  
  const messages = selected ? selected.messages : [];
  await chrome.storage.local.set({ chatHistory: messages });
  renderChatHistory(messages);

  historyPanel.style.display = "none";
}

// Delete a conversation from history
async function deleteChatConversation(chatId) {
  try {
    const data = await chrome.storage.local.get({ savedChats: [] });
    const filtered = data.savedChats.filter(c => c.id !== chatId);
    await chrome.storage.local.set({ savedChats: filtered });

    // If active chat is deleted, trigger new chat
    if (chatId === currentChatId) {
      await createNewChatSession();
    } else {
      await loadHistoryPanel();
    }
  } catch (err) {
    console.error("Failed to delete chat:", err);
  }
}

// Sync active chatHistory to saved list reactively
async function syncChatHistoryToSaved(chatHistory) {
  try {
    const data = await chrome.storage.local.get({ savedChats: [] });
    let savedChats = data.savedChats;

    let activeChat = savedChats.find(c => c.id === currentChatId);
    if (!activeChat) {
      // Find first user message for title
      const firstMsg = chatHistory.find(m => m.role === "user");
      const title = firstMsg ? (firstMsg.text.substring(0, 30) + (firstMsg.text.length > 30 ? "..." : "")) : "New Chat";
      activeChat = {
        id: currentChatId,
        title,
        timestamp: Date.now(),
        messages: chatHistory
      };
      savedChats.unshift(activeChat);
    } else {
      activeChat.messages = chatHistory;
      activeChat.timestamp = Date.now();
      if (activeChat.title === "New Chat") {
        const firstMsg = chatHistory.find(m => m.role === "user");
        if (firstMsg) {
          activeChat.title = firstMsg.text.substring(0, 30) + (firstMsg.text.length > 30 ? "..." : "");
        }
      }
    }

    // Filter out empty chats to keep lists clean
    savedChats = savedChats.filter(c => c.messages.length > 0 || c.id === currentChatId);
    await chrome.storage.local.set({ savedChats });
  } catch (err) {
    console.error("Failed to sync chat history:", err);
  }
}

// Update token usage UI
function updateTokenUsageDisplay(usage) {
  if (usage && usage.total > 0) {
    tokenUsage.innerText = `${usage.total.toLocaleString()} tokens`;
    tokenUsage.title = `Prompt: ${usage.prompt.toLocaleString()} | Completion: ${usage.completion.toLocaleString()}\nModel: ${usage.model}`;
    tokenUsage.style.display = "inline-block";
  } else {
    tokenUsage.style.display = "none";
    tokenUsage.innerText = "0 tokens";
  }
}

// Start a fresh new chat session
async function createNewChatSession() {
  currentChatId = "chat-" + Date.now();
  await chrome.storage.local.set({ currentChatId, chatHistory: [], currentTokenUsage: null });
  renderChatHistory([]);
  updateTokenUsageDisplay(null);
  historyPanel.style.display = "none";
}

// Listen for storage changes to update chat and logs in real-time
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    if (changes.logs) {
      renderLogs(changes.logs.newValue);
    }
    if (changes.chatHistory) {
      renderChatHistory(changes.chatHistory.newValue);
      syncChatHistoryToSaved(changes.chatHistory.newValue);
    }
    if (changes.currentTokenUsage) {
      updateTokenUsageDisplay(changes.currentTokenUsage.newValue);
    }
    if (changes.isAgentRunning) {
      updateAgentRunningState(changes.isAgentRunning.newValue);
    }
  }
});

// Update active tab display
async function updateActiveTabInfo() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      activeTabInfo.innerText = tab.title ? `${tab.title} (${tab.url})` : tab.url;
      activeTabInfo.title = tab.url;
    } else {
      activeTabInfo.innerText = "No active tab detected";
    }
  } catch (err) {
    activeTabInfo.innerText = "Error retrieving active tab";
  }
}

// Check connection to main app
async function checkJarvisConnection() {
  try {
    const tabs = await chrome.tabs.query({});
    const isJarvisOpen = tabs.some(tab => 
      tab.url && (tab.url.includes("localhost:3000") || tab.url.includes("sou842.github.io"))
    );

    if (isJarvisOpen) {
      statusDot.style.background = "var(--success)";
      statusDot.style.boxShadow = "0 0 8px var(--success)";
    } else {
      statusDot.style.background = "var(--text-muted)";
      statusDot.style.boxShadow = "none";
    }
  } catch (err) {
    statusDot.style.background = "var(--error)";
    statusDot.style.boxShadow = "none";
  }
}

// Clear active console logs
btnClearLogs.addEventListener("click", async () => {
  try {
    await chrome.storage.local.set({ logs: [] });
    loadLogs();
  } catch (err) {
    console.error("Failed to clear logs:", err);
  }
});

// Toggle logs visibility
btnToggleLog.addEventListener("click", () => {
  consoleLogsSection.classList.toggle("visible");
  setTimeout(() => {
    chatArea.scrollTop = chatArea.scrollHeight;
  }, 100);
});

// Toggle History Panel Overlay
btnToggleHistory.addEventListener("click", async () => {
  if (historyPanel.style.display === "none") {
    await loadHistoryPanel();
    historyPanel.style.display = "flex";
  } else {
    historyPanel.style.display = "none";
  }
});

btnCloseHistory.addEventListener("click", () => {
  historyPanel.style.display = "none";
});

// Click + New Chat
btnNewChat.addEventListener("click", async () => {
  await createNewChatSession();
});

// Send Chat/Command message
btnSend.addEventListener("click", async () => {
  const prompt = cmdInput.value.trim();
  if (!prompt) return;

  btnSend.disabled = true;
  try {
    // Append user message to chatHistory locally first
    const data = await chrome.storage.local.get({ chatHistory: [] });
    const updatedHistory = [...data.chatHistory, {
      role: "user",
      text: prompt,
      timestamp: Date.now()
    }];
    await chrome.storage.local.set({ chatHistory: updatedHistory });

    // Send action to background service worker
    await chrome.runtime.sendMessage({
      action: "run_agent",
      prompt: prompt,
      model: modelSelect.value,
      description: `Starting browser agent with goal: "${prompt.substring(0, 30)}${prompt.length > 30 ? '...' : ''}"`
    });

    cmdInput.value = "";
    cmdInput.style.height = "auto";
  } catch (err) {
    console.error("Failed to send command:", err);
  } finally {
    btnSend.disabled = false;
  }
});

// Allow Enter key to send (but Shift+Enter to newline)
cmdInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    btnSend.click();
  }
});

// Run raw script
btnRunScript.addEventListener("click", async () => {
  const script = cmdInput.value.trim();
  if (!script) return;

  btnRunScript.disabled = true;
  try {
    await chrome.runtime.sendMessage({
      action: "execute_script",
      script: script,
      description: `Running custom JS script: "${script.substring(0, 30)}${script.length > 30 ? '...' : ''}"`
    });
    cmdInput.value = "";
    cmdInput.style.height = "auto";
  } catch (err) {
    console.error("Failed to execute script:", err);
  } finally {
    btnRunScript.disabled = false;
  }
});

// Update UI elements based on agent execution state
function updateAgentRunningState(isRunning) {
  if (isRunning) {
    btnSend.style.display = "none";
    btnStop.style.display = "flex";
    btnStop.disabled = false;
    btnStop.innerHTML = `Stop <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/></svg>`;
    cmdInput.disabled = true;
    cmdInput.placeholder = "Agent is executing command...";
  } else {
    btnSend.style.display = "flex";
    btnStop.style.display = "none";
    cmdInput.disabled = false;
    cmdInput.placeholder = "Type a message or browser command...";
  }
}

// Click Stop Button
btnStop.addEventListener("click", async () => {
  await chrome.storage.local.set({ agentStopRequested: true });
  btnStop.disabled = true;
  btnStop.innerText = "Stopping...";
});

// Tab Switching DOM Elements
const btnTabChat = document.getElementById("btnTabChat");
const btnTabWorkflows = document.getElementById("btnTabWorkflows");
const chatView = document.getElementById("chatView");
const workflowsView = document.getElementById("workflowsView");

// Switch to Chat Tab
btnTabChat.addEventListener("click", () => {
  btnTabChat.style.background = "rgba(157, 78, 221, 0.1)";
  btnTabChat.style.borderColor = "rgba(157, 78, 221, 0.2)";
  btnTabChat.style.color = "var(--text)";
  btnTabChat.style.fontWeight = "600";

  btnTabWorkflows.style.background = "transparent";
  btnTabWorkflows.style.borderColor = "transparent";
  btnTabWorkflows.style.color = "var(--text-muted)";
  btnTabWorkflows.style.fontWeight = "500";

  chatView.style.display = "flex";
  workflowsView.style.display = "none";
});

// Switch to Workflows Tab
btnTabWorkflows.addEventListener("click", async () => {
  btnTabWorkflows.style.background = "rgba(157, 78, 221, 0.1)";
  btnTabWorkflows.style.borderColor = "rgba(157, 78, 221, 0.2)";
  btnTabWorkflows.style.color = "var(--text)";
  btnTabWorkflows.style.fontWeight = "600";

  btnTabChat.style.background = "transparent";
  btnTabChat.style.borderColor = "transparent";
  btnTabChat.style.color = "var(--text-muted)";
  btnTabChat.style.fontWeight = "500";

  chatView.style.display = "none";
  workflowsView.style.display = "flex";

  await loadWorkflowsList();
});

// Load Workflows List
// Load Workflows List
async function loadWorkflowsList() {
  workflowsView.innerHTML = `<div style="color: var(--text-muted); text-align: center; margin-top: 40px; font-size: 12px;">Loading workflows...</div>`;

  let workflows = [];
  let loaded = false;

  // Try 1: Direct fetch from sidepanel context (shares active session cookies)
  try {
    const directRes = await fetch("http://localhost:3000/api/workflows");
    if (directRes.ok) {
      const data = await directRes.json();
      if (data && Array.isArray(data.data)) {
        workflows = data.data;
        loaded = true;
      }
    }
  } catch (e) {
    console.warn("Direct workflows fetch failed, falling back to proxy...", e);
  }

  // Try 2: Background script proxy (fallback if direct fetch fails)
  if (!loaded) {
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: "proxy_get",
          url: "/api/workflows"
        }, (res) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(res);
          }
        });
      });

      if (response && response.success && response.data?.success && Array.isArray(response.data.data)) {
        workflows = response.data.data;
        loaded = true;
      } else {
        const errMsg = response?.error || response?.data?.error || "Could not retrieve workflows list.";
        workflowsView.innerHTML = `
          <div style="color: #ff4d6d; text-align: center; margin-top: 40px; font-size: 12px; padding: 10px; border: 1px dashed rgba(255, 77, 109, 0.2); border-radius: 8px; background: rgba(255, 77, 109, 0.05);">
            Failed to load workflows: ${errMsg}<br>
            <span style="font-size: 10.5px; opacity: 0.8; display: block; margin-top: 5px;">Make sure your dashboard at http://localhost:3000 is open and logged in.</span>
          </div>
        `;
        return;
      }
    } catch (err) {
      workflowsView.innerHTML = `
        <div style="color: #ff4d6d; text-align: center; margin-top: 40px; font-size: 12px; padding: 10px; border: 1px dashed rgba(255, 77, 109, 0.2); border-radius: 8px; background: rgba(255, 77, 109, 0.05);">
          Error loading workflows: ${err.message}
        </div>
      `;
      return;
    }
  }

  if (workflows.length === 0) {
    workflowsView.innerHTML = `
      <div style="color: var(--text-muted); text-align: center; margin-top: 40px; font-size: 12px; padding: 15px; border: 1px dashed var(--border); border-radius: 12px;">
        No saved workflows found. Ask Jarvis to create one!
      </div>
    `;
    return;
  }

  workflowsView.innerHTML = "";

  // List Container
  const listContainer = document.createElement("div");
  listContainer.id = "workflowsListContainer";
  listContainer.style.cssText = "display: flex; flex-direction: column; gap: 10px;";

  // Details Container
  const detailsContainer = document.createElement("div");
  detailsContainer.id = "workflowDetailsContainer";
  detailsContainer.style.cssText = "display: none; flex-direction: column; gap: 12px; background: rgba(255,255,255,0.01); border: 1px solid var(--border); border-radius: 12px; padding: 14px;";

  workflowsView.appendChild(listContainer);
  workflowsView.appendChild(detailsContainer);

  workflows.forEach(w => {
    const card = document.createElement("div");
    card.style.cssText = "background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 6px; cursor: pointer; transition: all 0.2s;";
    card.addEventListener("mouseover", () => card.style.background = "rgba(255,255,255,0.04)");
    card.addEventListener("mouseout", () => card.style.background = "rgba(255,255,255,0.02)");

    const title = document.createElement("h3");
    title.innerText = w.title;
    title.style.cssText = "font-size: 13px; font-weight: 600; color: var(--text); margin: 0;";
    card.appendChild(title);

    const desc = document.createElement("p");
    desc.innerText = w.description || "No description provided.";
    desc.style.cssText = "font-size: 11.5px; color: var(--text-muted); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;";
    card.appendChild(desc);

    card.addEventListener("click", () => {
      showWorkflowDetails(w, listContainer, detailsContainer);
    });

    listContainer.appendChild(card);
  });
}

// Show details panel for a workflow
function showWorkflowDetails(w, listContainer, detailsContainer) {
  listContainer.style.display = "none";
  detailsContainer.style.display = "flex";
  detailsContainer.innerHTML = "";

  // Back Button
  const btnBack = document.createElement("button");
  btnBack.innerHTML = `&larr; Back to list`;
  btnBack.style.cssText = "align-self: flex-start; padding: 4px 8px; font-size: 11px; border: 1px solid var(--border); background: transparent; color: var(--text-muted); border-radius: 6px; cursor: pointer; font-family: 'Outfit';";
  btnBack.addEventListener("click", () => {
    detailsContainer.style.display = "none";
    listContainer.style.display = "flex";
  });
  detailsContainer.appendChild(btnBack);

  // Title
  const title = document.createElement("h2");
  title.innerText = w.title;
  title.style.cssText = "font-size: 14px; font-weight: 700; color: var(--text); margin: 6px 0 0 0;";
  detailsContainer.appendChild(title);

  // Description
  const desc = document.createElement("p");
  desc.innerText = w.description || "No description provided.";
  desc.style.cssText = "font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.4;";
  detailsContainer.appendChild(desc);

  // Inputs Label
  const inputsLabel = document.createElement("label");
  inputsLabel.innerText = "Inputs (JSON):";
  inputsLabel.style.cssText = "font-size: 11px; font-weight: 600; color: var(--text-muted); margin-top: 8px;";
  detailsContainer.appendChild(inputsLabel);

  // Inputs Area
  const inputsArea = document.createElement("textarea");
  inputsArea.placeholder = `{\n  "url": "https://youtube.com..."\n}`;
  inputsArea.style.cssText = "background: rgba(0,0,0,0.25); border: 1px solid var(--border); border-radius: 8px; padding: 8px; color: var(--text); font-family: 'JetBrains Mono', monospace; font-size: 11px; min-height: 60px; resize: vertical; outline: none; line-height: 1.4;";
  inputsArea.value = `{\n  "url": ""\n}`;
  detailsContainer.appendChild(inputsArea);

  // Script Preview Header
  const scriptLabel = document.createElement("label");
  scriptLabel.style.cssText = "font-size: 11px; font-weight: 600; color: var(--text-muted); margin-top: 4px; display: flex; justify-content: space-between; align-items: center;";
  scriptLabel.innerHTML = `<span>Script Code:</span>`;
  
  const scriptCode = document.createElement("pre");
  scriptCode.innerText = w.script;
  scriptCode.style.cssText = "background: rgba(0,0,0,0.3); border: 1px solid var(--border); border-radius: 8px; padding: 8px; color: #a2d2ff; font-family: 'JetBrains Mono', monospace; font-size: 10px; overflow-x: auto; max-height: 120px; margin: 0; display: none; line-height: 1.3;";

  const toggleScript = document.createElement("span");
  toggleScript.innerText = "Show Code";
  toggleScript.style.cssText = "cursor: pointer; text-decoration: underline; font-size: 10.5px; color: #9d4edd; font-weight: 500;";
  toggleScript.addEventListener("click", () => {
    if (scriptCode.style.display === "none") {
      scriptCode.style.display = "block";
      toggleScript.innerText = "Hide Code";
    } else {
      scriptCode.style.display = "none";
      toggleScript.innerText = "Show Code";
    }
  });

  scriptLabel.appendChild(toggleScript);
  detailsContainer.appendChild(scriptLabel);
  detailsContainer.appendChild(scriptCode);

  // Run Button
  const btnRun = document.createElement("button");
  btnRun.innerText = "Execute Workflow";
  btnRun.style.cssText = "padding: 8px 16px; font-size: 12px; background: var(--primary); border: none; border-radius: 8px; color: #fff; cursor: pointer; font-weight: 600; font-family: 'Outfit'; margin-top: 8px; transition: background 0.2s;";
  btnRun.addEventListener("mouseover", () => btnRun.style.background = "var(--primary-hover)");
  
  btnRun.addEventListener("click", async () => {
    let inputs = {};
    try {
      if (inputsArea.value.trim()) {
        inputs = JSON.parse(inputsArea.value.trim());
      }
    } catch (e) {
      alert("Invalid JSON format in inputs: " + e.message);
      return;
    }

    btnRun.disabled = true;
    btnRun.innerText = "Executing...";

    // Switch to Chat tab to see execution progress logs
    btnTabChat.click();

    // Trigger workflow run via sandbox iframe
    const sandboxFrame = document.getElementById("sandboxFrame");
    const messageId = Date.now().toString();

    // Send a message to background to announce starting
    await chrome.runtime.sendMessage({
      action: "log_sandbox_start"
    });

    const resultListener = (event) => {
      if (event.data && event.data.action === "result" && event.data.messageId === messageId) {
        window.removeEventListener("message", resultListener);
        btnRun.disabled = false;
        btnRun.innerText = "Execute Workflow";

        // Post result status message to background logs
        chrome.runtime.sendMessage({
          action: "log_sandbox_result",
          success: event.data.success,
          result: event.data.result,
          error: event.data.error
        });
      }
    };
    window.addEventListener("message", resultListener);

    sandboxFrame.contentWindow.postMessage({
      action: "execute",
      script: w.script,
      inputs: inputs,
      messageId: messageId
    }, "*");
  });

  detailsContainer.appendChild(btnRun);
}

// Sandbox Iframe Communication Listener
window.addEventListener("message", (event) => {
  if (event.data && event.data.action === "command") {
    const { command, args } = event.data;
    const port = event.ports[0];

    chrome.runtime.sendMessage({
      action: "execute_sandbox_command",
      command,
      args
    }, (response) => {
      if (chrome.runtime.lastError) {
        port.postMessage({ success: false, error: chrome.runtime.lastError.message });
      } else {
        port.postMessage(response);
      }
    });
  }
});
