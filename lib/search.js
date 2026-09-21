// ── Motor de búsqueda del marketplace (cliente) ─────────────────────────
// Búsqueda tolerante: ignora tildes/mayúsculas, entiende plurales españoles
// ("móviles" ↔ "móvil"), tolera errores de tipeo (Levenshtein) y ordena por
// relevancia (coincidencias en el nombre pesan más que en la descripción).

// Normaliza: minúsculas + sin diacríticos ("móvil" → "movil", "año" → "ano").
// Ambos lados (consulta y catálogo) pasan por aquí, así que la comparación
// siempre es equivalente.
export function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text) {
  return normalizeText(text).split(" ").filter(Boolean);
}

// Stem ligero para plurales españoles (suficiente para un catálogo):
//   moviles → movil · celulares → celular · zapatos → zapato · lapices → lapiz
export function stemEs(word) {
  if (word.length > 4 && word.endsWith("ces")) return `${word.slice(0, -3)}z`;
  if (word.length > 4 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s")) return word.slice(0, -1);
  return word;
}

// Distancia de edición acotada: devuelve max+1 en cuanto supera el límite
// (corte temprano para no recorrer la matriz completa en vano).
export function levenshtein(a, b, max = 2) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const d = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      cur.push(d);
      if (d < rowMin) rowMin = d;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

// Entrada de búsqueda por item: texto normalizado + set de palabras
// (para el matching difuso palabra a palabra).
function buildEntry(text) {
  const norm = normalizeText(text);
  return { norm, words: new Set(norm.split(" ").filter(Boolean)) };
}

// Tolerancia de tipeo según el largo del término buscado.
function maxDistFor(token) {
  if (token.length <= 4) return 1;
  if (token.length <= 8) return 2;
  return 3;
}

// Score de UN token contra UN campo:
//   3 → el token aparece como substring ("sams" encuentra "samsung")
//   2 → aparece su raíz sin plural ("moviles" encuentra "móvil")
//   1 → coincidencia difusa con alguna palabra (tipeo: "mobil" ≈ "movil")
//   0 → no coincide
function matchToken(token, entry) {
  const stem = stemEs(token);
  if (entry.norm.includes(token)) return 3;
  if (stem !== token && entry.norm.includes(stem)) return 2;

  const maxDist = maxDistFor(token);
  for (const word of entry.words) {
    if (Math.abs(word.length - token.length) > maxDist) continue;
    if (levenshtein(token, word, maxDist) <= maxDist) return 1;
    const wordStem = stemEs(word);
    if (wordStem !== word && levenshtein(stem, wordStem, maxDist) <= maxDist) return 1;
  }
  return 0;
}

// ── API principal ────────────────────────────────────────────────────────
// searchItems(items, query, getFields) → [{ item, score }] ordenado por
// relevancia, o null si la consulta está vacía (no filtrar).
//
// getFields(item) devuelve los textos donde se busca, del más al menos
// importante: p.ej. [name, category, description, promo]. Un token puede
// coincidir en cualquier campo; los pesos duplican el campo principal.
//
// Semántica AND: todos los tokens deben coincidir en algún campo.
export function searchItems(items, query, getFields) {
  const tokens = tokenize(query);
  if (tokens.length === 0) return null;

  const entryCache = new Map(); // texto → entry (evita normalizar repetido)
  const getEntry = (text) => {
    let entry = entryCache.get(text);
    if (!entry) {
      entry = buildEntry(text);
      entryCache.set(text, entry);
    }
    return entry;
  };

  const results = [];
  for (const item of items) {
    const entries = (getFields(item) || []).map((text) => getEntry(text));
    if (entries.length === 0) continue;

    let score = 0;
    let matches = true;
    for (const token of tokens) {
      let best = 0;
      entries.forEach((entry, fieldIdx) => {
        const s = matchToken(token, entry);
        if (s > 0) best = Math.max(best, s * (fieldIdx === 0 ? 2 : 1));
      });
      if (best === 0) {
        matches = false;
        break;
      }
      score += best;
    }
    if (matches) results.push({ item, score });
  }

  return results.sort((a, b) => b.score - a.score);
}
