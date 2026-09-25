// ════════════════════════════════════════════════════════════════════
// elBisne · scripts/fix-promo-links.mjs
// Actualiza las promos demo para que "Visitar enlace" lleve al perfil
// de un bisne real (flujo completo: promo → perfil → comprar).
// Uso: node scripts/fix-promo-links.mjs
// ════════════════════════════════════════════════════════════════════
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
const env = {};
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.+)$/);
  if (m) env[m[1]] = m[2].trim();
}

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE) {
  console.error("Faltan variables de Supabase en .env.local");
  process.exit(1);
}

const UPDATES = [
  { title: "Bienvenida a elBisne", bisne_handle: "bosque-verde" },
  { title: "Bisnes verificados", bisne_handle: "dorado-shop" },
  { title: "Vende en elBisne", bisne_handle: "lux-beauty" },
];

async function main() {
  for (const u of UPDATES) {
    const res = await fetch(
      `${URL}/rest/v1/site_promos?title=eq.${encodeURIComponent(u.title)}`,
      {
        method: "PATCH",
        headers: {
          apikey: SERVICE,
          Authorization: `Bearer ${SERVICE}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          link_type: "bisne",
          bisne_handle: u.bisne_handle,
          link_url: "",
        }),
      }
    );
    const json = res.ok ? await res.json() : null;
    if (res.ok && json?.length > 0) {
      console.log(`✅ "${u.title}" → /${u.bisne_handle}`);
    } else {
      console.error(`❌ "${u.title}": ${res.status} ${JSON.stringify(json)?.slice(0, 120)}`);
      process.exitCode = 1;
    }
  }
  console.log("\n🎉 Promos actualizadas. El popup ahora lleva al perfil del bisne.");
}

main();
