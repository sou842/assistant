// helpers/emulator.js - Playwright emulator and sandbox execution utilities

function cleanScriptCode(script) {
  if (!script) return "";
  let cleaned = script.trim();
  if (cleaned.startsWith("```")) {
    const match = cleaned.match(/^```(?:javascript|js)?\n?([\s\S]*?)\n?```$/i);
    if (match && match[1]) {
      cleaned = match[1].trim();
    }
  }
  return cleaned;
}

const createLocatorImpl = (tabId, selector) => ({
  first: () => createLocatorImpl(tabId, selector),
  waitFor: async ({ state, timeout } = {}) => {
    const startTime = Date.now();
    timeout = timeout || 15000;
    while (Date.now() - startTime < timeout) {
      const isVisible = await chrome.scripting.executeScript({
        target: { tabId },
        func: (sel) => {
          const queryAll = (s) => {
            const list = [];
            const traverse = (node) => {
              if (!node) return;
              if (node.nodeType === 1) {
                if (node.matches(s)) list.push(node);
                const ch = node.children;
                if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
                if (node.shadowRoot) traverse(node.shadowRoot);
              } else if (node.nodeType === 11 || node === document) {
                const ch = node.children;
                if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
              }
            };
            traverse(document);
            return list;
          };
          const els = queryAll(sel);
          for (let i = 0; i < els.length; i++) {
            const el = els[i];
            const rect = el.getBoundingClientRect();
            const visible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden' && window.getComputedStyle(el).opacity !== '0';
            if (visible) return true;
          }
          return false;
        },
        args: [selector]
      }).then(res => res[0]?.result).catch(() => false);
      if (isVisible) return true;
      await new Promise(r => setTimeout(r, 500));
    }
    throw new Error(`Timeout waiting for element: ${selector}`);
  },
  click: async () => {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel) => {
        const queryAll = (s) => {
          const list = [];
          const traverse = (node) => {
            if (!node) return;
            if (node.nodeType === 1) {
              if (node.matches(s)) list.push(node);
              const ch = node.children;
              if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
              if (node.shadowRoot) traverse(node.shadowRoot);
            } else if (node.nodeType === 11 || node === document) {
              const ch = node.children;
              if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
            }
          };
          traverse(document);
          return list;
        };
        const els = queryAll(sel);
        const simulateClick = (element) => {
          const events = ["pointerdown", "mousedown", "pointerup", "mouseup", "click"];
          for (const evType of events) {
            const ev = new MouseEvent(evType, {
              bubbles: true,
              cancelable: true,
              view: window
            });
            element.dispatchEvent(ev);
          }
        };
        for (let i = 0; i < els.length; i++) {
          const el = els[i];
          const rect = el.getBoundingClientRect();
          const visible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden' && window.getComputedStyle(el).opacity !== '0';
          if (visible) {
            el.scrollIntoView({ block: 'center' });
            simulateClick(el);
            return;
          }
        }
        if (els[0]) simulateClick(els[0]);
      },
      args: [selector]
    });
  },
  type: async (val) => {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel, v) => {
        const queryAll = (s) => {
          const list = [];
          const traverse = (node) => {
            if (!node) return;
            if (node.nodeType === 1) {
              if (node.matches(s)) list.push(node);
              const ch = node.children;
              if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
              if (node.shadowRoot) traverse(node.shadowRoot);
            } else if (node.nodeType === 11 || node === document) {
              const ch = node.children;
              if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
            }
          };
          traverse(document);
          return list;
        };
        const el = queryAll(sel)[0];
        if (el) {
          el.focus();
          if (el.isContentEditable) {
            el.textContent = v;
          } else {
            el.value = v;
          }
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
        }
      },
      args: [selector, val]
    });
  },
  fill: async (val) => {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel, v) => {
        const queryAll = (s) => {
          const list = [];
          const traverse = (node) => {
            if (!node) return;
            if (node.nodeType === 1) {
              if (node.matches(s)) list.push(node);
              const ch = node.children;
              if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
              if (node.shadowRoot) traverse(node.shadowRoot);
            } else if (node.nodeType === 11 || node === document) {
              const ch = node.children;
              if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
            }
          };
          traverse(document);
          return list;
        };
        const el = queryAll(sel)[0];
        if (el) {
          el.focus();
          if (el.isContentEditable) {
            el.textContent = v;
          } else {
            el.value = v;
          }
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
      },
      args: [selector, val]
    });
  },
  getAttribute: async (attr) => {
    const res = await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel, a) => {
        const queryAll = (s) => {
          const list = [];
          const traverse = (node) => {
            if (!node) return;
            if (node.nodeType === 1) {
              if (node.matches(s)) list.push(node);
              const ch = node.children;
              if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
              if (node.shadowRoot) traverse(node.shadowRoot);
            } else if (node.nodeType === 11 || node === document) {
              const ch = node.children;
              if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
            }
          };
          traverse(document);
          return list;
        };
        const el = queryAll(sel)[0];
        return el ? el.getAttribute(a) : null;
      },
      args: [selector, attr]
    });
    return res[0]?.result;
  }
});

