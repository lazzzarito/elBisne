"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";
import { useApp } from "@/context/AppContext";

const TABS = [
  { href: "/", label: "Inicio", icon: "home" },
  { href: "/explorar", label: "Explorar", icon: "explore" },
  { href: "/perfil", label: "Perfil", icon: "user" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { cartItems } = useApp();

  if (pathname.startsWith("/auth")) return null;

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`bottom-nav-item${isActive(tab.href) ? " active" : ""}`}
          aria-current={isActive(tab.href) ? "page" : undefined}
        >
          <span className="bottom-nav-icon">
            {tab.href === "/" && cartCount > 0 && (
              <span className="bottom-nav-badge">{cartCount}</span>
            )}
            <Icon name={tab.icon} size={22} />
          </span>
          <span className="bottom-nav-label">{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}