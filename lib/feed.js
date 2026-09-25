import { isSupabaseConfigured, createDataClient } from "./supabase/data";

function feedClient() {
  if (!isSupabaseConfigured()) throw new Error("Supabase no configurado");
  return createDataClient();
}

// Bisnes con rating promedio (reviews) y nº de productos (para BisnesNearby).
export async function getBisnes() {
  if (!isSupabaseConfigured()) return [];
  const client = feedClient();

  const { data, error } = await client
    .from("bisnes")
    .select("id, handle, business_name, slogan, logo_url, cover_url, address, map_embed_url, verified, created_at, categories(name)");
  if (error) {
    console.error("Error fetching bisnes:", error.message);
    return [];
  }

  const { data: reviews } = await client.from("reviews").select("bisne_id, rating");
  const ratingByBisne = {};
  (reviews || []).forEach((r) => {
    if (!r.bisne_id) return;
    if (!ratingByBisne[r.bisne_id]) ratingByBisne[r.bisne_id] = { sum: 0, count: 0 };
    ratingByBisne[r.bisne_id].sum += r.rating;
    ratingByBisne[r.bisne_id].count += 1;
  });

  const { data: products } = await client.from("products").select("bisne_id");
  const countByBisne = {};
  (products || []).forEach((p) => {
    if (p.bisne_id) countByBisne[p.bisne_id] = (countByBisne[p.bisne_id] || 0) + 1;
  });

  return (data || []).map((b) => {
    const rating = ratingByBisne[b.id];
    return {
      id: b.id,
      handle: b.handle,
      business_name: b.business_name,
      slogan: b.slogan || "",
      logoUrl: b.logo_url || null,
      coverUrl: b.cover_url || null,
      address: b.address || "",
      mapEmbedUrl: b.map_embed_url || null,
      verified: !!b.verified,
      createdAt: b.created_at || null,
      category: b.categories?.name || "General",
      productCount: countByBisne[b.id] || 0,
      rating: rating ? rating.sum / rating.count : null,
      ratingCount: rating ? rating.count : 0,
    };
  });
}

// ── Promos globales del sitio (slider de la Home, UI_UX.md §4.1) ────────
// Gestionadas en /admin; independientes de usuarios y bisnes.
export async function getSitePromos() {
  if (!isSupabaseConfigured()) return [];
  try {
    const client = feedClient();
    const { data, error } = await client
      .from("site_promos")
      .select("id, title, subtitle, image_url, link_url, link_type, bisne_handle, position")
      .eq("active", true)
      .order("position", { ascending: true })
      .limit(12);
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("Error fetching site promos:", e.message);
    return [];
  }
}