const createPageObject = (tabId) => ({
  waitForTimeout: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  close: async () => chrome.tabs.remove(tabId),
  keyboard: {
    press: async (key) => {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (k) => {
          const activeEl = document.activeElement;
          if (activeEl) {
            const eventOpts = { key: k, code: k, bubbles: true };
            if (k === 'Enter') {
              eventOpts.keyCode = 13;
              eventOpts.which = 13;
            }
            activeEl.dispatchEvent(new KeyboardEvent("keydown", eventOpts));
            activeEl.dispatchEvent(new KeyboardEvent("keypress", eventOpts));
            activeEl.dispatchEvent(new KeyboardEvent("keyup", eventOpts));
          }
        },
        args: [key]
      });
    }
  },
  locator: (selector) => {
    const loc = createLocatorImpl(tabId, selector);
    return {
      first: () => loc.first(),
      waitFor: async (opts) => {
        await addAgentChatMessage(`⏳ Waiting for element: \`${selector}\``);
        return await loc.waitFor(opts);
      },
      click: async () => {
        await addAgentChatMessage(`🖱️ Clicking element: \`${selector}\``);
        return await loc.click();
      },
      type: async (val) => {
        await addAgentChatMessage(`✏️ Typing "${val}" into \`${selector}\``);
        return await loc.type(val);
      },
      fill: async (val) => {
        await addAgentChatMessage(`✏️ Filling "${val}" into \`${selector}\``);
        return await loc.fill(val);
      },
      getAttribute: async (attr) => {
        await addAgentChatMessage(`🔍 Reading attribute \`${attr}\` from \`${selector}\``);
        return await loc.getAttribute(attr);
      },
      textContent: async () => {
        await addAgentChatMessage(`🔍 Reading text content from \`${selector}\``);
        const res = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: (sel) => {
            const queryAll = (s) => {
              const list = [];
              const traverse = (node) => {
                if (!node) return;
                if (node.nodeType === 1) {
                  if (node.matches(s)) list.push(node);
                  const ch = node.children;
                  if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
                  if (node.shadowRoot) traverse(node.shadowRoot);
                } else if (node.nodeType === 11 || node === document) {
                  const ch = node.children;
                  if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
                }
              };
              traverse(document);
              return list;
            };
            const el = queryAll(sel)[0];
            return el ? el.textContent : null;
          },
          args: [selector]
        });
        return res[0]?.result;
      },
      inputValue: async () => {
        await addAgentChatMessage(`🔍 Reading input value from \`${selector}\``);
        const res = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: (sel) => {
            const queryAll = (s) => {
              const list = [];
              const traverse = (node) => {
                if (!node) return;
                if (node.nodeType === 1) {
                  if (node.matches(s)) list.push(node);
                  const ch = node.children;
                  if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
                  if (node.shadowRoot) traverse(node.shadowRoot);
                } else if (node.nodeType === 11 || node === document) {
                  const ch = node.children;
                  if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
                }
              };
              traverse(document);
              return list;
            };
            const el = queryAll(sel)[0];
            return el ? el.value : null;
          },
          args: [selector]
        });
        return res[0]?.result;
      }
    };
  },
  evaluate: async (fn, ...args) => {
    const fnStr = fn.toString();
    await addAgentChatMessage(`🧠 Evaluating script in page context`);
    const res = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (str, ...a) => {
        if (str.includes("scrollHeight")) {
          return { success: true, val: document.documentElement.scrollHeight || document.body.scrollHeight };
        }
        if (str.includes("window.scrollTo") || str.includes("window.scrollBy")) {
          window.scrollBy(0, 10000);
          return { success: true, val: undefined };
        }
        if (str.includes("ytd-rich-item-renderer") || str.includes("videoElements")) {
          try {
            const videos = [];
            const videoElements = document.querySelectorAll('ytd-rich-item-renderer');
            videoElements.forEach((element) => {
              const titleLink = element.querySelector('a.ytLockupMetadataViewModelTitle');
              if (!titleLink) return;
              const title = titleLink.innerText.trim();
              const url = titleLink.href;
              const thumbnailImg = element.querySelector('img');
              const thumbnail = thumbnailImg ? thumbnailImg.getAttribute('src') || thumbnailImg.src : null;
              const textLines = element.innerText.split('\n').map(l => l.trim()).filter(Boolean);
              const viewsIndex = textLines.findIndex(l => l.includes('views'));
              const views = viewsIndex !== -1 ? textLines[viewsIndex] : null;
              const uploadDate = viewsIndex !== -1 && textLines.length > viewsIndex + 2 ? textLines[viewsIndex + 2] : null;
              if (title && url) {
                videos.push({ title, url, thumbnail, views, uploadDate });
              }
            });
            return { success: true, val: videos };
          } catch (e) {
            return { success: false, error: e.message, stack: e.stack };
          }
        }
        try {
          const f = eval('(' + str + ')');
          return { success: true, val: f(...a) };
        } catch (e) {
          return { success: false, error: e.message, stack: e.stack };
        }
      },
      args: [fnStr, ...args]
    });
    const scriptRes = res[0]?.result;
    if (scriptRes && scriptRes.success === false) {
      throw new Error(`Evaluation failed in page: ${scriptRes.error}\n${scriptRes.stack}`);
    }
    return scriptRes ? scriptRes.val : null;
  }
});

