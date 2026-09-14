"use client";

let nextId = 0;
let popups = [];
let stateCount = 0;
let popstateHandler = null;
let lastBackTime = 0;
const EXIT_TIMEOUT = 3000;

export function initPopupHistory(showExitToastFn) {
  popstateHandler = () => {
    if (popups.length > 0) {
      const top = popups.pop();
      stateCount--;
      top.onClose();
      return;
    }

    if (stateCount > 0) {
      stateCount--;
      return;
    }

    const now = Date.now();
    if (lastBackTime > 0 && now - lastBackTime < EXIT_TIMEOUT) {
      lastBackTime = 0;
      return;
    }

    lastBackTime = now;
    showExitToastFn();
    window.history.pushState(null, "");
    stateCount++;
  };

  window.addEventListener("popstate", popstateHandler);

  return () => {
    window.removeEventListener("popstate", popstateHandler);
    popstateHandler = null;
  };
}

export function registerPopup(onClose) {
  const id = ++nextId;
  popups.push({ id, onClose });
  window.history.pushState(null, "");
  stateCount++;

  return () => {
    popups = popups.filter((p) => p.id !== id);
  };
}
