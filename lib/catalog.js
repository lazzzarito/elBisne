"use client";

import { createClient, isSupabaseConfigured } from "./supabase/client";

// ── Catálogo desde el cliente (para el buscador global) ──────────────────
// El buscador vive en un popup global (no recibe datos del servidor), así
// que carga productos y bisnes por su cuenta la primera vez que se abre.
// Mismo shape que lib/products.js mapRow (reglas del front).

// Fila de la tabla products → shape que espera la UI (igual que lib/products.js)
export function mapProductRow(row) {
  const id = row.slug || row.id;
  const images = Array.isArray(row.images) ? row.images : [];
  // Una sola categoría por producto: `category_id` manda (ver lib/products.js).
  const category = row.categories?.name || "General";
  return {
    id,
    dbId: row.id || null,
    slug: row.slug || null,
    bisneId: row.bisne_id || null,
    bisneHandle: row.bisnes?.handle || null,
    name: row.name || "Producto",
    priceUSD: Number(row.price) || 0,
    category,
    categories: category ? [category] : [],
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
    promo: row.promo || null,
    ratioClass: row.ratio ? `ratio-${row.ratio}` : "ratio-square",
    createdAt: row.created_at || null,
  };
}

// Fila de la tabla bisnes → shape que espera GlobalSearch
export function mapBisneRow(row, productCount = 0) {
  return {
    id: row.id,
    handle: row.handle,
    business_name: row.business_name,
    slogan: row.slogan || "",
    logoUrl: row.logo_url || null,
    verified: !!row.verified,
    category: row.categories?.name || "General",
    productCount,
    createdAt: row.created_at || null,
  };
}

export async function fetchCatalog() {
  if (!isSupabaseConfigured()) return { products: [], bisnes: [] };
  try {
    const supabase = createClient();
    const [productsRes, bisnesRes] = await Promise.all([
      supabase
        .from("products")
        .select("*, categories!products_category_id_fkey(name), bisnes(handle)")
        .order("sort_order", { ascending: true })
        .limit(500),
      supabase
        .from("bisnes")
        .select("id, handle, business_name, slogan, logo_url, verified, created_at, categories(name)")
        .limit(200),
    ]);
    if (productsRes.error) throw productsRes.error;
    if (bisnesRes.error) throw bisnesRes.error;

    const products = (productsRes.data || []).map(mapProductRow);

    // Conteo de productos por bisne (para la meta de las sugerencias)
    const countByBisne = {};
    (productsRes.data || []).forEach((p) => {
      if (p.bisne_id) countByBisne[p.bisne_id] = (countByBisne[p.bisne_id] || 0) + 1;
    });

    const bisnes = (bisnesRes.data || []).map((b) => mapBisneRow(b, countByBisne[b.id] || 0));

    return { products, bisnes };
  } catch (e) {
    console.error("Error cargando catálogo para el buscador:", e);
    return { products: [], bisnes: [] };
  }
}
