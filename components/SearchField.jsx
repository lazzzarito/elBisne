"use client";

import Icon from "@/components/Icon";

// Campo de búsqueda compartido por la cabecera global y la de los bisnes, para
// que ambas se vean exactamente igual. Es controlado: cada cabecera decide qué
// hace con el texto (filtrar su catálogo o abrir el buscador global).
export default function SearchField({
  value = "",
  onChange,
  onFocus,
  onKeyDown,
  placeholder = "Buscar…",
  ariaLabel = "Buscar",
  inputRef,
  className = "",
}) {
  const hasValue = value.length > 0;
  return (
    <div className={`store-fused-search${hasValue ? " has-value" : ""}${className ? ` ${className}` : ""}`}>
      <span className="store-fused-search-icon" aria-hidden="true">
        <Icon name="search" size={15} />
      </span>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
      {hasValue && (
        <button
          type="button"
          className="store-fused-search-clear"
          onClick={() => onChange?.("")}
          aria-label="Limpiar búsqueda"
        >
          <Icon name="close" size={13} />
        </button>
      )}
    </div>
  );
}

// El nombre del bisne puede ser larguísimo y el placeholder se cortaba a media
// palabra, con un hueco feo al final. Se acota el nombre y se cierra con puntos
// suspensivos; si entra entero, no se añade nada.
export function storeSearchPlaceholder(businessName, fallback = "la tienda") {
  const name = (businessName || "").trim() || fallback;
  return name.length > 18 ? `Buscar en ${name.slice(0, 18).trimEnd()}…` : `Buscar en ${name}`;
}
