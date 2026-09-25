import { isSupabaseConfigured, createDataClient } from "./supabase/data";

function storeClient() {
  if (!isSupabaseConfigured()) throw new Error("Supabase no configurado");
  return createDataClient();
}

// Convierte una fila de bisnes al shape que espera el front de la tienda.
function mapBisne(row) {
  return {
    id: row.id,
    handle: row.handle,
    business_name: row.business_name,
    slogan: row.slogan || "",
    description: row.description || "",
    logoUrl: row.logo_url || null,
    coverUrl: row.cover_url || null,
    phoneWhatsapp: row.phone_whatsapp || "",
    address: row.address || "",
    hours: row.hours || "",
    category: row.categories?.name || "General",
    deliveryMode: row.delivery_mode || "both",
    socialLinks: row.social_links || {},
    mapEmbedUrl: row.map_embed_url || "",
    theme: row.theme || {},
    pinnedBanner: row.pinned_banner || null,
    banners: Array.isArray(row.banners) ? row.banners : [],
    verified: !!row.verified,
    currencyCode: row.currency_code || "USD",
    currencySymbol: row.currency_symbol || "$",
    type: row.type || "business",
    isPersonal: row.type === "personal",
  };
}

// Bisne por handle, incluyendo categoría, rating (reviews) y nº de productos.
export async function getBisneByHandle(handle) {
  if (!isSupabaseConfigured()) return null;
  const client = storeClient();

  const { data, error } = await client
    .from("bisnes")
    .select("*, categories(name)")
    .eq("handle", handle)
    .maybeSingle();
  if (error || !data) return null;

  const [{ data: reviews }, { data: products }] = await Promise.all([
    client.from("reviews").select("rating").eq("bisne_id", data.id),
    client.from("products").select("id").eq("bisne_id", data.id),
  ]);

  const sum = (reviews || []).reduce((acc, r) => acc + (r.rating || 0), 0);
  const count = (reviews || []).length;

  const bisne = mapBisne(data);
  return {
    ...bisne,
    productCount: (products || []).length,
    rating: count > 0 ? sum / count : null,
    ratingCount: count,
  };
}

// Todos los handles de bisnes (para generateStaticParams).
export async function getAllBisneHandles() {
  if (!isSupabaseConfigured()) return [];
  const client = storeClient();
  const { data, error } = await client.from("bisnes").select("handle");
  if (error) {
    console.error("Error fetching bisne handles:", error.message);
    return [];
  }
  return (data || []).map((row) => row.handle).filter(Boolean);
}