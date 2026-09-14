"use client";

import { useEffect, useRef } from "react";
import { registerPopup } from "./popup-history";

export function useHistoryPopup(visible, onClose) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!visible) return;

    const cleanup = registerPopup(() => onCloseRef.current());
    return cleanup;
  }, [visible]);
}
