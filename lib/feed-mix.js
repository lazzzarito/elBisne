// Helpers puros para armar el feed de la home
// El catálogo entero ya viaja al cliente (ver app/page.js), así que el feed
// se construye en memoria: no hay paginación de red, sólo orden + mezcla.
//
// Regla del producto: el feed NO repite. Cada producto y cada bisne aparece
// una sola vez, así que la mezcla termina y ofrecer un final explícito es
// correcto: el final es real, no un ciclo del catálogo.

export const PRODUCTS_PER_BUSINESS = 15;

// Orden por tendencia (cold start,: ventas reales (peso fuerte)
// + ofertas como desempate. La usa "Productos en Tendencia".
export function rankByTrend(products, salesMap) {
  const sales = salesMap || {};
  return [...(products || [])]
    .map((p) => {
      const sold = Number(sales[p.id]) || 0;
      const offerBoost = p.offer && p.originalPrice && p.originalPrice > p.priceUSD ? 3 : 0;
      return { p, sold, offerBoost };
    })
    .sort((a, b) => b.sold - a.sold || b.offerBoost - a.offerBoost)
    .map(({ p }) => p);
}

// PRNG determinista (mulberry32): misma semilla → mismo orden, así el render
// de servidor y el del cliente coinciden sin depender de Math.random().
function makeRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, seed) {
  const out = [...list];
  const rnd = makeRandom(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function toTime(value) {
  if (!value) return 0;
  const t = Date.parse(value);
  return Number.isNaN(t) ? 0 : t;
}

// Tope del jitter: aunque dos productos estén a un año de distancia, el azar
// no puede traer el viejo al primer pantallazo. Sin este tope, un catálogo
// denso (todo creado en la misma tanda) tendría un span tan chiquito que el
// jitter reordenaría también fechas que sí significaban algo.
const MAX_JITTER_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Orden "aleatorio pero basado en fecha": lo más reciente primero, con jitter.
 *
 * El jitter no es decorativo — es lo que hace que el feed no se sienta como
 * un listado por `created_at`. En un catálogo sembrado de golpe todas las
 * `created_at` son idénticas, así que ordenar por fecha puro produce bloques
 * monótonos (mismo criterio, mismo resultado) y el usuario percibe que "no
 * hay azar". Con el jitter, dos productos de la misma tanda se ordenan al
 * azar entre sí, pero la tanda más nueva sigue saliendo antes que la vieja.
 *
 * Amplitud: la mitad del span del catálogo, con tope de MAX_JITTER_MS. Con
 * span 0 (todas las fechas iguales) el jitter sigue activo — es
 * precisamente el caso donde hace todo el trabajo.
 */
export function rankByRecency(products, seed = 0) {
  const list = products || [];
  if (list.length < 2) return [...list];

  const times = list.map((p) => toTime(p.createdAt));
  const known = times.filter((t) => t > 0);
  if (!known.length) return shuffle(list, seed);

  const min = Math.min(...known);
  const max = Math.max(...known);
  const window = max - min;
  // span 0 => todas las fechas son iguales => no hay recencia que respetar,
  // así que el jitter va a tope. Es justamente el caso real (catálogo sembrado
  // de golpe) donde el azar es lo único que el usuario perceive, así que
  // dejarlo en 0 sería dejar el feed en orden de entrada.
  const jitter = window > 0 ? Math.min(window * 0.5, MAX_JITTER_MS) : MAX_JITTER_MS;
  const rnd = makeRandom(seed);

  return list
    .map((p, i) => {
      const base = times[i];
      // Sin fecha conocida cae al fondo: no saber cuándo apareció es peor
      // señal que saber que es lo último.
      if (base <= 0) return { p, score: -Infinity };
      return { p, score: base + (rnd() - 0.5) * jitter };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ p }) => p);
}

/**
 * Feed mezclando productos y bisnes, cada uno apareciendo UNA sola vez.
 *
 * Tres fases, en este orden:
 *   1. Bloques completos de `perBlock` productos + 1 bisne. Es la proporción
 *      15:1 que mantiene el ritmo del scroll (el bisne se lee como
 *      descubrimiento, no como publicidad).
 *   2. Los productos sobrantes, que no completan un bloque, y los bisnes que no
 *      tuvieron lugar en un bloque.
 *   3. No queda nada: el feed termina.
 *
 * `count` es un tope, no un objetivo: se devuelve min(count, todo el
 * catálogo), que es justo el contrato que necesita el "fin del feed".
 */
export function buildMixedFeed({
  products,
  bisnes,
  count,
  productsPerBusiness = PRODUCTS_PER_BUSINESS,
  seed = 0,
}) {
  const pool = products || [];
  const businesses = bisnes || [];
  const items = [];
  if (count <= 0) return items;

  // Catálogo sin productos: mostramos los bisnes en vez de dejar la sección
  // vacía.
  if (!pool.length) {
    for (let k = 0; k < Math.min(count, businesses.length); k++) {
      items.push({ kind: "bisne", item: businesses[k] });
    }
    return items;
  }

  const perBlock = Math.max(1, productsPerBusiness);

  // 1 · Bloques completos de productos + 1 bisne.
  const productOrder = rankByRecency(pool, seed);
  const businessOrder = shuffle(businesses, seed ^ 0x5bf03635);
  const businessSlot = perBlock + 1; // 15 productos + 1 bisne

  let pCursor = 0;
  let bCursor = 0;
  while (items.length < count) {
    const blockStart = items.length;
    for (let i = 0; i < perBlock && items.length < count; i++) {
      const p = productOrder[pCursor];
      if (p === undefined) break;
      items.push({ kind: "product", item: p });
      pCursor += 1;
    }
    if (items.length < count && businessOrder[bCursor] !== undefined) {
      items.push({ kind: "bisne", item: businessOrder[bCursor] });
      bCursor += 1;
    }
    // Se acabaron los productos o los bisnes: el paso 2 recoge lo que falte.
    if (items.length === blockStart) break;
  }

  // 2 · Remanentes. Los bisnes que no cupieron en un bloque van al final,
  // para no alargar bloques de productos que ya estaban completos.
  if (items.length < count) {
    for (let b = bCursor; b < businessOrder.length && items.length < count; b++) {
      items.push({ kind: "bisne", item: businessOrder[b] });
    }
    for (let p = pCursor; p < productOrder.length && items.length < count; p++) {
      items.push({ kind: "product", item: productOrder[p] });
    }
  }

  return items;
}

/** Tamaño real del feed: nunca supera productos + bisnes. */
export function countMixedFeed({ products, bisnes }) {
  return (products?.length || 0) + (bisnes?.length || 0);
}
