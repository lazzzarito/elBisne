"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import Icon from "@/components/Icon";
import SafeImage from "@/components/SafeImage";

const TABS = [
  { href: "/panel", label: "Resumen", icon: "explore" },
  { href: "/panel/pedidos", label: "Pedidos", icon: "cart" },
  { href: "/panel/productos", label: "Productos", icon: "shopping-bag" },
  { href: "/panel/apariencia", label: "Apariencia", icon: "sparkles" },
  { href: "/panel/verificacion", label: "Verificación", icon: "shield" },
];

export function useMyBisne({ redirectToPerfil = true } = {}) {
  const { user } = useApp();
  const [bisne, setBisne] = useState(undefined); // undefined = cargando
  const router = useRouter();

  useEffect(() => {
    // Suscripción al "sistema externo" (Supabase): setState solo en callbacks
    if (!user || !isSupabaseConfigured()) return;
    let active = true;
    const supabase = createClient();
    supabase
      .from("bisnes")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setBisne(data || null);
      });
    return () => {
      active = false;
    };
  }, [user]);

  // Redirigir a activar tienda si el usuario no tiene bisne
  useEffect(() => {
    if (redirectToPerfil && bisne === null && user) {
      router.replace("/perfil");
    }
  }, [redirectToPerfil, bisne, user, router]);

  return bisne; // undefined cargando · null sin tienda · objeto con tienda
}

export default function PanelLayout({ title, subtitle, actions = null, children }) {
  const bisne = useMyBisne();
  const pathname = usePathname();


  if (bisne === undefined) {
    return (
      <main className="panel-page" id="main-content">
        <div className="panel-skeleton" aria-busy="true">
          <div className="perfil-skeleton-line" style={{ width: "30%" }} />
          <div className="perfil-skeleton-line" style={{ width: "60%" }} />
        </div>
      </main>
    );
  }

  if (bisne === null) return null;

  return (
    <main className="panel-page" id="main-content">
      <header className="panel-header">
        <div className="panel-store-row">
          <div className="panel-store-logo">
            {bisne.logo_url ? (
              <SafeImage src={bisne.logo_url} alt={bisne.business_name} width={44} height={44} className="panel-store-logo-img" />
            ) : (
              <span className="profile-store-initial">{(bisne.business_name || "B").charAt(0)}</span>
            )}
          </div>
          <div className="panel-store-info">
            <h1 className="panel-title">{title || bisne.business_name}</h1>
            {subtitle ? <p className="panel-subtitle">{subtitle}</p> : (
              <p className="panel-subtitle">/b/{bisne.handle}</p>
            )}
          </div>
          {actions}
        </div>
        <nav className="panel-tabs" aria-label="Secciones del panel">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`panel-tab${(tab.href === "/panel" ? pathname === "/panel" : pathname.startsWith(tab.href)) ? " active" : ""}`}
            >
              <Icon name={tab.icon} size={14} />
              {tab.label}
            </Link>
          ))}
        </nav>
      </header>

      {bisne.suspended && (
        <div className="panel-notice warning">
          <Icon name="warning" size={14} />
          Tu tienda está suspendida temporalmente. Contacta al equipo de elBisne.
        </div>
      )}

      {children}
    </main>
  );
}
