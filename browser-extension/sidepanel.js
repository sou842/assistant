const nextjsFrame = document.getElementById("nextjsFrame");
const sandboxFrame = document.getElementById("sandboxFrame");
let currentChatId = Date.now().toString();

// --- 1. Forward Chat History to Next.js ---
async function syncChatToSaved(history) {
  const data = await chrome.storage.local.get({ savedChats: [] });
  let savedChats = data.savedChats;
  
  let activeChat = savedChats.find(c => c.id === currentChatId);
  if (!activeChat) {
    activeChat = {
      id: currentChatId,
      title: "New Chat",
      timestamp: Date.now(),
      messages: []
    };
    savedChats.unshift(activeChat);
  }
  
  activeChat.messages = history;
  
  // Auto-generate title from first user message
  if (activeChat.title === "New Chat" && history.length > 0) {
    const firstUserMsg = history.find(m => m.role === "user");
    if (firstUserMsg) {
      activeChat.title = firstUserMsg.text.substring(0, 30) + (firstUserMsg.text.length > 30 ? "..." : "");
    }
  }
  
  await chrome.storage.local.set({ savedChats });
}

async function sendInitialState() {
  const data = await chrome.storage.local.get({ chatHistory: [], savedChats: [], isAgentRunning: false });
  if (nextjsFrame && nextjsFrame.contentWindow) {
    nextjsFrame.contentWindow.postMessage({
      type: "FROM_EXTENSION",
      action: "UPDATE_STATE",
      history: data.chatHistory,
      savedChats: data.savedChats,
      isAgentRunning: data.isAgentRunning,
      currentChatId: currentChatId
    }, "*");
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    if (changes.chatHistory) {
      syncChatToSaved(changes.chatHistory.newValue);
      if (nextjsFrame && nextjsFrame.contentWindow) {
        nextjsFrame.contentWindow.postMessage({
          type: "FROM_EXTENSION",
          action: "UPDATE_STATE",
          history: changes.chatHistory.newValue
        }, "*");
      }
    }
    if (changes.savedChats) {
      if (nextjsFrame && nextjsFrame.contentWindow) {
        nextjsFrame.contentWindow.postMessage({
          type: "FROM_EXTENSION",
          action: "UPDATE_STATE",
          savedChats: changes.savedChats.newValue
        }, "*");
      }
    }
    if (changes.isAgentRunning) {
      if (nextjsFrame && nextjsFrame.contentWindow) {
        nextjsFrame.contentWindow.postMessage({
          type: "FROM_EXTENSION",
          action: "UPDATE_STATE",
          isAgentRunning: changes.isAgentRunning.newValue
        }, "*");
      }
    }
  }
});

// --- 2. Listen to Messages from Iframes (Next.js & Sandbox) ---
window.addEventListener("message", async (event) => {
  const data = event.data;
  if (!data) return;

  // -- Messages from Sandbox --
  if (data.action === "command") {
    const { command, args } = data;
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
    return;
  }

  if (data.action === "result") {
    chrome.runtime.sendMessage({
      action: "log_sandbox_result",
      success: data.success,
      result: data.result,
      error: data.error
    });

    if (nextjsFrame && nextjsFrame.contentWindow) {
      nextjsFrame.contentWindow.postMessage({
        type: "FROM_EXTENSION",
        action: "WORKFLOW_RESULT",
        messageId: data.messageId,
        success: data.success,
        error: data.error
      }, "*");
    }
    return;
  }

  // -- Messages from Next.js UI --
  if (data.type === "FROM_NEXTJS") {
    switch (data.action) {
      case "REQUEST_INITIAL_STATE":
        sendInitialState();
        break;

      case "NEW_CHAT":
        currentChatId = Date.now().toString();
        await chrome.storage.local.set({ chatHistory: [] });
        sendInitialState();
        break;

      case "LOAD_CHAT":
        currentChatId = data.chatId;
        const savedData = await chrome.storage.local.get({ savedChats: [] });
        const chatToLoad = savedData.savedChats.find(c => c.id === data.chatId);
        if (chatToLoad) {
          await chrome.storage.local.set({ chatHistory: chatToLoad.messages || [] });
        }
        sendInitialState();
        break;

      case "DELETE_CHAT":
        const saved = await chrome.storage.local.get({ savedChats: [] });
        const filtered = saved.savedChats.filter(c => c.id !== data.chatId);
        await chrome.storage.local.set({ savedChats: filtered });
        if (currentChatId === data.chatId) {
          currentChatId = Date.now().toString();
          await chrome.storage.local.set({ chatHistory: [] });
        }
        break;

      case "RUN_AGENT":
        const currentData = await chrome.storage.local.get({ chatHistory: [] });
        const newHistory = currentData.chatHistory;
        newHistory.push({ role: "user", text: data.prompt, timestamp: Date.now() });
        await chrome.storage.local.set({ chatHistory: newHistory });

        chrome.runtime.sendMessage({
          action: "run_agent",
          prompt: data.prompt,
          model: data.model || "mistral-small-latest"
        });
        break;

      case "DELETE_MESSAGE": {
        const histData = await chrome.storage.local.get({ chatHistory: [] });
        const history = histData.chatHistory;
        history.splice(data.index, 1);
        await chrome.storage.local.set({ chatHistory: history });
        break;
      }

      case "EDIT_MESSAGE": {
        const histData = await chrome.storage.local.get({ chatHistory: [] });
        const history = histData.chatHistory;
        if (history[data.index]) {
          history[data.index].text = data.text;
          history[data.index].timestamp = Date.now();
        }
        await chrome.storage.local.set({ chatHistory: history });
        break;
      }

      case "RUN_WORKFLOW":
        await chrome.runtime.sendMessage({ action: "log_sandbox_start" });
        sandboxFrame.contentWindow.postMessage({
          action: "execute",
          script: data.script,
          inputs: data.inputs,
          messageId: data.messageId
        }, "*");
        break;

      case "STOP_AGENT":
        await chrome.storage.local.set({ agentStopRequested: true });
        break;
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "RUN_WORKFLOW_SANDBOX") {
    chrome.runtime.sendMessage({ action: "log_sandbox_start" });
    sandboxFrame.contentWindow.postMessage({
      action: "execute",
      script: message.script,
      inputs: message.inputs || {},
      messageId: message.messageId
    }, "*");
    sendResponse({ success: true, message: "Workflow dispatched to sandbox" });
  }
});

