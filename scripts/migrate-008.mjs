// ════════════════════════════════════════════════════════════════════
// elBisne · scripts/migrate-008.mjs
// Rediseño social v2.0 (UI_UX.md): migración 008 + promos demo.
//
// ¿Qué hace?
//  1. Comprueba si las tablas de la migración 008 existen (site_promos,
//     ad_slots, columna bisnes.pinned_banner y RPC get_bisne_followers).
//  2. Si NO existen: copia el SQL al portapapeles (Windows/macOS/Linux)
//     y abre la página del SQL Editor de tu proyecto. Pegas (Ctrl+V),
//     pulsas RUN y vuelves a ejecutar este script.
//  3. Si existen: siembra 3 promos demo (usa las imágenes locales de
//     /api/images/promos) y 1 anuncio demo, y verifica todo.
//
// Uso:  node scripts/migrate-008.mjs
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

if (!URL || !SERVICE) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

// ── SQL de la migración 008 (idéntico a supabase/migrations/008_redesign_social.sql) ──
const MIGRATION_SQL = readFileSync(
  resolve(process.cwd(), "supabase", "migrations", "008_redesign_social.sql"),
  "utf8"
);

async function api(path, method, body) {
  const res = await fetch(`${URL}${path}`, {
    method,
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* no json */ }
  return { ok: res.ok, status: res.status, json, text };
}

// ── Detección de estado ───────────────────────────────────────────────
async function tableExists(name) {
  const r = await api(`/rest/v1/${name}?select=id&limit=1`, "GET");
  // 404 con código PGRST205 = la tabla no está en el schema cache
  return r.ok;
}

async function columnExists() {
  const r = await api("/rest/v1/bisnes?select=pinned_banner&limit=1", "GET");
  return r.ok;
}

async function rpcExists() {
  const r = await api("/rest/v1/rpc/get_bisne_followers", "POST", { p_bisne_id: "00000000-0000-0000-0000-000000000000" });
  // 404 PGRST202 = función inexistente; ok/otro error (p.ej. parse uuid) = existe
  return !(r.status === 404);
}

async function main() {
  console.log("🔍 Comprobando estado de la migración 008…\n");

  const [promos, ads, banner, rpc] = await Promise.all([
    tableExists("site_promos"),
    tableExists("ad_slots"),
    columnExists(),
    rpcExists(),
  ]);

  console.log(`   site_promos.............. ${promos ? "✅ existe" : "❌ falta"}`);
  console.log(`   ad_slots................. ${ads ? "✅ existe" : "❌ falta"}`);
  console.log(`   bisnes.pinned_banner..... ${banner ? "✅ existe" : "❌ falta"}`);
  console.log(`   get_bisne_followers...... ${rpc ? "✅ existe" : "❌ falta"}\n`);

  if (!promos || !ads || !banner || !rpc) {
    console.log("═".repeat(66));
    console.log("  PASO 1 · Ejecuta el SQL en el SQL Editor de Supabase");
    console.log("═".repeat(66));
    // URL del proyecto: https://xyz.supabase.co → ref = xyz
    const projectRef = URL.replace(/^https:\/\//, "").split(".")[0];
    console.log(`\n  1. Abre:  https://supabase.com/dashboard/project/${projectRef}/sql/new`);
    console.log("  2. Pega el SQL de la migración (abajo / en tu portapapeles)");
    console.log("  3. Pulsa RUN y espera 'Success. No rows returned'");
    console.log("  4. Vuelve a ejecutar:  node scripts/migrate-008.mjs\n");

    // Copiar al portapapeles según plataforma
    try {
      const { execSync } = await import("child_process");
      if (process.platform === "win32") {
        execSync("clip", { input: MIGRATION_SQL, stdio: ["pipe", "ignore", "ignore"] });
        console.log("  📋 El SQL ya está COPIADO en tu portapapeles (clip.exe). Usa Ctrl+V.\n");
      } else if (process.platform === "darwin") {
        execSync("pbcopy", { input: MIGRATION_SQL });
        console.log("  📋 El SQL ya está COPIADO en tu portapapeles (pbcopy). Usa ⌘V.\n");
      } else {
        execSync("wl-copy || xclip -selection clipboard", { input: MIGRATION_SQL, shell: "/bin/bash" });
        console.log("  📋 El SQL fue copiado a tu portapapeles (si tienes wl-copy/xclip).\n");
      }
    } catch {
      console.log("  (No se pudo copiar automáticamente; copia el archivo manualmente.)\n");
    }

    console.log("─".repeat(66));
    console.log(MIGRATION_SQL);
    console.log("─".repeat(66));
    process.exit(2); // código 2 = requiere paso manual
  }

  console.log("✅ Esquema completo. Sembrando promos y anuncio demo…\n");

  // ── Promos demo (slider global de la Home) ──────────────────────────
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

  // Idempotente: solo inserta si no hay promos con ese título
  const existing = await api("/rest/v1/site_promos?select=id,title&limit=50", "GET");
  const existingTitles = new Set((existing.json || []).map((p) => p.title));
  for (const promo of demoPromos) {
    if (existingTitles.has(promo.title)) {
      console.log(`   ↷ promo "${promo.title}" ya existe, se omite`);
      continue;
    }
    const r = await api("/rest/v1/site_promos", "POST", promo);
    if (!r.ok) {
      console.error(`   ❌ promo "${promo.title}":`, r.status, r.text?.slice(0, 200));
      process.exitCode = 1;
    } else {
      console.log(`   ✅ promo "${promo.title}" creada`);
    }
  }

  // ── Anuncio demo en el slot home-top ─────────────────────────────────
  // Nota: un anuncio con image_url de promo local sirve para probar el slot.
  const adCheck = await api("/rest/v1/ad_slots?select=id,slot&slot=eq.home-top&limit=1", "GET");
  if ((adCheck.json || []).length === 0) {
    const ad = {
      slot: "home-top",
      image_url: "/api/images/promos/square-promo-1.webp",
      link_url: "https://example.com",
      title: "Anuncio demo",
      active: true,
    };
    const r = await api("/rest/v1/ad_slots", "POST", ad);
    if (!r.ok) {
      console.error("   ❌ anuncio demo:", r.status, r.text?.slice(0, 200));
      process.exitCode = 1;
    } else {
      console.log('   ✅ anuncio demo en "home-top" creado');
    }
  } else {
    console.log('   ↷ anuncio "home-top" ya existe, se omite');
  }

  // ── Verificación final (como las verá el anon del sitio) ─────────────
  console.log("\n🔎 Verificación final con rol anon (lo que ve el sitio):");
  const anon = await fetch(`${URL}/rest/v1/site_promos?select=title,position&active=eq.true&order=position.asc`, {
    headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
  }).then((r) => r.json());
  console.log(`   site_promos visibles (anon): ${(anon || []).length}`);
  (anon || []).forEach((p) => console.log(`      · [${p.position}] ${p.title}`));

  const anonAds = await fetch(`${URL}/rest/v1/ad_slots?select=slot&active=eq.true`, {
    headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
  }).then((r) => r.json());
  console.log(`   ad_slots visibles (anon): ${(anonAds || []).map((a) => a.slot).join(", ") || "ninguno"}`);

  console.log("\n🎉 Listo. Prueba en la app:");
  console.log("   1. npm run dev  →  http://localhost:3000");
  console.log("   2. La Home muestra el slider de promos (bloque 1) y el anuncio (bloque 4)");
  console.log("   3. Pulsa una promo → abre el popup de publicidad con 'Visitar enlace'");
  console.log("   4. /admin → gestiona las promos y los slots publicitarios\n");
}

main();
