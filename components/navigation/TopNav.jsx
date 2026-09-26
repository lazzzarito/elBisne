"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import SafeImage from "@/components/SafeImage";
import Icon from "@/components/Icon";
import SearchField from "@/components/SearchField";
import NotificationsBadge from "@/components/notifications/NotificationsBadge";
import { HOME_SEARCH_OPEN, HOME_SEARCH_QUERY, HOME_SEARCH_CLOSE } from "@/lib/search-events";

// Menú superior minimalista: logo + buscador + perfil. Sin navegación por
// pestañas: el botón flotante del carrito y los drawers globales cubren el
// resto .
const HIDE_PREFIXES = ["/auth", "/tienda", "/product/", "/pedido/", "/panel", "/admin"];

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
  const { isLoggedIn, user, storeChrome } = useApp();
  const [scrolled, setScrolled] = useState(false);
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

  // Estado "scrolled": refuerza el sombreado/desenfoque del header al bajar.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // El buscador global depende de la ruta:
  //  · En la home la página se transforma en el buscador (sin modal).
  //  · En el resto de rutas se mantiene el drawer SearchModal.
  const isHome = pathname === "/";
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef(null);

  // Espejo del campo de la home: el buscador grande de la página escribe aquí
  // y su texto se reenvía con HOME_SEARCH_QUERY, así que este campo pequeño se
  // actualiza sin duplicar estado.
  useEffect(() => {
    const onQuery = (e) => {
      const q = e?.detail?.query;
      if (typeof q === "string") setSearchQuery(q);
    };
    const onClose = () => setSearchQuery("");
    window.addEventListener(HOME_SEARCH_QUERY, onQuery);
    window.addEventListener(HOME_SEARCH_CLOSE, onClose);
    return () => {
      window.removeEventListener(HOME_SEARCH_QUERY, onQuery);
      window.removeEventListener(HOME_SEARCH_CLOSE, onClose);
    };
  }, []);

  const emit = (name, query) =>
    window.dispatchEvent(new CustomEvent(name, { detail: { query } }));

  // En la home basta con enfocar para que la página se convierta en buscador.
  const handleFocus = () => {
    if (isHome) emit(HOME_SEARCH_OPEN, searchQuery);
  };

  const handleChange = (q) => {
    setSearchQuery(q);
    if (isHome) emit(HOME_SEARCH_QUERY, q);
  };

  const handleSearchKeyDown = (e) => {
    if (isHome) {
      if (e.key === "Enter") {
        emit(HOME_SEARCH_OPEN, searchQuery);
        searchRef.current?.blur();
      } else if (e.key === "Escape") {
        emit(HOME_SEARCH_CLOSE);
        searchRef.current?.blur();
      }
      return;
    }
    // Fuera de la home: Enter abre el drawer con la consulta ya escrita.
    if (e.key === "Enter") {
      const q = searchQuery.trim();
      if (!q) return;
      emit("open-search", q);
      searchRef.current?.blur();
    }
  };

  if (HIDE_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  // Perfil de bisne: el chrome lo aporta la cabecera de la tienda.
  if (storeChrome?.active) return null;

  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuario";
  const myBisneLogo = myBisne.uid === userId ? myBisne.logo : null;
  const myBisneName = myBisne.uid === userId ? myBisne.name : null;

  return (
    <header className={`top-nav${scrolled ? " is-scrolled" : ""}`} role="banner">
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
          {/* Buscador: en la home transforma la página y filtra en vivo; en el
              resto de rutas, Enter abre el drawer global. */}
          <SearchField
            className="top-nav-search"
            value={searchQuery}
            onChange={handleChange}
            onFocus={handleFocus}
            onKeyDown={handleSearchKeyDown}
            placeholder="Buscar productos y bisnes…"
            ariaLabel="Buscar en elBisne"
            inputRef={searchRef}
          />

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
    </header>
  );
}
