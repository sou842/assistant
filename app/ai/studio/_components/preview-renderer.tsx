"use client";

import React, { useEffect, useState, useRef } from "react";
import { Loader2, AlertTriangle, Monitor, Tablet, Smartphone, Minimize2, Expand, RefreshCcw } from "lucide-react";
import * as Babel from "@babel/standalone";

import { useBrowserExtension } from "@/hooks/use-browser-extension";

interface PreviewRendererProps {
  id: string;
  files: Record<string, string>;
  entryPoint?: string;
  layoutMode?: "code" | "preview" | "database";
  setLayoutMode?: (mode: "code" | "preview" | "database") => void;
}

export function PreviewRenderer({ id, files, entryPoint = "app.tsx", layoutMode = "preview", setLayoutMode = () => {} }: PreviewRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deviceMode, setDeviceMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 1024;
    }
    return false;
  });

  const { isConnected, sendBrowserCommand, openCompanion } = useBrowserExtension();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsExpanded(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Bridge messages between Studio preview iframe and Jarvis extension content script
  useEffect(() => {
    const handleHostMessage = async (event: MessageEvent) => {
      if (event.data && event.data.source === "studio-iframe-workflow") {
        const { messageId, action, script, inputs, switchBack } = event.data;
        try {
          if (!isConnected) {
            openCompanion().catch(() => {});
          }

          const result = await sendBrowserCommand({
            action: (action as any) || "run_workflow_sandbox",
            script,
            inputs: inputs || {},
            isManual: true,
            switchBack: switchBack !== undefined ? switchBack : true,
          });

          if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
              {
                source: "jarvis-extension",
                messageId,
                response: { success: true, result },
              },
              "*"
            );
          }
        } catch (err: any) {
          if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
              {
                source: "jarvis-extension",
                messageId,
                response: { success: false, error: err.message },
              },
              "*"
            );
          }
        }
      }
    };

    window.addEventListener("message", handleHostMessage);
    return () => window.removeEventListener("message", handleHostMessage);
  }, [isConnected, sendBrowserCommand, openCompanion]);

  const buildAndRender = () => {
    setLoading(true);
    setError(null);

    try {
      // ── 1. Compile every JS/TS/JSX/TSX file to CommonJS ────────────────────
      const compiledModules: Record<string, string> = {};

      for (const [path, src] of Object.entries(files)) {
        const ext = path.split(".").pop() ?? "";
        if (!["js", "jsx", "ts", "tsx"].includes(ext)) continue;

        let cleanSrc = src;
        if (cleanSrc.trim().startsWith("```")) {
          cleanSrc = cleanSrc.trim().replace(/^```(?:tsx|jsx|ts|js|html)?\s*\n?/, "").replace(/\n?```\s*$/, "");
        }

        try {
          const result = Babel.transform(cleanSrc, {
            filename: path,
            presets: [
              // classic: emits React.createElement (no jsx-runtime import)
              ["react", { runtime: "classic" }],
              // env → converts ESM (import/export) → CommonJS (require/module.exports)
              ["env", { targets: { chrome: 100 }, modules: "commonjs" }],
              "typescript",
            ] as any,
          });
          compiledModules[path] = result.code ?? "";
        } catch (e: any) {
          throw new Error(`Compile error in "${path}": ${e.message}`);
        }
      }

      // ── 2. Collect CSS ─────────────────────────────────────────────────────
      const cssContent = Object.entries(files)
        .filter(([p]) => p.endsWith(".css"))
        .map(([, c]) => c)
        .join("\n");

      // ── 3. Serialise modules map for injection into iframe ─────────────────
      // Each key → CJS source string
      const modulesJson = JSON.stringify(compiledModules);

      // Normalise entry point (strip leading ./)
      const entry = entryPoint.replace(/^\.\//, "");

      // ── 4. Build self-contained HTML ───────────────────────────────────────
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Preview</title>

  <!-- React 18 UMD – single global instance, no version split -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <!-- lucide-react UMD -->
  <script src="https://unpkg.com/lucide-react@0.468.0/dist/umd/lucide-react.min.js"></script>
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
  <!-- Tailwind -->
  <script src="https://cdn.tailwindcss.com"></script>

  <style>
    *,*::before,*::after{box-sizing:border-box}
    body{margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif}
    ${cssContent}
  </style>
</head>
<body>
  <div id="root"></div>

  <!-- Error overlay -->
  <div id="err" style="display:none;position:fixed;inset:0;background:#1a0000;color:#fca5a5;padding:24px;font-family:monospace;overflow:auto;z-index:9999">
    <b style="font-size:16px">Runtime Error</b>
    <pre id="err-msg" style="margin-top:12px;font-size:13px;white-space:pre-wrap"></pre>
  </div>

  <script>
    window.addEventListener('error', function(e){
      document.getElementById('err').style.display='block';
      document.getElementById('err-msg').textContent = e.error ? (e.error.stack||e.error.message) : e.message;
    });
    window.addEventListener('unhandledrejection', function(e){
      document.getElementById('err').style.display='block';
      document.getElementById('err-msg').textContent = e.reason ? (e.reason.stack||e.reason.message||String(e.reason)) : String(e);
    });
  </script>

  <script>
    (function(){
      // ── Studio Database API ───────────────────────────────────────────────
      window.studioDb = {
        async get(key) {
          const res = await fetch('/api/studio/${id}/db');
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          return key ? data.db[key] : data.db;
        },
        async set(key, value) {
          const res = await fetch('/api/studio/${id}/db', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value })
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          return data.db;
        },
        async getAll() {
          const res = await fetch('/api/studio/${id}/db');
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          return data.db || {};
        }
      };

      // ── Studio Workflow API ───────────────────────────────────────────────
      window.workflow_execute = async function(options) {
        var opts = typeof options === 'string' ? { workflowName: options } : (options || {});
        var fetchPayload = Object.assign({}, opts, { fetchOnly: true });
        var res = await fetch('/api/workflow/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fetchPayload)
        });
        var data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || 'Workflow execution failed');
        }

        if (data.workflowScript) {
          try {
            var extResult = await new Promise(function(resolve, reject) {
              var messageId = 'wf-' + Math.random().toString(36).slice(2);
              var timer = setTimeout(function() {
                window.removeEventListener('message', handleResponse);
                reject(new Error('Extension timeout'));
              }, 300000);

              function handleResponse(event) {
                if (event.data && event.data.source === 'jarvis-extension' && event.data.messageId === messageId) {
                  clearTimeout(timer);
                  window.removeEventListener('message', handleResponse);
                  if (event.data.response && event.data.response.success) {
                    resolve(event.data.response.result);
                  } else {
                    reject(new Error(event.data.response ? event.data.response.error : 'Extension error'));
                  }
                }
              }

              window.addEventListener('message', handleResponse);

              window.parent.postMessage({
                source: 'studio-iframe-workflow',
                messageId: messageId,
                action: 'run_workflow_sandbox',
                script: data.workflowScript,
                inputs: data.resolvedInputs || opts.inputs || {},
                switchBack: opts.switchBack !== undefined ? opts.switchBack : (opts.inputs?.switchBack !== undefined ? opts.inputs.switchBack : true)
              }, '*');
            });

            return {
              success: true,
              workflowId: data.workflowId,
              workflowTitle: data.workflowTitle,
              result: extResult
            };
          } catch (extErr) {
            console.warn('[Studio Workflow] Extension execution fallback to server result:', extErr.message);
            var fallbackRes = await fetch('/api/workflow/execute', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(opts)
            });
            return await fallbackRes.json();
          }
        }

        return data;
      };

      window.studioWorkflow = {
        execute: window.workflow_execute,
        run: window.workflow_execute,
      };

      // Workflow React Hook Module
      function createWorkflowModule() {
        var React = window.React;
        function useWorkflow(defaultWorkflowName) {
          var state = React.useState({ loading: false, data: null, error: null });
          var data = state[0].data;
          var loading = state[0].loading;
          var error = state[0].error;
          var setState = state[1];

          var execute = React.useCallback(async function(inputsOrOpts, maybeInputs) {
            setState(function(prev){ return Object.assign({}, prev, { loading: true, error: null }); });
            try {
              var payload;
              var isHexId = function(val) { return typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val); };
              if (typeof inputsOrOpts === 'string') {
                if (isHexId(inputsOrOpts)) {
                  payload = { workflowId: inputsOrOpts, workflowName: inputsOrOpts, inputs: typeof maybeInputs === 'string' ? { input: maybeInputs } : (maybeInputs || {}) };
                } else if (defaultWorkflowName) {
                  payload = isHexId(defaultWorkflowName)
                    ? { workflowId: defaultWorkflowName, workflowName: defaultWorkflowName, inputs: { input: inputsOrOpts } }
                    : { workflowName: defaultWorkflowName, inputs: { input: inputsOrOpts } };
                } else {
                  payload = { workflowName: inputsOrOpts, inputs: typeof maybeInputs === 'string' ? { input: maybeInputs } : (maybeInputs || {}) };
                }
              } else if (inputsOrOpts && (inputsOrOpts.workflowName || inputsOrOpts.workflowId || inputsOrOpts.toolId)) {
                payload = inputsOrOpts;
              } else {
                payload = isHexId(defaultWorkflowName)
                  ? { workflowId: defaultWorkflowName, workflowName: defaultWorkflowName, inputs: inputsOrOpts || {} }
                  : { workflowName: defaultWorkflowName, inputs: inputsOrOpts || {} };
              }
              var res = await window.workflow_execute(payload);
              var resultData = res.result !== undefined ? res.result : res;
              setState({ loading: false, data: resultData, error: null });
              return resultData;
            } catch (err) {
              var errMsg = err.message || 'Workflow execution failed';
              setState({ loading: false, data: null, error: errMsg });
              throw err;
            }
          }, [defaultWorkflowName]);

          var reset = React.useCallback(function() {
            setState({ loading: false, data: null, error: null });
          }, []);

          return {
            execute: execute,
            run: execute,
            loading: loading,
            data: data,
            error: error,
            reset: reset
          };
        }

        return {
          workflow_execute: window.workflow_execute,
          useWorkflow: useWorkflow,
          default: {
            execute: window.workflow_execute,
            useWorkflow: useWorkflow
          }
        };
      }

      var workflowModule = createWorkflowModule();
      window.useWorkflow = workflowModule.useWorkflow;

      // ── Lucide Icon Proxy Resolver ──────────────────────────────────────────
      function getLucideModule() {
        var source = window.lucideReact || window.LucideReact || (window.lucide && window.lucide.icons) || window.lucide || {};
        var iconsMap = source.icons || source;

        return new Proxy(source, {
          get: function(target, prop) {
            if (prop === '__esModule') return true;
            if (prop === 'default') return target;
            if (typeof prop === 'symbol') return target[prop];

            // 1. Direct property match
            if (target[prop] && typeof target[prop] === 'function') return target[prop];
            if (iconsMap[prop] && typeof iconsMap[prop] === 'function') return iconsMap[prop];

            // 2. Case-insensitive lookup (e.g. sparkless, Sparkles, LucideSparkles)
            var clean = String(prop).toLowerCase().replace(/^lucide/, '');
            for (var k in iconsMap) {
              if (k.toLowerCase() === clean && typeof iconsMap[k] === 'function') {
                return iconsMap[k];
              }
            }
            for (var k in target) {
              if (k.toLowerCase() === clean && typeof target[k] === 'function') {
                return target[k];
              }
            }

            // 3. Fallback: Dynamic Lucide-styled SVG React Component to guarantee no crashes
            return function DynamicLucideIcon(props) {
              var p = props || {};
              var size = p.size || 24;
              var color = p.color || 'currentColor';
              var strokeWidth = p.strokeWidth || 2;
              var className = p.className || '';
              var rest = Object.assign({}, p);
              delete rest.size;
              delete rest.color;
              delete rest.strokeWidth;
              delete rest.className;

              return window.React.createElement(
                'svg',
                Object.assign({
                  xmlns: 'http://www.w3.org/2000/svg',
                  width: size,
                  height: size,
                  viewBox: '0 0 24 24',
                  fill: 'none',
                  stroke: color,
                  strokeWidth: strokeWidth,
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                  className: className
                }, rest),
                window.React.createElement('circle', { cx: 12, cy: 12, r: 10 }),
                window.React.createElement('line', { x1: 12, y1: 8, x2: 12, y2: 12 }),
                window.React.createElement('line', { x1: 12, y1: 16, x2: 12.01, y2: 16 })
              );
            };
          }
        });
      }

      // ── Mini CommonJS runtime ──────────────────────────────────────────────
      var MODULES = ${modulesJson};
      var registry = {};
      var inProgress = {};

      // Map bare specifiers → UMD globals already on window
      var BUILTINS = {
        'react': function(){ return window.React; },
        'react-dom': function(){ return window.ReactDOM; },
        'react-dom/client': function(){ return window.ReactDOM; },
        'lucide-react': function(){ return getLucideModule(); },
        'lucide': function(){ return getLucideModule(); },
        '@studio/workflow': function(){ return workflowModule; },
        '@/workflow': function(){ return workflowModule; },
        'workflow': function(){ return workflowModule; },
      };

      function resolve(from, id) {
        // absolute
        if (!id.startsWith('.')) return id;
        // relative – resolve from current file's directory
        var dir = from.includes('/') ? from.substring(0, from.lastIndexOf('/')) : '';
        var parts = (dir ? dir + '/' + id : id).split('/');
        var out = [];
        for (var p of parts) {
          if (p === '..') out.pop();
          else if (p !== '.') out.push(p);
        }
        return out.join('/');
      }

      function tryExtensions(base) {
        var exts = ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.jsx', '/index.js'];
        for (var e of exts) {
          if (MODULES[base + e] !== undefined) return base + e;
        }
        return null;
      }

      function requireModule(from, id) {
        // builtin?
        if (BUILTINS[id]) return BUILTINS[id]();

        var resolved = resolve(from, id);
        var key = tryExtensions(resolved);
        if (key === null) {
          console.warn('[sandbox] module not found:', id, '(from', from + ')');
          return {};
        }

        if (registry[key]) return registry[key];
        if (inProgress[key]) return registry[key] || {}; // circular guard

        inProgress[key] = true;
        var mod = { exports: {} };
        var src = MODULES[key];
        // eslint-disable-next-line no-new-func
        var factory = new Function('require', 'module', 'exports', src);
        factory(function(depId){ return requireModule(key, depId); }, mod, mod.exports);
        registry[key] = mod.exports;
        return mod.exports;
      }

      // ── Boot entry point ───────────────────────────────────────────────────
      var entryKey = tryExtensions(${JSON.stringify(entry)});
      if (!entryKey) {
        document.getElementById('err').style.display='block';
        document.getElementById('err-msg').textContent = 'Entry point not found: ${entry}';
        return;
      }

      var entryExports = requireModule('', entryKey);
      var App = entryExports.default || entryExports.App || entryExports.app || (typeof entryExports === 'function' ? entryExports : null);

      if (!App || typeof App !== 'function') {
        document.getElementById('err').style.display='block';
        document.getElementById('err-msg').textContent = 'No valid React component exported as default or "App" from ' + entry;
        return;
      }

      var root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(App));
    })();
  </script>
