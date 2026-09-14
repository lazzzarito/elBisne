"use client";

export default function ErrorBoundary({ error, reset }) {
  return (
    <div style={{ padding: "4rem 2rem", textAlign: "center", maxWidth: 500, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Algo salió mal</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>{error?.message || "Ocurrió un error inesperado."}</p>
      <button onClick={reset} style={{ padding: "0.75rem 2rem", borderRadius: 30, border: "none", background: "#008f6b", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
        Reintentar
      </button>
    </div>
  );
}