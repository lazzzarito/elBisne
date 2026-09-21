"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import SafeImage from "@/components/SafeImage";
import Icon from "@/components/Icon";
import NotificationsBadge from "@/components/notifications/NotificationsBadge";
import GlobalFavoritesModal from "@/components/GlobalFavoritesModal";

// Menú superior minimalista: logo + acciones (buscador, favoritos, perfil).
// Sin navegación por pestañas: el botón flotante del carrito y los drawers
// globales cubren el resto (UI_UX.md §1).
const HIDE_PREFIXES = ["/auth", "/tienda", "/b/", "/product/", "/pedido/", "/panel", "/admin", "/mensajes"];

function initialsOf(name) {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

export default function TopNav({ storeConfig }) {
  const pathname = usePathname();
  const { isLoggedIn, user } = useApp();
  const [showFavorites, setShowFavorites] = useState(false);
  const userId = user?.id || null;
  // Logo/foto del bisne del usuario autenticado. `uid` acompaña al dato para
  // no mostrar el logo del usuario anterior mientras carga el nuevo.
  const [myBisne, setMyBisne] = useState({ uid: null, logo: null, name: null });
  if (myBisne.uid !== userId) {
    setMyBisne({ uid: userId, logo: null, name: null });
  }

  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) return;
    let active = true;
    createClient()
      .from("bisnes")
      .select("business_name, logo_url")
      .eq("owner_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setMyBisne({ uid: userId, logo: data?.logo_url || null, name: data?.business_name || null });
      });
    return () => { active = false; };
  }, [userId]);

  if (HIDE_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuario";
  const myBisneLogo = myBisne.uid === userId ? myBisne.logo : null;
  const myBisneName = myBisne.uid === userId ? myBisne.name : null;

  return (
    <header className="top-nav" role="banner">
      <div className="top-nav-inner">
        <Link href="/" className="top-nav-brand" aria-label="elBisne — Inicio">
          <span className="top-nav-brand-logo">
            <Image
              src="/images/logo.webp"
              alt=""
              width={28}
              height={28}
              className="top-nav-brand-img"
            />
          </span>
          <span className="top-nav-brand-name">elBisne</span>
        </Link>

        <div className="top-nav-actions">
          {/* Buscador: abre el drawer global (mismo diseño que el carrito) */}
          <button
            type="button"
            className="top-nav-fav-btn"
            onClick={() => window.dispatchEvent(new CustomEvent("open-search"))}
            aria-label="Buscar"
            title="Buscar"
          >
            <Icon name="search" size={18} />
          </button>

          {/* Corazón global = productos favoritos (UI_UX.md §1) */}
          <button
            type="button"
            className="top-nav-fav-btn"
            onClick={() => setShowFavorites(true)}
            aria-label="Tus productos favoritos"
            title="Favoritos"
          >
            <Icon name="heart-outline" size={18} />
          </button>

          <NotificationsBadge />

          {/* Perfil: con sesión → avatar (logo del bisne si tiene tienda);
              sin sesión → abre el popup de registro/inicio de sesión */}
          {isLoggedIn ? (
            <Link
              href="/perfil"
              className="top-nav-avatar-btn"
              aria-label="Tu perfil"
              title="Tu perfil"
            >
              {myBisneLogo ? (
                <SafeImage
                  src={myBisneLogo}
                  alt={myBisneName || name}
                  width={30}
                  height={30}
                  className="top-nav-avatar-img"
                />
              ) : (
                <span className="top-nav-avatar-initials" aria-hidden="true">
                  {initialsOf(name)}
                </span>
              )}
            </Link>
          ) : (
            <button
              type="button"
              className="top-nav-avatar-btn"
              onClick={() => window.dispatchEvent(new CustomEvent("open-profile-auth"))}
              aria-label="Iniciar sesión o crear cuenta"
              title="Iniciar sesión o crear cuenta"
            >
              <Icon name="user" size={17} />
            </button>
          )}
        </div>
      </div>

      {showFavorites && <GlobalFavoritesModal storeConfig={storeConfig} onClose={() => setShowFavorites(false)} />}
    </header>
  );
}
