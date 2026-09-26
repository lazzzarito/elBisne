// Caché de favoritos.
//
// Por qué hace falta: `elbisne_favorites` solo guarda los ids, pero para pintar
// la lista hacen falta nombre, precio e imagen, que únicamente existen en la
// BD. Por eso cada apertura de la pestaña iba a Supabase. El carrito no sufre
// ese retardo porque `elbisne_cart` guarda el producto entero ya desnormalizado.
//
// Aquí se guardan las filas resueltas con su fecha, para:
//  · pintar de inmediato, también en el primer render tras recargar la página
//  · pedir a la BD solo los ids que falten o estén viejos
//  · revalidar por detrás sin volver a enseñar el esqueleto
//
// Es una lista de deseos: 5 minutos de desfase en precio o stock no molesta,
// pero evita una ida a la red en cada apertura.

const KEY = "elbisne_favorites_cache_v1";
const MAX_AGE_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 400;

// Espejo en memoria del localStorage: evita parsearlo en cada apertura.
let memory = null;

function readStorage() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function getMemory() {
  if (!memory) memory = readStorage();
  return memory;
}

// La UI trabaja siempre con el id público (slug o uuid), que es lo que guarda
// favoriteIds.
function publicIdOf(row) {
  return row?.slug || row?.id || null;
}

function isStale(entry) {
  if (!entry) return true;
  // Un "tombstone" (row === null) es un producto que ya no está en la BD: se
  // trata igual de fresco para no repreguntarlo en cada apertura.
  if (Date.now() - entry.at > MAX_AGE_MS) return true;
  return false;
}

/**
 * Devuelve lo que ya está cacheado y qué ids hay que volver a pedir.
 * `rows` incluye los que están viejos (para pintar al instante) y `refresh`
 * solo los que realmente necesitan red.
 */
export function getCachedFavorites(ids) {
  const store = getMemory();
  const rows = [];
  const refresh = [];

  for (const id of ids) {
    const entry = store[id];
    if (!entry) {
      refresh.push(id);
      continue;
    }
    if (entry.row) rows.push(entry.row);
    if (isStale(entry)) refresh.push(id);
  }

  return { rows, refresh };
}

/**
 * Guarda las filas recibidas y marca como "no encontrado" los ids que se
 * pidieron y no volvieron, para no repetir la consulta idéntica más rato.
 *
 * Cada fila se indexa por su uuid y por su slug a propósito: favoriteIds puede
 * guardar cualquiera de los dos, y si se indexara solo por el slug, un
 * favorito guardado por uuid acabaría con un tombstone y desaparecería de la
 * lista sin llegar a mostrarse nunca.
 */
export function setCachedFavorites(rows, requestedIds) {
  const store = getMemory();
  const now = Date.now();
  const requested = requestedIds || [];
  const matched = new Set();

  for (const row of rows || []) {
    const pub = publicIdOf(row);
    for (const key of [pub, row?.id]) {
      if (key) store[key] = { row, at: now };
    }
    for (const req of requested) {
      if (req && (req === pub || req === row?.id)) matched.add(req);
    }
  }

  for (const req of requested) {
    if (!matched.has(req)) store[req] = { row: null, at: now };
  }

  // Poda por antigüedad para no crecer sin límite.
  const keys = Object.keys(store);
  if (keys.length > MAX_ENTRIES) {
    keys
      .sort((a, b) => (store[a].at || 0) - (store[b].at || 0))
      .slice(0, keys.length - MAX_ENTRIES)
      .forEach((k) => delete store[k]);
  }

  persist(store);
  return store;
}

function persist(store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Cuota llena o modo privado: la caché en memoria sigue sirviendo.
  }
}

export function clearFavoritesCache() {
  memory = {};
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* sin caché persistente, sin problema */
  }
}
