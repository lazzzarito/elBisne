"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { groupByBisne, groupTotalLabel } from "@/lib/bisne-groups";
import { getCachedFavorites, setCachedFavorites } from "@/lib/favorites-cache";
import SafeImage from "@/components/SafeImage";
import Icon from "@/components/Icon";

// Mismas reglas que lib/products.js mapRow. Los favoritos no dependen del
// catálogo del bisne actual: se resuelven por id/slug contra toda la DB.
function mapProductRow(row) {
  const id = row.slug || row.id;
  const images = Array.isArray(row.images) ? row.images : [];
  return {
    id,
    slug: row.slug || null,
    bisneId: row.bisne_id || null,
    name: row.name || "Producto",
    priceUSD: Number(row.price) || 0,
    category: row.categories?.name || "General",
    categories: row.categories?.name ? [row.categories.name] : [],
    image: images[0] || "/images/placeholder.svg",
    images,
    description: row.description || "",
    featured: !!row.featured,
    offer: !!row.offer,
    originalPrice: row.original_price != null ? Number(row.original_price) : null,
    stock: row.stock != null ? Number(row.stock) : Infinity,
    status: row.status || null,
    attributes: row.attributes && typeof row.attributes === "object" ? { ...row.attributes } : {},
    options: row.options && typeof row.options === "object" ? row.options : {},
    contentHtml: row.content_html || "",
    ratioClass: row.ratio ? `ratio-${row.ratio}` : "ratio-square",
  };
}

// Indexa por los dos identificadores: favoriteIds puede guardar el uuid o el
// slug del mismo producto, según dónde se favoritó.
function indexRows(rows) {
  const byId = new Map();
  for (const row of rows || []) {
    const key = row.slug || row.id;
    if (key) byId.set(key, row);
    if (row.id) byId.set(row.id, row);
  }
  return byId;
}

// Las filas de la BD llegan en orden arbitrario y la caché tampoco lo garantiza.
// Se ordena por favoriteIds, que es el orden en que el usuario favoritó, y así
// la lista no se reordena entre una apertura y la siguiente.
function orderByFavorites(rows, ids) {
  const byId = indexRows(rows);
  const ordered = [];
  const seen = new Set();
  for (const id of ids) {
    const row = byId.get(id);
    if (!row || seen.has(row)) continue;
    seen.add(row);
    ordered.push(mapProductRow(row));
  }
  return ordered;
}

// Lo recién llegado pisa a lo cacheado; el resto se conserva mientras llega.
function mergeRows(cached, fresh) {
  const merged = indexRows(cached);
  for (const row of fresh || []) {
    const key = row.slug || row.id;
    if (key) merged.set(key, row);
  }
  return Array.from(merged.values());
}

// Panel de Favoritos dentro del cajón del carrito. Es una lista de filas y no
// un masonry a propósito: favoritos es una superficie corta y accionable, y
// así las dos pestañas se ven igual y comparten el ancho del cajón.
// Lee la caché para un conjunto de ids. products = undefined significa "no hay
// nada cacheado todavía" y solo entonces tiene sentido enseñar el esqueleto.
function readFromCache(ids) {
  if (!isSupabaseConfigured() || ids.length === 0) return { products: [], cachedRows: [] };
  const { rows } = getCachedFavorites(ids);
  return {
    products: rows.length > 0 ? orderByFavorites(rows, ids) : undefined,
    cachedRows: rows,
  };
}