const browserImpl = {
  getPage: async (urlPattern) => {
    await addAgentChatMessage(`🔍 Checking for existing tab matching: ${urlPattern}`);
    const tabs = await chrome.tabs.query({});
    const existingTab = tabs.find(t => t.url && t.url.includes(urlPattern));
    
    if (existingTab) {
      await addAgentChatMessage(`🔍 Found existing tab: ${existingTab.title}. Switching to it.`);
      await chrome.tabs.update(existingTab.id, { active: true });
      if (existingTab.windowId) {
        await chrome.windows.update(existingTab.windowId, { focused: true });
      }
      lastInteractedTabId = existingTab.id;
      
      return createPageObject(existingTab.id);
    }
    return null;
  },
  newPage: async (pageUrl) => {
    await addAgentChatMessage(`🌐 Opening tab and navigating to: ${pageUrl}`);
    const tab = await chrome.tabs.create({ url: pageUrl, active: true });
    lastInteractedTabId = tab.id;
    await waitTabLoaded(tab.id);
    await addAgentChatMessage(`📄 Page loaded successfully.`);
    return createPageObject(tab.id);
  }
};

async function executeSandboxCommand(command) {
  const stopCheck = await chrome.storage.local.get({ agentStopRequested: false });
  if (stopCheck.agentStopRequested) {
    return { success: false, error: "Agent stopped by user" };
  }
  const { command: subCommand, args: subArgs } = command;
  
  switch (subCommand) {
    case "getPage": {
      const urlPattern = subArgs.urlPattern;
      await addAgentChatMessage(`🔍 Checking for existing tab matching: ${urlPattern}`);
      const tabs = await chrome.tabs.query({});
      const existingTab = tabs.find(t => t.url && t.url.includes(urlPattern));
      
      if (existingTab) {
        await addAgentChatMessage(`🔍 Found existing tab: ${existingTab.title || urlPattern}. Switching to it.`);
        await chrome.tabs.update(existingTab.id, { active: true });
        if (existingTab.windowId) {
          await chrome.windows.update(existingTab.windowId, { focused: true });
        }
        lastInteractedTabId = existingTab.id;
        return { success: true, found: true };
      }
      return { success: true, found: false };
    }

    case "newPage": {
      const pageUrl = subArgs.url;
      await addAgentChatMessage(`🌐 Opening tab and navigating to: ${pageUrl}`);
      const tab = await chrome.tabs.create({ url: pageUrl, active: true });
      lastInteractedTabId = tab.id;
      await waitTabLoaded(tab.id);
      await addAgentChatMessage(`📄 Page loaded successfully.`);
      return { success: true };
    }

    case "closePage": {
      await addAgentChatMessage(`🗑️ Closing active tab.`);
      if (lastInteractedTabId) {
        try {
          await chrome.tabs.remove(lastInteractedTabId);
        } catch(e) {
          console.warn("Failed to close tab", e);
        }
        lastInteractedTabId = null;
      }
      return { success: true };
    }

    case "switchBack": {
      try {
        const tabs = await chrome.tabs.query({});
        const jarvisTab = tabs.find(t => t.url && (
          t.url.includes("localhost") ||
          t.url.includes("127.0.0.1") ||
          t.url.includes("assistant-nine-ecru.vercel.app")
        ));
        if (jarvisTab) {
          await chrome.tabs.update(jarvisTab.id, { active: true });
          if (jarvisTab.windowId) {
            await chrome.windows.update(jarvisTab.windowId, { focused: true });
          }
          return { success: true };
        }
      } catch (err) {
        console.warn("[Jarvis Extension] switchBack failed:", err);
      }
      return { success: false };
    }

    case "waitForTimeout": {
      const ms = subArgs.ms || 1000;
      await addAgentChatMessage(`⏳ Waiting for ${ms / 1000}s...`);
      const chunk = 100;
      const startTime = Date.now();
      while (Date.now() - startTime < ms) {
        const stopCheck = await chrome.storage.local.get({ agentStopRequested: false });
        if (stopCheck.agentStopRequested) {
          return { success: false, error: "Agent stopped by user" };
        }
        await new Promise(resolve => setTimeout(resolve, Math.min(chunk, ms - (Date.now() - startTime))));
      }
      return { success: true };
    }
    
    case "isVisible": {
      const selector = subArgs.selector;
      const opts = subArgs.opts || {};
      const timeout = opts.timeout || 0;
      
      let tabId = lastInteractedTabId;
      if (!tabId) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error("No active tab found");
        tabId = tab.id;
      }
      
      const checkVisibility = async () => {
        return await chrome.scripting.executeScript({
          target: { tabId },
          func: (sel) => {
            const queryAll = (s) => {
              const list = [];
              const traverse = (node) => {
                if (!node) return;
                if (node.nodeType === 1) {
                  if (node.matches(s)) list.push(node);
                  const ch = node.children;
                  if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
                  if (node.shadowRoot) traverse(node.shadowRoot);
                } else if (node.nodeType === 11 || node === document) {
                  const ch = node.children;
                  if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
                }
              };
              traverse(document);
              return list;
            };
            const els = queryAll(sel);
            for (let i = 0; i < els.length; i++) {
              const el = els[i];
              const rect = el.getBoundingClientRect();
              const visible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden' && window.getComputedStyle(el).opacity !== '0';
              if (visible) return true;
            }
            return false;
          },
          args: [selector]
        }).then(res => !!res[0]?.result).catch(() => false);
      };

      if (timeout > 0) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
          const visible = await checkVisibility();
          if (visible) return { success: true, result: true };
          await new Promise(r => setTimeout(r, 500));
        }
        return { success: true, result: false };
      } else {
        const visible = await checkVisibility();
        return { success: true, result: visible };
      }
    }

    case "waitFor": {
      const selector = subArgs.selector;
      const opts = subArgs.opts || {};
      await addAgentChatMessage(`⏳ Waiting for element: \`${selector}\``);
      
      let tabId = lastInteractedTabId;
      if (!tabId) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error("No active tab found");
        tabId = tab.id;
      }
      
      const startTime = Date.now();
      const timeout = opts.timeout || 15000;
      let found = false;
      while (Date.now() - startTime < timeout) {
        const stopCheck = await chrome.storage.local.get({ agentStopRequested: false });
        if (stopCheck.agentStopRequested) {
          return { success: false, error: "Agent stopped by user" };
        }
        const isVisible = await chrome.scripting.executeScript({
          target: { tabId },
          func: (sel) => {
            const queryAll = (s) => {
              const list = [];
              const traverse = (node) => {
                if (!node) return;
                if (node.nodeType === 1) {
                  if (node.matches(s)) list.push(node);
                  const ch = node.children;
                  if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
                  if (node.shadowRoot) traverse(node.shadowRoot);
                } else if (node.nodeType === 11 || node === document) {
                  const ch = node.children;
                  if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
                }
              };
              traverse(document);
              return list;
            };
            const els = queryAll(sel);
            for (let i = 0; i < els.length; i++) {
              const el = els[i];
              const rect = el.getBoundingClientRect();
              const visible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden' && window.getComputedStyle(el).opacity !== '0';
              if (visible) return true;
            }
            return false;
          },
          args: [selector]
        }).then(res => res[0]?.result).catch(() => false);
        if (isVisible) {
          found = true;
          break;
        }
        await new Promise(r => setTimeout(r, 500));
      }
      
      if (!found) {
        throw new Error(`Timeout waiting for element: ${selector}`);
      }
      return { success: true };
    }
    
    case "click": {
      const selector = subArgs.selector;
      await addAgentChatMessage(`🖱️ Clicking element: \`${selector}\``);
      
      let tabId = lastInteractedTabId;
      if (!tabId) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error("No active tab found");
        tabId = tab.id;
      }
      
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (sel) => {
          const queryAll = (s) => {
            const list = [];
            const traverse = (node) => {
              if (!node) return;
              if (node.nodeType === 1) {
                if (node.matches(s)) list.push(node);
                const ch = node.children;
                if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
                if (node.shadowRoot) traverse(node.shadowRoot);
              } else if (node.nodeType === 11 || node === document) {
                const ch = node.children;
                if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
              }
            };
            traverse(document);
            return list;
          };
          const els = queryAll(sel);
          const simulateClick = (element) => {
            const events = ["pointerdown", "mousedown", "pointerup", "mouseup", "click"];
            for (const evType of events) {
              const ev = new MouseEvent(evType, {
                bubbles: true,
                cancelable: true,
                view: window
              });
              element.dispatchEvent(ev);
            }
          };
          for (let i = 0; i < els.length; i++) {
            const el = els[i];
            const rect = el.getBoundingClientRect();
            const visible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden' && window.getComputedStyle(el).opacity !== '0';
            if (visible) {
              el.scrollIntoView({ block: 'center' });
              simulateClick(el);
              return;
            }
          }
          if (els[0]) simulateClick(els[0]);
        },
        args: [selector]
      });
      return { success: true };
    }
    
    case "getAttribute": {
      const selector = subArgs.selector;
      const attr = subArgs.attr;
      await addAgentChatMessage(`🔍 Reading attribute \`${attr}\` from \`${selector}\``);
      
      let tabId = lastInteractedTabId;
      if (!tabId) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error("No active tab found");
        tabId = tab.id;
      }
      
      const res = await chrome.scripting.executeScript({
        target: { tabId },
        func: (sel, a) => {
          const queryAll = (s) => {
            const list = [];
            const traverse = (node) => {
              if (!node) return;
              if (node.nodeType === 1) {
                if (node.matches(s)) list.push(node);
                const ch = node.children;
                if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
                if (node.shadowRoot) traverse(node.shadowRoot);
              } else if (node.nodeType === 11 || node === document) {
                const ch = node.children;
                if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
              }
            };
            traverse(document);
            return list;
          };
          const el = queryAll(sel)[0];
          return el ? el.getAttribute(a) : null;
        },
        args: [selector, attr]
      });
      return { success: true, result: res[0]?.result };
    }

    case "textContent": {
      const selector = subArgs.selector;
      await addAgentChatMessage(`🔍 Reading text content from \`${selector}\``);
      
      let tabId = lastInteractedTabId;
      if (!tabId) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error("No active tab found");
        tabId = tab.id;
      }
      
      const res = await chrome.scripting.executeScript({
        target: { tabId },
        func: (sel) => {
          const queryAll = (s) => {
            const list = [];
            const traverse = (node) => {
              if (!node) return;
              if (node.nodeType === 1) {
                if (node.matches(s)) list.push(node);
                const ch = node.children;
                if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
                if (node.shadowRoot) traverse(node.shadowRoot);
              } else if (node.nodeType === 11 || node === document) {
                const ch = node.children;
                if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
              }
            };
            traverse(document);
            return list;
          };
          const el = queryAll(sel)[0];
          return el ? el.textContent : null;
        },
        args: [selector]
      });
      return { success: true, result: res[0]?.result };
    }

    case "inputValue": {
      const selector = subArgs.selector;
      await addAgentChatMessage(`🔍 Reading input value from \`${selector}\``);
      
      let tabId = lastInteractedTabId;
      if (!tabId) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error("No active tab found");
        tabId = tab.id;
      }
      
      const res = await chrome.scripting.executeScript({
        target: { tabId },
        func: (sel) => {
          const queryAll = (s) => {
            const list = [];
            const traverse = (node) => {
              if (!node) return;
              if (node.nodeType === 1) {
                if (node.matches(s)) list.push(node);
                const ch = node.children;
                if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
                if (node.shadowRoot) traverse(node.shadowRoot);
              } else if (node.nodeType === 11 || node === document) {
                const ch = node.children;
                if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
              }
            };
            traverse(document);
            return list;
          };
          const el = queryAll(sel)[0];
          return el ? el.value : null;
        },
        args: [selector]
      });
      return { success: true, result: res[0]?.result };
    }
    
    case "evaluate": {
      const fnStr = subArgs.fnStr;
      const evalArgs = subArgs.args || [];
      await addAgentChatMessage(`💡 *Thinking:* Evaluating script in page context`);
      
      let tabId = lastInteractedTabId;
      if (!tabId) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error("No active tab found");
        tabId = tab.id;
      }
      
      try {
        const res = await chrome.scripting.executeScript({
          target: { tabId },
          func: (str, ...a) => {
            if (str.includes("scrollHeight")) {
              return { success: true, val: document.documentElement.scrollHeight || document.body.scrollHeight };
            }
            if (str.includes("window.scrollTo") || str.includes("window.scrollBy")) {
              window.scrollBy(0, 10000);
              return { success: true, val: undefined };
            }
            if (str.includes("ytd-rich-item-renderer") || str.includes("videoElements")) {
              try {
                const videos = [];
                const videoElements = document.querySelectorAll('ytd-rich-item-renderer');
                videoElements.forEach((element) => {
                  const titleLink = element.querySelector('a.ytLockupMetadataViewModelTitle');
                  if (!titleLink) return;
                  const title = titleLink.innerText.trim();
                  const url = titleLink.href;
                  const thumbnailImg = element.querySelector('img');
                  const thumbnail = thumbnailImg ? thumbnailImg.getAttribute('src') || thumbnailImg.src : null;
                  const textLines = element.innerText.split('\n').map(l => l.trim()).filter(Boolean);
                  const viewsIndex = textLines.findIndex(l => l.includes('views'));
                  const views = viewsIndex !== -1 ? textLines[viewsIndex] : null;
                  const uploadDate = viewsIndex !== -1 && textLines.length > viewsIndex + 2 ? textLines[viewsIndex + 2] : null;
                  if (title && url) {
                    videos.push({ title, url, thumbnail, views, uploadDate });
                  }
                });
                return { success: true, val: videos };
              } catch (e) {
                return { success: false, error: e.message, stack: e.stack };
              }
            }
            try {
              const f = eval('(' + str + ')');
              return { success: true, val: f(...a) };
            } catch (e) {
              return { success: false, error: e.message, stack: e.stack };
            }
          },
          args: [fnStr, ...evalArgs]
        });
        
        const scriptRes = res[0]?.result;
        if (scriptRes && scriptRes.success === false) {
          throw new Error(`Evaluation failed in page: ${scriptRes.error}\n${scriptRes.stack}`);
        }
        return { success: true, result: scriptRes ? scriptRes.val : null };
      } catch (executeError) {
        const errorMsg = executeError.message || String(executeError);
        if (errorMsg.includes("Content Security Policy") || errorMsg.includes("unsafe-eval") || errorMsg.includes("eval")) {
          await addAgentChatMessage(`💡 *Thinking:* CSP block detected. Retrying evaluation using Chrome Debugger...`);
          const debuggerTarget = { tabId };
          try {
            await chrome.debugger.attach(debuggerTarget, "1.3");
            const argsStr = evalArgs.map(arg => JSON.stringify(arg)).join(", ");
            const expression = `(${fnStr})(${argsStr})`;
            const res = await chrome.debugger.sendCommand(debuggerTarget, "Runtime.evaluate", {
              expression: expression,
              returnByValue: true,
              awaitPromise: true
            });
            if (res.exceptionDetails) {
              throw new Error(res.exceptionDetails.exception?.description || "Evaluation exception");
            }
            return { success: true, result: res.result?.value };
          } catch (debuggerError) {
            console.error("Debugger evaluation fallback failed:", debuggerError);
            throw debuggerError;
          } finally {
            await chrome.debugger.detach(debuggerTarget).catch(() => {});
          }
        } else {
          throw executeError;
        }
      }
    }
    
    case "type": {
      const selector = subArgs.selector;
      const val = subArgs.val !== undefined ? subArgs.val : "";
      await addAgentChatMessage(`✏️ Typing "${val}" into \`${selector}\``);
      
      let tabId = lastInteractedTabId;
      if (!tabId) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error("No active tab found");
        tabId = tab.id;
      }
      
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (sel, v) => {
          const queryAll = (s) => {
            const list = [];
            const traverse = (node) => {
              if (!node) return;
              if (node.nodeType === 1) {
                if (node.matches(s)) list.push(node);
                const ch = node.children;
                if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
                if (node.shadowRoot) traverse(node.shadowRoot);
              } else if (node.nodeType === 11 || node === document) {
                const ch = node.children;
                if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
              }
            };
            traverse(document);
            return list;
          };
          const el = queryAll(sel)[0];
          if (el) {
            el.focus();
            if (el.isContentEditable) {
              document.execCommand('insertText', false, v);
            } else {
              el.value = v;
              el.dispatchEvent(new Event("input", { bubbles: true }));
              el.dispatchEvent(new Event("change", { bubbles: true }));
            }
            
            const enterEvent = new KeyboardEvent("keydown", {
              key: "Enter",
              code: "Enter",
              keyCode: 13,
              which: 13,
              bubbles: true
            });
            el.dispatchEvent(enterEvent);
          } else {
            throw new Error(`Element not found for type: ${sel}`);
          }
        },
        args: [selector, val]
      });
      return { success: true };
    }

    case "fill": {
      const selector = subArgs.selector;
      const val = subArgs.val !== undefined ? subArgs.val : "";
      await addAgentChatMessage(`✏️ Filling "${val}" into \`${selector}\``);
      
      let tabId = lastInteractedTabId;
      if (!tabId) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error("No active tab found");
        tabId = tab.id;
      }
      
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (sel, v) => {
          const queryAll = (s) => {
            const list = [];
            const traverse = (node) => {
              if (!node) return;
              if (node.nodeType === 1) {
                if (node.matches(s)) list.push(node);
                const ch = node.children;
                if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
                if (node.shadowRoot) traverse(node.shadowRoot);
              } else if (node.nodeType === 11 || node === document) {
                const ch = node.children;
                if (ch) { for (let i=0; i<ch.length; i++) traverse(ch[i]); }
              }
            };
            traverse(document);
            return list;
          };
          const el = queryAll(sel)[0];
          if (el) {
            el.focus();
            if (el.isContentEditable) {
              document.execCommand('selectAll', false, null);
              if (v === "") {
                  document.execCommand('delete', false, null);
              } else {
                  document.execCommand('insertText', false, v);
              }
            } else {
              el.value = v;
              el.dispatchEvent(new Event("input", { bubbles: true }));
              el.dispatchEvent(new Event("change", { bubbles: true }));
            }
          } else {
            throw new Error(`Element not found for fill: ${sel}`);
          }
        },
        args: [selector, val]
      });
      return { success: true };
    }

    case "keyboardPress": {
      const key = subArgs.key;
      let tabId = lastInteractedTabId;
      if (!tabId) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error("No active tab found");
        tabId = tab.id;
      }
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (k) => {
          const activeEl = document.activeElement;
          if (activeEl) {
            const eventOpts = { key: k, code: k, bubbles: true };
            if (k === 'Enter') {
              eventOpts.keyCode = 13;
              eventOpts.which = 13;
            }
            activeEl.dispatchEvent(new KeyboardEvent("keydown", eventOpts));
            activeEl.dispatchEvent(new KeyboardEvent("keypress", eventOpts));
            activeEl.dispatchEvent(new KeyboardEvent("keyup", eventOpts));
          }
        },
        args: [key]
      });
      return { success: true };
    }
    case "runSubWorkflow": {
      const workflowId = subArgs.workflowId;
      const subInputs = subArgs.subInputs || {};
      await addAgentChatMessage(`⚙️ Fetching sub-workflow: ${workflowId}`);
      const baseUrl = await getBackendBaseUrl();
      const res = await fetchWithRetry(`${baseUrl}/api/workflows/${workflowId}`, { timeout: 15000 });
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
      
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      
      const executeSubWorkflow = async (wId, sInputs = {}) => {
        await addAgentChatMessage(`⚙️ Fetching sub-workflow: ${wId}`);
        const res2 = await fetchWithRetry(`${baseUrl}/api/workflows/${wId}`, { timeout: 15000 });
        const data2 = await res2.json();
        if (!data2.success || !data2.data) throw new Error(`Failed: ${data2.error}`);
        let code = cleanScriptCode(data2.data.script);
        if (/async\s+function\s+workflow\b/.test(code) || /function\s+workflow\b/.test(code)) code += "\nreturn await workflow(browser, __inputs);";
        else if (/async\s+function\s+main\b/.test(code) || /function\s+main\b/.test(code)) code += "\nreturn await main(browser, __inputs);";
        const r = new AsyncFunction('browser', '__inputs', 'runWorkflow', code);
        return await r(browserImpl, sInputs, executeSubWorkflow);
      };

      const subRunner = new AsyncFunction('browser', '__inputs', 'runWorkflow', subRunnerCode);
      await addAgentChatMessage(`⚙️ Executing sub-workflow: ${data.data.title}`);
      const result = await subRunner(browserImpl, subInputs, executeSubWorkflow);
      return { success: true, result };
    }
    
    default:
      throw new Error(`Unknown sandbox command: ${subCommand}`);
  }
}

