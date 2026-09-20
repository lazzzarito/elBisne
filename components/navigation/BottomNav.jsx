"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import Icon from "@/components/Icon";

// 4 destinations del rediseño social (UI_UX.md §1).
// El carrito NO navega: abre el bottom-sheet global vía evento "open-cart".
const TABS = [
  { href: "/", label: "Inicio", icon: "home" },
  { href: "/explorar", label: "Explorar", icon: "explore" },
  { type: "cart", label: "Carrito", icon: "cart" },
  { href: "/perfil", label: "Perfil", icon: "user" },
];

// El carrito se cuenta con opciones: cada variante es un item distinto.
function countCartItems(cartItems) {
  return (cartItems || []).reduce((acc, item) => acc + (item.quantity || 1), 0);
}

export default function BottomNav() {
  const pathname = usePathname();
  const { cartItems, isClient } = useApp();
  const navRef = useRef(null);
  const prevCount = useRef(null);
  const skipUntil = useRef(0);
  const cartCount = countCartItems(cartItems);

  // Rebote sutil de la píldora al añadir al carrito. WAAPI en vez de clase
  // CSS: se reinicia limpio en cada añadido (aunque sean seguidos). Los
  // keyframes incluyen el translateX(-50%) del centrado para que la píldora
  // no se desplace durante la animación.
  useEffect(() => {
    const prev = prevCount.current;
    prevCount.current = cartCount;
    if (prev === null) {
      // Ventana de hidratación: el salto 0 → N al restaurar localStorage no rebota
      skipUntil.current = Date.now() + 800;
      return;
    }
    if (cartCount <= prev || Date.now() < skipUntil.current) return;
    navRef.current?.animate?.(
      [
        { transform: "translateX(-50%) scale(1)" },
        { transform: "translateX(-50%) scale(1.08)", offset: 0.35 },
        { transform: "translateX(-50%) scale(0.96)", offset: 0.7 },
        { transform: "translateX(-50%) scale(1)" },
      ],
      { duration: 450, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }
    );
  }, [cartCount]);

  // Oculto en páginas inmersivas (auth, tienda, producto, pedido, panel, admin, mensajes)
  const HIDDEN_PREFIXES = ["/auth", "/tienda", "/b/", "/product/", "/pedido/", "/panel", "/admin", "/mensajes", "/notificaciones"];
  if (!isClient) return null;
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav ref={navRef} className="bottom-nav" aria-label="Navegación principal">
      <div className="bottom-nav-inner">
        {TABS.map((tab) =>
          tab.type === "cart" ? (
            <button
              key={tab.label}
              type="button"
              className="bottom-nav-item"
              onClick={() => window.dispatchEvent(new CustomEvent("open-cart"))}
              aria-label={`Carrito, ${cartCount} ${cartCount === 1 ? "artículo" : "artículos"}`}
            >
              <span className="bottom-nav-icon">
                <Icon name={tab.icon} size={22} />
                {cartCount > 0 && (
                  <span key={cartCount} className="bottom-nav-badge" aria-hidden="true">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </span>
              <span className="bottom-nav-label">{tab.label}</span>
            </button>
          ) : (
            <Link
              key={tab.href}
              href={tab.href}
              className={`bottom-nav-item${isActive(tab.href) ? " active" : ""}`}
              aria-label={tab.label}
              aria-current={isActive(tab.href) ? "page" : undefined}
            >
              <span className="bottom-nav-icon">
                <Icon name={tab.icon} size={22} />
              </span>
              <span className="bottom-nav-label">{tab.label}</span>
            </Link>
          )
        )}
      </div>
    </nav>
  );
}
