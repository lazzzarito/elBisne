import Link from "next/link";

export const metadata = { title: "Página no encontrada (404) | elBisne" };

export default function NotFound() {
  return (
    <main
      id="main-content"
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 20px",
        background: "var(--bg-primary)",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 520 }}>
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            lineHeight: 1,
            fontFamily: "var(--font-inter), sans-serif",
            background: "linear-gradient(135deg, var(--accent-green), var(--accent-hover))",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          404
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: "8px 0 8px", color: "var(--text-primary)" }}>
          Ups, esta página no existe
        </h1>
        <p style={{ fontSize: 15, color: "var(--text-secondary)", margin: "0 0 28px", lineHeight: 1.6 }}>
          El enlace puede estar mal escrito o el bisne que buscas ya no está disponible.
          Vuelve al inicio para seguir explorando el catálogo.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 24px",
            borderRadius: 24,
            background: "var(--accent-green)",
            color: "#fff",
            fontWeight: 600,
            textDecoration: "none",
            boxShadow: "0 4px 14px rgba(0, 168, 132, 0.35)",
            transition: "background .2s ease, transform .2s ease",
          }}
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}