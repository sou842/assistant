// content.js - Bridge between Jarvis website and the extension background/sidepanel
console.log("[Jarvis Extension] Content script loaded.");

// Listen for messages from the Next.js website
window.addEventListener("message", (event) => {
  // Only accept messages from our own window
  if (event.source !== window) return;

  const data = event.data;
  if (data && data.source === "jarvis-webpage") {
    // Send to background and handle both Promise (Firefox) and Callback (Chrome) messaging styles
    try {
      const responsePromise = chrome.runtime.sendMessage(data.message);
      
      // If it's a promise (standard in Firefox MV3)
      if (responsePromise && typeof responsePromise.then === "function") {
        responsePromise
          .then((response) => {
            window.postMessage({
              source: "jarvis-extension",
              response: response,
              messageId: data.messageId
            }, "*");
          })
          .catch((err) => {
            console.error("[Jarvis Extension] Error sending message to background:", err);
          });
      } else {
        // Fallback to callback style (Chrome MV3)
        chrome.runtime.sendMessage(data.message, (response) => {
          window.postMessage({
            source: "jarvis-extension",
            response: response,
            messageId: data.messageId
          }, "*");
        });
      }
    } catch (err) {
      console.error("[Jarvis Extension] Messaging error:", err);
    }
  }
});

// Listen for messages from background/sidepanel and forward to webpage
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.source === "jarvis-extension-event") {
    window.postMessage({
      source: "jarvis-extension-event",
      event: message.event,
      payload: message.payload
    }, "*");
  }
  return true;
});
