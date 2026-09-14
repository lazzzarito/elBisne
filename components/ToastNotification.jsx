"use client";

import Icon from "@/components/Icon";
import { useApp } from "@/context/AppContext";

export default function ToastNotification() {
  const { toast, toastType, undoItem, undoRemove } = useApp();

  if (!toast) return null;

  return (
    <div className={`toast-notification ${toastType}${undoItem ? " has-undo" : ""}`} role="status">
      <Icon name={toastType === "warning" ? "warning" : "check"} />
      <span>{toast}</span>
      {undoItem && (
        <button className="toast-undo-btn" onClick={undoRemove}>Deshacer</button>
      )}
    </div>
  );
}