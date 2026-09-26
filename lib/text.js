// ── Helpers de redacción para textos con cifras (subtítulos, estados) ────

/** "1 tienda" / "3 tiendas" — la concordancia no se puede hardcodear en el copy. */
export function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
