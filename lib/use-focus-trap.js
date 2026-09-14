"use client";

import { useEffect, useRef } from "react";

export function useFocusTrap(active) {
  const ref = useRef(null);

  useEffect(() => {
    if (!active || !ref.current) return;

    const container = ref.current;
    const focusable = container.querySelectorAll('a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    first?.focus();

    const handler = (e) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [active]);

  return ref;
}