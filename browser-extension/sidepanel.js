// sidepanel.js - Controls sidepanel UI and logging
console.log("[Jarvis Extension] Sidepanel script loaded.");

// DOM Elements
const statusBadge = document.getElementById("statusBadge");
const statusText = document.getElementById("statusText");
const activeTabInfo = document.getElementById("activeTabInfo");
const consoleLogs = document.getElementById("consoleLogs");
const btnClearLogs = document.getElementById("btnClearLogs");
const aiStatusPanel = document.getElementById("aiStatusPanel");
const aiStateIndicator = document.getElementById("aiStateIndicator");
const aiThoughtDetails = document.getElementById("aiThoughtDetails");

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  updateActiveTabInfo();
  loadLogs();
  loadAIStatus();
  checkJarvisConnection();

  // Poll active tab and connection status every 2 seconds
  setInterval(() => {
    updateActiveTabInfo();
    checkJarvisConnection();
    // Also periodically re-evaluate staleness of AI status (e.g. if ready)
    loadAIStatus();
  }, 2000);
});

// Load AI Status from chrome.storage
async function loadAIStatus() {
  try {
    const data = await chrome.storage.local.get({ aiStatus: null });
    updateAIStatusDisplay(data.aiStatus);
  } catch (err) {
    console.error("Error loading AI status:", err);
  }
}

// Update AI Status Panel display
function updateAIStatusDisplay(aiStatus) {
  if (!aiStatus) {
    aiStatusPanel.style.display = "none";
    return;
  }

  // If status is "ready" and it was updated more than 15 seconds ago, hide it to keep UI clean
  const isStale = aiStatus.status === "ready" && (Date.now() - aiStatus.timestamp > 15000);
  if (isStale) {
    aiStatusPanel.style.display = "none";
    return;
  }

  aiStatusPanel.style.display = "block";

  let statusClass = "status-running";
  let statusText = "⚡ Thinking";

  if (aiStatus.status === "streaming") {
    statusClass = "status-running";
    statusText = "⚡ Streaming Response";
  } else if (aiStatus.status === "ready") {
    statusClass = "status-success";
    statusText = "✓ Ready";
  } else if (aiStatus.status === "error") {
    statusClass = "status-error";
    statusText = "✗ Error";
  } else if (aiStatus.status === "executing_tool") {
    statusClass = "status-running";
    statusText = "⚙ Executing Tool";
  }

  aiStateIndicator.className = statusClass;
  aiStateIndicator.innerText = statusText;
  aiThoughtDetails.innerText = aiStatus.thought || "Planning next steps...";
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
    consoleLogs.innerHTML = `<div style="color: var(--text-muted); text-align: center; margin-top: 20px;">No browser commands recorded yet.</div>`;
    return;
  }

  consoleLogs.innerHTML = logs.map(log => {
    const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Status text format
    let statusClass = "status-running";
    let statusText = "⚡ Running";
    if (log.status === "success") {
      statusClass = "status-success";
      statusText = "✓ Success";
    } else if (log.status === "error") {
      statusClass = "status-error";
      statusText = `✗ Error: ${log.error || "Failed"}`;
    }

    return `
      <div class="log-entry">
        <div class="log-header">
          <span class="log-action ${log.action}">${log.action}</span>
          <span class="log-time">${timeStr}</span>
        </div>
        <div class="log-detail">${log.detail}</div>
        <div class="log-status ${statusClass}">${statusText}</div>
      </div>
    `;
  }).join("");
}

// Listen for storage changes to update logs and AI status in real-time
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    if (changes.logs) {
      renderLogs(changes.logs.newValue);
    }
    if (changes.aiStatus) {
      updateAIStatusDisplay(changes.aiStatus.newValue);
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

// Check if any tab matches the Jarvis Web application to show connected badge
async function checkJarvisConnection() {
  try {
    const tabs = await chrome.tabs.query({});
    const isJarvisOpen = tabs.some(tab => 
      tab.url && (tab.url.includes("localhost:3000") || tab.url.includes("sou842.github.io"))
    );

    if (isJarvisOpen) {
      statusBadge.className = "status-badge connected";
      statusText.innerText = "Active";
    } else {
      statusBadge.className = "status-badge";
      statusText.innerText = "Awaiting Webpage";
    }
  } catch (err) {
    statusBadge.className = "status-badge";
    statusText.innerText = "Offline";
  }
}

// Event Listeners
btnClearLogs.addEventListener("click", async () => {
  try {
    await chrome.storage.local.set({ logs: [] });
    loadLogs();
  } catch (err) {
    console.error("Failed to clear logs:", err);
  }
});
