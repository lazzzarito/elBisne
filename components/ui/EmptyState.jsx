"use client";

import Link from "next/link";
import Icon from "@/components/Icon";

// Placeholder vacío reutilizable (estilo Instagram): icono arriba, título,
// descripción y botón de acción opcional.
export default function EmptyState({ icon = "no-results", title, description, actionLabel, onAction, actionHref, compact = false }) {
  return (
    <div className={`empty-state${compact ? " compact" : ""}`}>
      <span className="empty-state-icon" aria-hidden="true">
        <Icon name={icon} size={compact ? 30 : 40} />
      </span>
      {title && <h3 className="empty-state-title">{title}</h3>}
      {description && <p className="empty-state-text">{description}</p>}
      {actionLabel && (
        actionHref ? (
          <Link href={actionHref} className="empty-state-action">{actionLabel}</Link>
        ) : (
          <button type="button" className="empty-state-action" onClick={onAction}>{actionLabel}</button>
        )
      )}
    </div>
  );
}
