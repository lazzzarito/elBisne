"use client";

import { useState, useEffect, useRef } from "react";
import Icon from "@/components/Icon";

export default function ChannelSplitButton({ enabledChannels, selected, onChange, onClick, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!enabledChannels || enabledChannels.length === 0) return null;

  const current = enabledChannels.find((c) => c.id === selected) || enabledChannels[0];
  const text = label || `Confirmar por ${current.label}`;
  const hasAction = typeof onClick === "function";

  return (
    <div className="channel-split-btn" ref={ref}>
      {hasAction ? (
        <button className="channel-split-main" onClick={onClick}>
          <Icon name={current.icon} />
          <span>{text}</span>
        </button>
      ) : (
        <button className="channel-split-label" onClick={() => setOpen(!open)}>
          <Icon name={current.icon} />
          <span>{current.label}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}
      {hasAction && (
        <button
          className="channel-split-toggle"
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
          aria-label="Cambiar canal"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}
      {open && (
        <div className="channel-split-dropdown">
          {enabledChannels.map((ch) => (
            <button
              key={ch.id}
              className={`channel-split-option${selected === ch.id ? " active" : ""}`}
              onClick={() => { onChange(ch.id); setOpen(false); }}
            >
              <Icon name={ch.icon} />
              {ch.label}
              {selected === ch.id && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto" }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
