// ════════════════════════════════════════════════════════════════════
// elBisne · scripts/migrate-products.mjs
// Volcado 1:1 de content/products/*.md → Supabase (tabla products + Storage).
// Requiere migración 002 aplicada y Supabase configurado en .env.local.
// Uso: node scripts/migrate-products.mjs
// ════════════════════════════════════════════════════════════════════
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { resolve, join } from "path";
import matter from "gray-matter";
import { marked } from "marked";

const envPath = resolve(process.cwd(), ".env.local");
const lines = readFileSync(envPath, "utf8").split("\n");
const env = {};
for (const line of lines) {
  const m = line.match(/^([A-Z_]+)=(.+)$/);
  if (m) env[m[1]] = m[2].trim();
}

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const BUCKET = "product-images";
const PUBLIC_BASE = `${URL}/storage/v1/object/public/${BUCKET}`;
const PRODUCTS_DIR = resolve(process.cwd(), "content", "products");

if (!existsSync(PRODUCTS_DIR)) {
  console.error(`El corpus content/products/*.md ya no existe (catalogó vivo en Supabase).`);
  console.error("Los productos se insertan directamente en Supabase; este script queda obsoleto.");
  process.exit(1);
}

// Categoría (nombre MD) → handle del bisne dueño
const CATEGORY_TO_HANDLE = {
  "Hogar": "bosque-verde",
  "Hogar y Cocina": "bosque-verde",
  "Joyería": "dorado-shop",
  "Accesorios": "dorado-shop",
  "Perfumería": "lux-beauty",
  "Cosméticos": "lux-beauty",
  "Ropa": "bazar-elbisne",
  "Calzado": "bazar-elbisne",
  "Deportes": "bazar-elbisne",
  "Electrónica": "bazar-elbisne",
  "General": "bazar-elbisne",
};