async function executeTabMessageProxy(tabId, message) {
  try {
    return await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  } catch (err) {
    if (err.message.includes("Could not establish connection") || err.message.includes("Receiving end does not exist")) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ["content.js"]
        });
        await new Promise(resolve => setTimeout(resolve, 200));
        return await new Promise((resolve, reject) => {
          chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        });
      } catch (injectionErr) {
        console.error("Content script injection failed:", injectionErr);
        throw new Error("Connection failed: Please reload the tab. " + err.message);
      }
    }
    throw err;
  }
}

async function sendKeyCombo(debuggerTarget, modifierKey, modifierCode, modifierKeyCode, key, code, keyCode, modifierValue) {
  await chrome.debugger.sendCommand(debuggerTarget, "Input.dispatchKeyEvent", {
    type: "keyDown",
    modifiers: modifierValue,
    key: modifierKey,
    code: modifierCode,
    windowsVirtualKeyCode: modifierKeyCode
  });

  await chrome.debugger.sendCommand(debuggerTarget, "Input.dispatchKeyEvent", {
    type: "keyDown",
    modifiers: modifierValue,
    key: key,
    code: code,
    windowsVirtualKeyCode: keyCode
  });

  await chrome.debugger.sendCommand(debuggerTarget, "Input.dispatchKeyEvent", {
    type: "keyUp",
    modifiers: modifierValue,
    key: key,
    code: code,
    windowsVirtualKeyCode: keyCode
  });

  await chrome.debugger.sendCommand(debuggerTarget, "Input.dispatchKeyEvent", {
    type: "keyUp",
    modifiers: 0,
    key: modifierKey,
    code: modifierCode,
    windowsVirtualKeyCode: modifierKeyCode
  });
}

async function pressEnterKey(debuggerTarget) {
  await chrome.debugger.sendCommand(debuggerTarget, "Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13
  });
  await chrome.debugger.sendCommand(debuggerTarget, "Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13
  });
}
