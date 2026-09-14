"use client";
import Link from "next/link";
import { useApp } from "@/context/AppContext";

export default function Perfil() {
  const { isLoggedIn, user, authLoading, signOut } = useApp();

  if (authLoading) {
    return (
      <main className="placeholder-page" id="main-content">
        <h1>Mi Perfil</h1>
        <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>Cargando sesión…</p>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="placeholder-page" id="main-content">
        <h1>Mi Perfil</h1>
        <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>
          Inicia sesión para gestionar tu perfil, tus guardados y activar tu tienda.
        </p>
        <p style={{ marginTop: "2rem" }}>
          <Link
            href="/auth"
            className="home-hero-cta"
            style={{ marginTop: "1.5rem" }}
          >
            Iniciar sesión / Registrarse
          </Link>
        </p>
      </main>
    );
  }

  const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuario";

  return (
    <main className="placeholder-page" id="main-content">
      <h1>Mi Perfil</h1>
      <p style={{ marginTop: "1.25rem", fontSize: "1.05rem", fontWeight: 700 }}>
        {name}
      </p>
      <p style={{ marginTop: "0.25rem", color: "var(--text-secondary)" }}>{user.email}</p>
      <p style={{ marginTop: "1.5rem", color: "var(--text-secondary)" }}>
        Favoritos y paneles de vendedor. <em>Próximamente.</em>
      </p>
      <p style={{ marginTop: "2rem" }}>
        <button
          onClick={() => signOut()}
          className="btn-share-page"
          style={{ border: "1.5px solid var(--border-color)" }}
        >
          Cerrar sesión
        </button>
      </p>
    </main>
  );
}