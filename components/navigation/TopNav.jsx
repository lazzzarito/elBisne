"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Icon from "@/components/Icon";
import NotificationsBadge from "@/components/notifications/NotificationsBadge";
import GlobalFavoritesModal from "@/components/GlobalFavoritesModal";

const DESKTOP_TABS = [
  { href: "/", label: "Inicio", icon: "home" },
  { href: "/explorar", label: "Explorar", icon: "explore" },
  { href: "/perfil", label: "Perfil", icon: "user" },
];

const HIDE_PREFIXES = ["/auth", "/tienda", "/b/", "/product/", "/pedido/", "/panel", "/admin", "/mensajes"];

export default function TopNav() {
  const pathname = usePathname();
  const [showFavorites, setShowFavorites] = useState(false);

  if (HIDE_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

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

        <nav className="top-nav-tabs" aria-label="Navegación principal">
          {DESKTOP_TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`top-nav-item${isActive(tab.href) ? " active" : ""}`}
              aria-current={isActive(tab.href) ? "page" : undefined}
            >
              <Icon name={tab.icon} size={18} />
              <span>{tab.label}</span>
            </Link>
          ))}

          {/* Carrito como destination (desktop): abre el bottom-sheet global */}
          <button
            type="button"
            className="top-nav-item"
            onClick={() => window.dispatchEvent(new CustomEvent("open-cart"))}
          >
            <Icon name="cart" size={18} />
            <span>Carrito</span>
          </button>
        </nav>

        <div className="top-nav-actions">
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
        </div>
      </div>

      {showFavorites && <GlobalFavoritesModal onClose={() => setShowFavorites(false)} />}
    </header>
  );
}
