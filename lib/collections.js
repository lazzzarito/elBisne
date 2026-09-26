import { isSupabaseConfigured, createDataClient } from "./supabase/data";

// Colecciones / Combos (lectura pública, SSG/ISR)
// Cada colección agrupa N productos (relación N:N vía collection_items) y
// tiene un precio fijo de combo. Un producto puede estar en varias.

function client() {
  if (!isSupabaseConfigured()) return null;
  return createDataClient();
}

// Fila de products → shape de la UI (mismo contrato que lib/products.js mapRow)
function mapProduct(row) {
  const id = row.slug || row.id;
  const images = Array.isArray(row.images) ? row.images : [];
  return {
    id,
    dbId: row.id || null,
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
    options: row.options && typeof row.options === "object" ? row.options : {},
    promo: row.promo || null,
    ratioClass: row.ratio ? `ratio-${row.ratio}` : "ratio-square",
  };
}

function mapCollection(row) {
  const products = (row.collection_items || [])
    .slice()
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map((ci) => ci.products)
    .filter(Boolean)
    .map(mapProduct);

  return {
    id: row.id,
    bisneId: row.bisne_id,
    title: row.title || "Colección",
    bio: row.bio || "",
    imageUrl: row.image_url || null,
    price: Number(row.price) || 0,
    pinned: !!row.pinned,
    position: row.position || 0,
    products,
  };
}

export async function getCollectionsByBisne(bisneId) {
  if (!bisneId) return [];
  const c = client();
  if (!c) return [];
  try {
    const { data, error } = await c
      .from("collections")
      .select("*, collection_items(position, products(*, categories!products_category_id_fkey(name)))")
      .eq("bisne_id", bisneId)
      .eq("active", true)
      .order("position", { ascending: true });
    if (error) throw error;
    return (data || []).map(mapCollection);
  } catch (e) {
    console.error("Error cargando colecciones:", e?.message || e, { code: e?.code, details: e?.details, hint: e?.hint });
    return [];
  }
}

// Productos de una colección por id (para vistas puntuales si hiciera falta)
export async function getCollectionById(id) {
  if (!id) return null;
  const c = client();
  if (!c) return null;
  try {
    const { data, error } = await c
      .from("collections")
      .select("*, collection_items(position, products(*, categories!products_category_id_fkey(name)))")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapCollection(data) : null;
  } catch (e) {
    console.error("Error cargando colección:", e?.message || e, { code: e?.code, details: e?.details, hint: e?.hint });
    return null;
  }
}
