"use client";

import { useEffect, useRef, useState } from "react";

const MIN_WIDTH = 240;
const MAX_WIDTH = 520;

export function useSidebarResize(initialWidth = 272) {
  const resizeRef = useRef(false);
  const [sidebarWidth, setSidebarWidth] = useState(initialWidth);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (!resizeRef.current) return;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, event.clientX));
      setSidebarWidth(next);
    };

    const onMouseUp = () => {
      resizeRef.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const startResize = () => {
    resizeRef.current = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  };

  return { sidebarWidth, startResize };
}