export default function FavoritesPanel({ onOpenProduct, bisneIndex }) {
  const { favoriteIds, toggleFavorite, addToCart, withStock } = useApp();
  const [error, setError] = useState(null);
  // Descarta la respuesta de una carga que otra más reciente ya sustituyó.
  const loadTicket = useRef(0);

  // La caché se resuelve DURANTE el render, no en un efecto. Resolverla en el
  // efecto obligaba a montar primero el esqueleto y llenarlo un macrotask
  // después, así que al pulsar la pill se veía un frame de esqueleto entre el
  // carrito y la lista: eso era el parpadeo. Con la caché en el render, la
  // primera imagen ya trae los productos.
  const cacheKey = favoriteIds.join("\u0000");
  const [state, setState] = useState(() => ({ key: cacheKey, ...readFromCache(favoriteIds) }));
  if (state.key !== cacheKey) {
    // Patrón de React para derivar estado en render: solo se dispara cuando los
    // ids cambian de verdad, y el render se repite antes de pintar nada.
    setState({ key: cacheKey, ...readFromCache(favoriteIds) });
    setError(null);
  }
  const { products, cachedRows } = state;

  // Mismo agrupado por bisne y mismo orden que el carrito, para que las dos
  // pestañas del cajón se lean igual. bisneIndex lo carga el shell una vez y
  // lo pasa, así que favoritos no hace una segunda petición.
  const groups = useMemo(
    () => groupByBisne(products || [], bisneIndex),
    [products, bisneIndex]
  );

  // Revalidación en segundo plano: solo lo que falta o está viejo, y sin volver
  // a enseñar el esqueleto porque la lista ya está pintada. Relee la caché aquí
  // (es una lectura síncrona de un Map en memoria) en vez de guardarla en estado,
  // para no arrastrar un array nuevo como dependencia del efecto.
  useEffect(() => {
    if (!isSupabaseConfigured() || favoriteIds.length === 0) return undefined;
    const { refresh } = getCachedFavorites(favoriteIds);
    if (refresh.length === 0) return undefined;
    const ticket = ++loadTicket.current;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        // favoriteIds guarda el id público (slug o uuid) que usa la UI; en DB el
        // uuid real está en products.id y el slug en products.slug.
        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const uuids = refresh.filter((id) => uuidRe.test(id));
        const slugs = refresh.filter((id) => !uuidRe.test(id));
        let query = supabase
          .from("products")
          .select("*, categories!products_category_id_fkey(name), bisnes(handle)")
          .limit(200);
        const conds = [];
        if (uuids.length > 0) conds.push(`id.in.(${uuids.join(",")})`);
        if (slugs.length > 0) conds.push(`slug.in.(${slugs.join(",")})`);
        if (conds.length > 0) query = query.or(conds.join(","));
        const { data, error: err } = await query;
        if (err) throw err;
        setCachedFavorites(data || [], refresh);
        // Una carga más nueva ya sustituyó a esta: se descarta el resultado.
        if (cancelled || loadTicket.current !== ticket) return;
        setState((s) => ({
          ...s,
          products: orderByFavorites(mergeRows(s.cachedRows, data || []), favoriteIds),
        }));
      } catch (e) {
        if (cancelled || loadTicket.current !== ticket) return;
        console.error("Error cargando favoritos:", e);
        // Si ya había algo en caché se conserva: mejor un dato viejo que un
        // panel vacío con un error.
        setState((s) => (s.cachedRows.length === 0 ? { ...s, products: [] } : s));
        setError((prev) => (prev ?? "No pudimos cargar tus favoritos."));
      }
    })();
    return () => { cancelled = true; };
  }, [favoriteIds]);

  if (products === undefined) {
    return (
      <div className="favs-panel" aria-busy="true">
        <div className="favs-skeleton">
          {[0, 1, 2].map((i) => (
            <div className="cart-item" key={i}>
              <div className="cart-item-image-wrapper">
                <div className="perfil-skeleton-line" style={{ height: "100%" }} />
              </div>
              <div className="cart-item-details">
                <div className="perfil-skeleton-line" style={{ width: "45%" }} />
                <div className="perfil-skeleton-line" style={{ width: "30%" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="favs-panel">
        <div className="cart-empty-message">
          <Icon name="warning" size={40} />
          <p>{error}</p>
          <button type="button" className="btn-outline" onClick={load}>Reintentar</button>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="favs-panel">
        <div className="cart-empty-message">
          <Icon name="heart-donate" size={44} />
          <p>No tienes favoritos todavía.</p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            Pulsa el corazón de cualquier producto para guardarlo aquí.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="favs-panel">
      {groups.map((group) => (
        <div className="cart-bisne-group" key={group.bisneId || "sin-bisne"}>
          <div className="cart-bisne-header">
            {group.handle ? (
              <a
                href={`/${group.handle}`}
                className="cart-bisne-name"
                onClick={(e) => { e.preventDefault(); window.location.href = `/${group.handle}`; }}
              >
                <Icon name="shopping-bag" size={13} />
                {group.name || "Tienda"}
              </a>
            ) : (
              <span className="cart-bisne-name">
                <Icon name="shopping-bag" size={13} />
                {group.name || "Productos del catálogo"}
              </span>
            )}
            <span className="cart-bisne-total">{groupTotalLabel(group, false)}</span>
          </div>

          {group.items.map((item) => {
            const product = withStock(item);
            const hasOptions = product.options && Object.keys(product.options).length > 0;
            return (
              <div className="cart-item" key={product.id}>
                <button
                  type="button"
                  className="cart-item-image-wrapper cart-item-open"
                  onClick={() => onOpenProduct(product)}
                  aria-label={`Ver ${product.name}`}
                >
                  <SafeImage src={product.image} alt={product.name} width={60} height={60} className="cart-item-image" />
                </button>
                <div className="cart-item-details">
                  {product.category && <span className="cart-item-category">{product.category}</span>}
                  <span className="cart-item-title cart-item-open" onClick={() => onOpenProduct(product)}>{product.name}</span>
                  <span className="cart-item-price">${product.priceUSD.toFixed(2)}</span>
                  <div className="cart-item-actions">
                    <button
                      type="button"
                      className="btn-fav-add"
                      onClick={() => (hasOptions ? onOpenProduct(product) : addToCart(product))}
                    >
                      {hasOptions ? "Opciones" : "Añadir"}
                    </button>
                    <button
                      type="button"
                      className="btn-remove-item"
                      onClick={() => toggleFavorite(product.id)}
                      title="Quitar de favoritos"
                      aria-label={`Quitar ${product.name} de favoritos`}
                    >
                      <Icon name="heart-filled" size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
