// ── Separador entre secciones ────────────────────────────────────────────
// Sustituye a la vieja línea horizontal que acompañaba los títulos. Va
// centrado y acotado (no cruza la página), con un punto de marca en verde de
// marca. Todos los separadores son iguales: ninguno lleva texto, la sección
// siguiente ya tiene su propio título.
export default function SectionDivider() {
  return (
    <div className="section-divider" role="separator" aria-hidden="true">
      <span className="section-divider-line" />
      <span className="section-divider-dot" />
      <span className="section-divider-line" />
    </div>
  );
}
