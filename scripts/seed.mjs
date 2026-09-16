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
  { email: "bazar@elbisne.example", password: "Demodemo123", full_name: "Inés Bazar" },
];

const BISNES = [
  {
    slug: "bosque-verde",
    business_name: "El Bosque Verde",
    slogan: "Cuidado del hogar, natural y sereno",
    phone_whatsapp: "+573000000001",
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
    phone_whatsapp: "+573000000002",
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
    phone_whatsapp: "+573000000003",
    description: "Fragancias y cosmética de alta calidad para el día a día.",
    category_slug: "perfumeria",
    delivery_mode: "delivery",
    verified: false,
    theme: { accent: "#c2185b", radiusScale: 1.15 },
    layout: { masonryColumns: 2, showOffers: true, showMap: false },
  },
  {
    slug: "bazar-elbisne",
    business_name: "Bazar elBisne",
    slogan: "Ropa, calzado, deporte y electrónica",
    phone_whatsapp: "+573000000004",
    description: "Multimarca: moda, calzado, deportes y electrónica para todos.",
    category_slug: "general",
    delivery_mode: "both",
    verified: false,
    theme: { accent: "#1f6feb", radiusScale: 1.0 },
    layout: { masonryColumns: 2, showOffers: true, showMap: false },
  },
];

const PRODUCTS = [];

async function main() {
  console.log("Creando usuarios demo...");
  const existingUsers = await api("/auth/v1/admin/users?per_page=1000", "GET");
  const existingByEmail = Object.fromEntries(existingUsers.users.map((u) => [u.email, u.id]));
  const userIds = [];
  for (const u of DEMO_USERS) {
    if (existingByEmail[u.email]) {
      console.log(`  ↻ ${u.email} -> ya existe (${existingByEmail[u.email]})`);
      userIds.push(existingByEmail[u.email]);
      continue;
    }
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
  const existingBisnes = await api("/rest/v1/bisnes?select=id,handle,owner_id", "GET");
  const existingByHandle = Object.fromEntries(existingBisnes.map((b) => [b.handle, b]));
  const bisneIds = [];
  for (let i = 0; i < BISNES.length; i++) {
    const b = BISNES[i];
    const existing = existingByHandle[b.slug];
    if (existing) {
      console.log(`  ↻ ${b.slug} -> ya existe (${existing.id})`);
      bisneIds.push(existing.id);
      continue;
    }
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

  console.log("\nSeed completado.");
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});