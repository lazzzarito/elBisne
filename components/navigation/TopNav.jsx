"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";

const TABS = [
  { href: "/", label: "Inicio", icon: "home" },
  { href: "/explorar", label: "Explorar", icon: "explore" },
  { href: "/perfil", label: "Perfil", icon: "user" },
];

const HIDE_PREFIXES = ["/auth", "/tienda", "/b/", "/product/"];

export default function TopNav() {
  const pathname = usePathname();

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
          {TABS.map((tab) => (
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
        </nav>
      </div>
    </header>
  );
}