async function api(path, method, body, headers = {}, raw = false) {
  const res = await fetch(`${URL}${path}`, {
    method,
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "application/json",
      ...headers,
    },
    body: body !== undefined && !raw ? JSON.stringify(body) : body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${method} ${path}: ${text.slice(0, 400)}`);
  }
  return res.status === 204 ? null : res.json();
}

function ratioFromId(id) {
  const n = id.length;
  if (n % 3 === 0) return "tall";
  if (n % 3 === 1) return "square";
  return "wide";
}

function toStorageUrl(name) {
  return `${PUBLIC_BASE}/${encodeURIComponent(name)}`;
}

function resolveImage(img) {
  if (typeof img !== "string") return img;
  if (img.startsWith("/") || img.startsWith("http")) return img;
  return toStorageUrl(img);
}

// ── Storage: asegurar bucket público ──
async function ensureBucket() {
  const buckets = await api("/storage/v1/bucket", "GET");
  if (buckets.some((b) => b.id === BUCKET)) {
    console.log(`Bucket ${BUCKET} ya existe`);
    return;
  }
  await api("/storage/v1/bucket", "POST", { id: BUCKET, name: BUCKET, public: true });
  console.log(`Bucket ${BUCKET} creado (público)`);
}

// ── Storage: subir imagen local ──
async function uploadImage(fileName) {
  const filePath = join(PRODUCTS_DIR, fileName);
  const buffer = readFileSync(filePath);
  const url = `${URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(fileName)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "image/webp",
      "x-upsert": "true",
    },
    body: buffer,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload ${fileName}: ${res.status} ${text.slice(0, 200)}`);
  }
  console.log(`  ↑ ${fileName}`);
}

function collectLocalImages() {
  const present = new Set(readdirSync(PRODUCTS_DIR).filter((f) => f.endsWith(".webp")));
  const used = new Set();
  for (const f of readdirSync(PRODUCTS_DIR).filter((f) => f.endsWith(".md"))) {
    const { data } = matter(readFileSync(join(PRODUCTS_DIR, f), "utf8"));
    const imgs = [
      ...(Array.isArray(data.image) ? data.image : data.image ? [data.image] : []),
      ...(Array.isArray(data.images) ? data.images : data.images ? [data.images] : []),
    ];
    for (const img of imgs) {
      if (typeof img === "string" && !img.startsWith("/") && !img.startsWith("http")) used.add(img);
    }
    if (data.options) {
      for (const vals of Object.values(data.options)) {
        if (!Array.isArray(vals)) continue;
        for (const v of vals) {
          if (v && typeof v.image === "string" && !v.image.startsWith("/") && !v.image.startsWith("http")) {
            used.add(v.image);
          }
        }
      }
    }
  }
  return [...used].filter((name) => present.has(name));
}

// ── Parse MD → payload de producto ──
async function parseProduct(fileName, catIdByName, bisneByHandle) {
  const id = fileName.replace(/\.md$/, "");
  const fileContents = readFileSync(join(PRODUCTS_DIR, fileName), "utf8");
  const { data, content } = matter(fileContents);
  const contentHtml = await marked.parse(content);

  const images = (Array.isArray(data.images) ? data.images : data.images ? [data.images] : data.image ? [data.image] : [])
    .map(resolveImage);

  const options = (() => {
    if (!data.options) return {};
    const out = {};
    for (const [key, values] of Object.entries(data.options)) {
      if (!Array.isArray(values)) continue;
      out[key] = values.map((v) => v && v.image ? { ...v, image: resolveImage(v.image) } : v);
    }
    return out;
  })();

  const category = data.category || "General";
  const status = data.status || null;

  return {
    slug: data.id || id,
    bisne_id: bisneByHandle[CATEGORY_TO_HANDLE[category]],
    name: data.name || id,
    description: data.description || "",
    price: parseFloat(data.priceUSD) || 0,
    original_price: data.originalPrice != null ? parseFloat(data.originalPrice) : null,
    stock: data.stock !== undefined ? parseInt(data.stock, 10) : null,
    status,
    featured: !!data.featured,
    offer: !!data.offer,
    category_id: catIdByName[category],
    images,
    attributes: data.attributes ? { ...data.attributes } : {},
    options,
    ratio: data.ratio || ratioFromId(data.id || id),
    sort_order: 0,
    content_html: contentHtml,
    seo_title: data.seoTitle || "",
    seo_description: data.seoDescription || "",
    promo: data.promo || null,
  };
}

async function main() {
  console.log("1) Asegurando Storage bucket...");
  await ensureBucket();

  console.log("\n2) Subiendo imágenes locales...");
  const localImages = collectLocalImages();
  for (const name of localImages) await uploadImage(name);

  console.log("\n3) Leyendo referencias (categorías, bisnes)...");
  const categories = await api("/rest/v1/categories?select=id,name", "GET");
  const catIdByName = Object.fromEntries(categories.map((c) => [c.name, c.id]));
  const bisnes = await api("/rest/v1/bisnes?select=id,handle", "GET");
  const bisneByHandle = Object.fromEntries(bisnes.map((b) => [b.handle, b.id]));
  const missingBisne = Object.values(CATEGORY_TO_HANDLE).filter((h) => !bisneByHandle[h]);
  if (missingBisne.length) throw new Error(`Faltan bisnes: ${missingBisne.join(", ")}`);

  const mdFiles = readdirSync(PRODUCTS_DIR).filter((f) => f.endsWith(".md"));
  console.log(`\n4) Parseando ${mdFiles.length} productos .md...`);
  const products = [];
  for (const f of mdFiles) {
    try {
      const p = await parseProduct(f, catIdByName, bisneByHandle);
      products.push(p);
      console.log(`  ✓ ${p.slug} → ${p.bisne_id === bisneByHandle[p.slug] ? "?" : "→"} (${p.bisne_id ? "ok" : "SIN BISNE"})`);
    } catch (err) {
      console.error(`  ✗ ${f}: ${err.message}`);
      process.exit(1);
    }
  }

  const invalidBisne = products.filter((p) => !p.bisne_id);
  const invalidCategory = products.filter((p) => !p.category_id);
  if (invalidBisne.length || invalidCategory.length) {
    if (invalidBisne.length) console.error(`Hay ${invalidBisne.length} productos sin bisne válido`);
    if (invalidCategory.length) console.error(`Hay ${invalidCategory.length} productos sin categoría válida`);
    process.exit(1);
  }

  console.log("\n5) Eliminando productos anteriores...");
  await api("/rest/v1/products?id=neq.00000000-0000-0000-0000-000000000000", "DELETE");
  console.log("  ✓ productos antiguos eliminados");

  console.log("\n6) Insertando productos...");
  const seenSlugs = new Set();
  for (const p of products) {
    if (seenSlugs.has(p.slug)) throw new Error(`Slug duplicado: ${p.slug}`);
    seenSlugs.add(p.slug);
    try {
      const [created] = await api("/rest/v1/products", "POST", p, { Prefer: "return=representation" });
      console.log(`  ✓ ${created.slug} (${created.id})`);
    } catch (err) {
      console.error(`  ✗ ${p.slug}: ${err.message}`);
      process.exit(1);
    }
  }

  console.log(`\nMigración completada: ${products.length} productos en Supabase.`);
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});