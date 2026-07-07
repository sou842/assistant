window.addEventListener("message", async (event) => {
  const { action, script, inputs, messageId } = event.data;
  if (action === "execute") {
    try {
      let runnerCode = script;
      if (/async\s+function\s+workflow\b/.test(script) || /function\s+workflow\b/.test(script)) {
        runnerCode += "\nreturn await workflow(browser, __inputs);";
      } else if (/async\s+function\s+main\b/.test(script) || /function\s+main\b/.test(script)) {
        runnerCode += "\nreturn await main(browser, __inputs);";
      }
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const runner = new AsyncFunction("browser", "__inputs", runnerCode);

      const createLocatorProxy = (selector) => ({
        first: () => createLocatorProxy(selector),
        waitFor: async (opts) => {
          return await callParent("waitFor", { selector, opts });
        },
        click: async () => {
          return await callParent("click", { selector });
        },
        type: async (val) => {
          return await callParent("type", { selector, val });
        },
        fill: async (val) => {
          return await callParent("fill", { selector, val });
        },
        getAttribute: async (attr) => {
          return await callParent("getAttribute", { selector, attr });
        }
      });

      const browserProxy = {
        newPage: async (url) => {
          await callParent("newPage", { url });
          return {
            locator: (selector) => createLocatorProxy(selector),
            close: async () => {
              return await callParent("closePage", {});
            },
            waitForTimeout: async (ms) => {
              return await callParent("waitForTimeout", { ms });
            },
            evaluate: async (fn, ...args) => {
              const fnStr = fn.toString();
              return await callParent("evaluate", { fnStr, args });
            },
            keyboard: {
              press: async (key) => {
                return await callParent("keyboardPress", { key });
              }
            }
          };
        }
      };

      const result = await runner(browserProxy, inputs);
      window.parent.postMessage({ action: "result", success: true, result, messageId }, "*");
    } catch (err) {
      window.parent.postMessage({ action: "result", success: false, error: err.message, messageId }, "*");
    }
  }
});

async function callParent(command, args) {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
      if (event.data.success) {
        resolve(event.data.result);
      } else {
        reject(new Error(event.data.error));
      }
    };
    window.parent.postMessage({ action: "command", command, args }, "*", [channel.port2]);
  });
}
