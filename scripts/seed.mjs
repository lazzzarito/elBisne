import { readFileSync } from "fs";
import { resolve } from "path";

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

async function api(path, method, body, headers = {}) {
  const res = await fetch(`${URL}${path}`, {
    method,
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${path}: ${JSON.stringify(json)}`);
  return json;
}

const DEMO_USERS = [
  { email: "duena@bosqueverde.example", password: "Demodemo123", full_name: "María Vera" },
  { email: "owner@dorado.example", password: "Demodemo123", full_name: "Oscar Dorado" },
  { email: "gerente@luxbeauty.example", password: "Demodemo123", full_name: "Lucia Franco" },
];

const BISNES = [
  {
    slug: "bosque-verde",
    business_name: "El Bosque Verde",
    slogan: "Cuidado del hogar, natural y sereno",
    phone_whatsapp: "+34600000001",
    description: "Velas artesanales, infusiones y accesorios de hogar con estética natural.",
    category_slug: "hogar",
    delivery_mode: "delivery",
    verified: true,
    theme: { accent: "#2f7d4f", radiusScale: 1.0 },
    layout: { masonryColumns: 2, showOffers: true, showMap: false },
  },
  {
    slug: "dorado-shop",
    business_name: "Dorado Shop",
    slogan: "Joyería y accesorios con brillo propio",
    phone_whatsapp: "+34600000002",
    description: "Joyas y complementos seleccionados: de lo clásico a lo moderno.",
    category_slug: "joyeria",
    delivery_mode: "both",
    verified: true,
    theme: { accent: "#b8860b", radiusScale: 0.8 },
    layout: { masonryColumns: 2, showOffers: true, showMap: false },
  },
  {
    slug: "lux-beauty",
    business_name: "Lux Beauty",
    slogan: "Perfumería y cosmética con esencia",
    phone_whatsapp: "+34600000003",
    description: "Fragancias y cosmética de alta calidad para el día a día.",
    category_slug: "perfumeria",
    delivery_mode: "delivery",
    verified: false,
    theme: { accent: "#c2185b", radiusScale: 1.15 },
    layout: { masonryColumns: 2, showOffers: true, showMap: false },
  },
];

const PRODUCTS = [
  { bisne: 0, name: "Juego de tazas de cerámica", description: "Tres tazas de cerámica artesanal con acabado esmaltado.", price: 24, original_price: 32, stock: 8, featured: true, offer: false, category: "hogar", image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?q=80&w=600&auto=format&fit=crop", ratio: "square" },
  { bisne: 0, name: "Trío de velas de soja aromáticas", description: "Tres velas de cera de soja con aroma a vainilla, lavanda y cítricos.", price: 19, original_price: 26, stock: 12, featured: true, offer: true, category: "hogar", image: "https://images.unsplash.com/photo-1603006905003-be475563bc59?q=80&w=600&auto=format&fit=crop", ratio: "tall" },
  { bisne: 0, name: "Aceite relajante de lavanda", description: "Aceite esencial de lavanda para difusor y masajes. 50 ml.", price: 14, original_price: 18, stock: 20, featured: false, offer: false, category: "cosmeticos", image: "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=600&auto=format&fit=crop", ratio: "square" },
  { bisne: 1, name: "Aros de plata", description: "Pendientes de aro en plata de ley.", price: 32, original_price: 42, stock: 6, featured: true, offer: true, category: "joyeria", image: "https://images.unsplash.com/photo-1635767798638-3e25273a8236?q=80&w=600&auto=format&fit=crop", ratio: "square" },
  { bisne: 1, name: "Gafas de sol redondas retro", description: "Estilo retro con protección UV400.", price: 27, original_price: 36, stock: 10, featured: false, offer: false, category: "accesorios", image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=600&auto=format&fit=crop", ratio: "square" },
  { bisne: 1, name: "Cartera de cuero", description: "Cartera de cuero genuino con varios compartimentos.", price: 38, original_price: null, stock: 9, featured: true, offer: false, category: "accesorios", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=600&auto=format&fit=crop", ratio: "wide" },
  { bisne: 2, name: "Perfume Floral de Rosa", description: "Fragancia de rosa silvestre y jazmín premium.", price: 18, original_price: 25, stock: 5, featured: true, offer: true, category: "perfumeria", image: "/api/images/products/perfume_rose.webp", ratio: "tall" },
  { bisne: 2, name: "Colonia Cítrica de Verano", description: "Colonia fresca con notas de cítricos y menta.", price: 16, original_price: 21, stock: 15, featured: true, offer: true, category: "perfumeria", image: "https://images.unsplash.com/photo-1587017539504-67cfbddac569?q=80&w=600&auto=format&fit=crop", ratio: "square" },
  { bisne: 2, name: "Sérum de vitamina C", description: "Sérum facial iluminador. 30 ml.", price: 22, original_price: 29, stock: 7, featured: false, offer: false, category: "cosmeticos", image: "/api/images/products/vitamin-c-brightening-serum.webp", ratio: "square" },
];

async function main() {
  console.log("Creando usuarios demo...");
  const userIds = [];
  for (const u of DEMO_USERS) {
    const created = await api("/auth/v1/admin/users", "POST", {
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name },
    });
    console.log(`  ✓ ${u.email} -> ${created.id}`);
    userIds.push(created.id);
    await new Promise((r) => setTimeout(r, 200));
  }

  // fetch categories map
  const categories = await api("/rest/v1/categories?select=id,slug", "GET");
  const catMap = Object.fromEntries(categories.map((c) => [c.slug, c.id]));

  console.log("\nCreando bisnes...");
  const bisneIds = [];
  for (let i = 0; i < BISNES.length; i++) {
    const b = BISNES[i];
    const payload = {
      owner_id: userIds[i],
      handle: b.slug,
      business_name: b.business_name,
      slogan: b.slogan,
      phone_whatsapp: b.phone_whatsapp,
      description: b.description,
      category_id: catMap[b.category_slug],
      delivery_mode: b.delivery_mode,
      verified: b.verified,
      theme: b.theme,
      layout: b.layout,
    };
    const [created] = await api("/rest/v1/bisnes", "POST", payload, { Prefer: "return=representation" });
    console.log(`  ✓ ${b.slug} -> ${created.id}`);
    bisneIds.push(created.id);
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log("\nCreando productos...");
  for (const p of PRODUCTS) {
    const payload = {
      bisne_id: bisneIds[p.bisne],
      name: p.name,
      description: p.description,
      price: p.price,
      original_price: p.original_price,
      stock: p.stock,
      status: "available",
      featured: p.featured,
      offer: p.offer,
      category_id: catMap[p.category],
      images: [p.image],
      ratio: p.ratio,
      sort_order: 0,
    };
    const [created] = await api("/rest/v1/products", "POST", payload, { Prefer: "return=representation" });
    console.log(`  ✓ ${p.name} -> ${created.id}`);
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log("\nSeed completado.");
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});