// ════════════════════════════════════════════════════════════════════
// elBisne · scripts/apply-008-management.mjs
// Ejecuta la migración 008 vía la Management API de Supabase.
// Requiere: SUPABASE_ACCESS_TOKEN en el entorno (NO se guarda en disco).
// Uso:  SUPABASE_ACCESS_TOKEN=sbp_... node scripts/apply-008-management.mjs
// ════════════════════════════════════════════════════════════════════
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
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!URL || !SERVICE || !ANON) {
  console.error("Faltan variables de Supabase en .env.local");
  process.exit(1);
}
if (!ACCESS_TOKEN) {
  console.error("Falta SUPABASE_ACCESS_TOKEN en el entorno.");
  process.exit(1);
}

const projectRef = URL.replace(/^https:\/\//, "").split(".")[0];
const MIGRATION_SQL = readFileSync(
  resolve(process.cwd(), "supabase", "migrations", "008_redesign_social.sql"),
  "utf8"
);

async function mgmt(path, method, body) {
  const res = await fetch(`https://api.supabase.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* noop */ }
  return { ok: res.ok, status: res.status, json, text };
}

async function rest(path, method, body, key = SERVICE) {
  const res = await fetch(`${URL}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* noop */ }
  return { ok: res.ok, status: res.status, json, text };
}

async function main() {
  console.log(`🔌 Proyecto: ${projectRef}`);
  console.log("📡 Aplicando migración 008 vía Management API…\n");

  const r = await mgmt(`/projects/${projectRef}/database/query`, "POST", {
    query: MIGRATION_SQL,
  });

  if (!r.ok) {
    console.error(`❌ Error ${r.status} ejecutando el SQL:`);
    console.error((r.json && (r.json.error || r.json.message)) || r.text?.slice(0, 500));
    process.exit(1);
  }

  console.log("✅ Migración 008 aplicada (tablas, policies, RPC y grants).\n");

  // ── Verificación de esquema (rol anon) ─────────────────────────────
  console.log("🔎 Verificando esquema…");
  const checkDefs = [
    ["site_promos", "/rest/v1/site_promos?select=id&limit=1"],
    ["ad_slots", "/rest/v1/ad_slots?select=id&limit=1"],
    ["bisnes.pinned_banner", "/rest/v1/bisnes?select=pinned_banner&limit=1"],
  ];
  const checks = await Promise.all(
    checkDefs.map(([, path]) => rest(path, "GET", null, ANON))
  );
  checks.forEach((r, i) => {
    console.log(`   ${checkDefs[i][0]}......... ${r.ok ? "✅" : "❌"}`);
  });
  const rpc = await rest("/rest/v1/rpc/get_bisne_followers", "POST", { p_bisne_id: "00000000-0000-0000-0000-000000000000" }, ANON);
  console.log(`   get_bisne_followers.... ${rpc.status !== 404 ? "✅" : "❌"}\n`);

  if (checks.some((r) => !r.ok) || rpc.status === 404) {
    console.error("⚠️  El esquema no quedó completo; revisa los errores arriba.");
    process.exit(1);
  }

  // ── Promos demo (idempotente por título) ───────────────────────────
  console.log("🌱 Sembrando promos demo…");
  const demoPromos = [
    {
      title: "Bienvenida a elBisne",
      subtitle: "Descubre bisnes locales cerca de ti",
      image_url: "/api/images/promos/landscape-promo.webp",
      link_url: "",
      link_type: "url",
      bisne_handle: null,
      position: 0,
      active: true,
    },
    {
      title: "Bisnes verificados",
      subtitle: "Compra con confianza",
      image_url: "/api/images/promos/square-promo-1.webp",
      link_url: "",
      link_type: "url",
      bisne_handle: null,
      position: 1,
      active: true,
    },
    {
      title: "Vende en elBisne",
      subtitle: "Tu catálogo con pedidos por WhatsApp",
      image_url: "/api/images/promos/square-promo-2.webp",
      link_url: "",
      link_type: "url",
      bisne_handle: null,
      position: 2,
      active: true,
    },
  ];

  const existing = await rest("/rest/v1/site_promos?select=id,title&limit=50");
  const existingTitles = new Set((existing.json || []).map((p) => p.title));
  for (const promo of demoPromos) {
    if (existingTitles.has(promo.title)) {
      console.log(`   ↷ "${promo.title}" ya existe, se omite`);
      continue;
    }
    const pr = await rest("/rest/v1/site_promos", "POST", promo);
    console.log(`   ${pr.ok ? "✅" : "❌"} promo "${promo.title}"${pr.ok ? "" : ` → ${pr.status} ${pr.text?.slice(0, 120)}`}`);
  }

  // ── Anuncio demo home-top (idempotente) ────────────────────────────
  const adCheck = await rest("/rest/v1/ad_slots?select=id,slot&slot=eq.home-top&limit=1");
  if ((adCheck.json || []).length === 0) {
    const ar = await rest("/rest/v1/ad_slots", "POST", {
      slot: "home-top",
      image_url: "/api/images/promos/square-promo-1.webp",
      link_url: "https://example.com",
      title: "Anuncio demo",
      active: true,
    });
    console.log(`   ${ar.ok ? "✅" : "❌"} anuncio demo en "home-top"${ar.ok ? "" : ` → ${ar.status} ${ar.text?.slice(0, 120)}`}`);
  } else {
    console.log('   ↷ anuncio "home-top" ya existe, se omite');
  }

  // ── Verificación final como anon (lo que verá el sitio) ────────────
  console.log("\n👁️  Vista anon (lo que mostrará la app):");
  const anonPromos = await rest(
    "/rest/v1/site_promos?select=title,position,active&active=eq.true&order=position.asc",
    "GET",
    null,
    ANON
  );
  (anonPromos.json || []).forEach((p) =>
    console.log(`   · promo [${p.position}] ${p.title} ${p.active ? "(activa)" : "(inactiva)"}`)
  );
  const anonAds = await rest("/rest/v1/ad_slots?select=slot&active=eq.true", "GET", null, ANON);
  console.log(`   · slots con anuncio: ${(anonAds.json || []).map((a) => a.slot).join(", ") || "ninguno"}`);

  console.log("\n🎉 Migración 008 completada y datos sembrados.");
  console.log("   Prueba: npm run dev → la Home muestra el slider de promos y el anuncio.");
  console.log("   🔒 Recuerda revocar el token: https://supabase.com/dashboard/account/tokens");
}

main();