</body>
</html>`;

      if (iframeRef.current) {
        iframeRef.current.srcdoc = html;
      }
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      buildAndRender();
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, entryPoint]);

  const handleIframeLoad = () => setLoading(false);

  return (
    <>
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setIsExpanded(false)}
        />
      )}
      <div className={`flex flex-col bg-zinc-950 rounded-2xl border border-zinc-800/80 overflow-hidden shadow-2xl transition-all duration-300 ${
        isExpanded 
          ? "fixed inset-0 z-50 border-zinc-700/80 rounded-none" 
          : "relative w-full h-full"
      }`}>
        {/* Bar */}
        <div className="hidden md:flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800/60 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="size-3 rounded-full bg-red-500/80" />
              <span className="size-3 rounded-full bg-yellow-500/80" />
              <span className="size-3 rounded-full bg-green-500/80" />
            </div>
            {/* <span className="ml-3 text-xs font-medium text-zinc-400 font-mono select-none tracking-tight">
              Live Preview
            </span> */}
          </div>

          {/* Device Toggles */}
          <div className="flex items-center gap-0.5 bg-zinc-950/80 border border-zinc-800/80 rounded-full p-1 shadow-inner">
            <button
              onClick={() => setDeviceMode("desktop")}
              className={`p-1 rounded-full transition-all cursor-pointer ${
                deviceMode === "desktop" ? "bg-zinc-800 text-zinc-100 font-semibold" : "text-zinc-500 hover:text-zinc-300"
              }`}
              title="Desktop View"
            >
              <Monitor size={14} />
            </button>
            <button
              onClick={() => setDeviceMode("tablet")}
              className={`p-1 rounded-full transition-all cursor-pointer ${
                deviceMode === "tablet" ? "bg-zinc-800 text-zinc-100 font-semibold" : "text-zinc-500 hover:text-zinc-300"
              }`}
              title="Tablet View"
            >
              <Tablet size={14} />
            </button>
            <button
              onClick={() => setDeviceMode("mobile")}
              className={`p-1 rounded-full transition-all cursor-pointer ${
                deviceMode === "mobile" ? "bg-zinc-800 text-zinc-100 font-semibold" : "text-zinc-500 hover:text-zinc-300"
              }`}
              title="Mobile View"
            >
              <Smartphone size={14} />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={buildAndRender}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-all active:scale-95 cursor-pointer"
              title="Refresh Preview"
            >
              <RefreshCcw size={14} />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-all active:scale-95 cursor-pointer"
              title={isExpanded ? "Minimize Preview" : "Maximize Preview"}
            >
              {isExpanded ? <Minimize2 size={14} /> : <Expand size={14} />}
            </button>
          </div>
        </div>

        <div className="relative flex-1 w-full bg-zinc-950 flex items-center justify-center p-0 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 z-20 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <span className="text-xs text-zinc-400">Compiling…</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col p-6 bg-red-950/90 text-red-100 z-30 font-mono overflow-auto">
            <div className="flex items-center gap-2 text-red-400 font-bold border-b border-red-900 pb-3 mb-4">
              <AlertTriangle size={18} />
              <span>Compilation Error</span>
            </div>
            <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed bg-red-950/30 p-4 rounded-xl border border-red-900/40">
              {error}
            </pre>
          </div>
        )}

        <iframe
          ref={iframeRef}
          onLoad={handleIframeLoad}
          className={`border-0 bg-white transition-all duration-300 ${
            deviceMode === "mobile" 
              ? "w-93.75 h-166.75 max-h-full rounded-2xl border-2 border-gray-500" 
              : deviceMode === "tablet" 
              ? "w-3xl h-256 max-h-full rounded-2xl border-3 border-gray-500" 
              : "w-full h-full"
          }`}
          sandbox="allow-scripts allow-same-origin allow-modals"
          title="sandbox-preview"
        />
      </div>
      </div>
    </>
  );
}
