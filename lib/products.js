import fs from "fs";
import path from "path";
import { isSupabaseConfigured, createDataClient } from "./supabase/data";

const productsDirectory = path.join(process.cwd(), "content");

// ── Read & parse store config from JSON (sin cambios: aparte del catálogo) ──
export function getStoreConfig() {
  const filePath = path.join(productsDirectory, "store-config.json");
  try {
    const fileContent = fs.readFileSync(filePath, "utf8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Error reading store configuration:", error);
    return {
      name: "Mi Tienda",
      location: "Tu ciudad, Tu país",
      whatsappNumber: "+5351234567",
      currency: { code: "USD", symbol: "$" },
      messaging: {
        defaultChannel: "whatsapp",
        channels: { whatsapp: { enabled: true } }
      }
    };
  }
}

// ── Catálogo: lee desde Supabase (tabla products + categories) ──
function supabaseClient() {
  return createDataClient();
}

function ratioFromId(id) {
  const n = String(id).length;
  if (n % 3 === 0) return "ratio-tall";
  if (n % 3 === 1) return "ratio-square";
  return "ratio-wide";
}

// Convierte una fila de la tabla products al shape esperado por el front.
function mapRow(row) {
  const id = row.slug || row.id;
  const images = Array.isArray(row.images) ? row.images : [];
  const ratioClass = row.ratio ? `ratio-${row.ratio}` : ratioFromId(id);

  const options = (() => {
    if (!row.options || typeof row.options !== "object") return {};
    const normalized = {};
    for (const [key, values] of Object.entries(row.options)) {
      if (Array.isArray(values)) normalized[key] = values;
      else normalized[key] = values;
    }
    return normalized;
  })();

  return {
    id,
    dbId: row.id || null,
    slug: row.slug || null,
    bisneId: row.bisne_id || null,
    bisneHandle: row.bisnes?.handle || null,
    name: row.name || "Unnamed Product",
    priceUSD: Number(row.price) || 0,
    category: (row.product_categories?.[0]?.categories?.name) || row.categories?.name || "General",
    categories: Array.isArray(row.product_categories)
      ? row.product_categories.map((pc) => pc?.categories?.name).filter(Boolean)
      : row.categories?.name ? [row.categories.name] : [],
    image: images[0] || "/images/placeholder.svg",
    images,
    description: row.description || "",
    featured: !!row.featured,
    offer: !!row.offer,
    originalPrice: row.original_price != null ? Number(row.original_price) : null,
    stock: row.stock != null ? Number(row.stock) : Infinity,
    status: row.status || null,
    attributes: row.attributes && typeof row.attributes === "object" ? { ...row.attributes } : {},
    options,
    promo: row.promo || null,
    seoTitle: row.seo_title || "",
    seoDescription: row.seo_description || "",
    contentHtml: row.content_html || "",
    ratioClass,
  };
}

// ── Todos los productos ──
export async function getProducts() {
  if (!isSupabaseConfigured()) return [];

  const client = supabaseClient();
  const todayIso = new Date().toISOString();
  const { data, error } = await client
    .from("products")
    .select("*, categories!products_category_id_fkey(name), product_categories(categories(id, name, slug, group_name)), bisnes(handle)")
    .or("expires_at.is.null,expires_at.gt." + todayIso)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching products from Supabase:", error.message);
    return [];
  }

  const products = (data || []).map(mapRow);
  return products.sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return a.name.localeCompare(b.name);
  });
}

// ── Producto por slug (id) ──
export async function getProductById(id) {
  if (!id) return null;
  const products = await getProducts();
  return products.find((p) => p && p.id === id) || null;
}

// ── Todos los slugs (urls /product/[id] con el mismo formato que antes) ──
export async function getAllProductIds() {
  if (!isSupabaseConfigured()) return [];

  const client = supabaseClient();
  const { data, error } = await client.from("products").select("slug");
  if (error) {
    console.error("Error fetching product ids from Supabase:", error.message);
    return [];
  }
  return (data || []).map((row) => row.slug).filter(Boolean);
}