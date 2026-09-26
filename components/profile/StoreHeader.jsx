"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import SafeImage from "@/components/SafeImage";
import Icon from "@/components/Icon";
import SearchField, { storeSearchPlaceholder } from "@/components/SearchField";
import NotificationsBadge from "@/components/notifications/NotificationsBadge";

// Cabecera fusionada de la tienda (layout Whatalog + acciones elBisne)
// Fila 1: [←] logo · nombre + ✔ + stats · ❤ 🔔 👤 Contactar · Seguir
// Fila 2: buscador exclusivo del catálogo del perfil
// Fila 3: pills de categorías
export default function StoreHeader({
  store,
  isOwner = false,
  searchQuery,
  onSearchChange,
  onOpenStoreMenu,
  onEditSection,
  categories,
  activeCategory,
  onCategoryChange,
  contactHref,
}) {
  const router = useRouter();
  const { user, showToast } = useApp();
  const [followers, setFollowers] = useState(null);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const navRef = useRef(null);

  useEffect(() => {
    if (store?.isPersonal || !store?.id || !isSupabaseConfigured()) return;
    let active = true;
    createClient()
      .rpc("get_bisne_followers", { p_bisne_id: store.id })
      .then(({ data }) => {
        if (active) setFollowers(Number(data) || 0);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [store?.id, store?.isPersonal]);

  useEffect(() => {
    if (!store?.isPersonal || !user || !store?.id || !isSupabaseConfigured()) return;
    let active = true;
    createClient()
      .from("follows")
      .select("bisne_id")
      .eq("user_id", user.id)
      .eq("bisne_id", store.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setFollowing(Boolean(data));
      });
    return () => { active = false; };
  }, [user, store?.id, store?.isPersonal]);

  const toggleFollow = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      showToast("Para seguir tiendas inicia sesión", "warning");
      return;
    }
    if (!user) {
      showToast("Inicia sesión para seguir este bisne", "warning");
      return;
    }
    setFollowLoading(true);
    const supabase = createClient();
    try {
      if (following) {
        await supabase.from("follows").delete().match({ user_id: user.id, bisne_id: store?.id });
        setFollowing(false);
        setFollowers((f) => Math.max(0, (f ?? 0) - 1));
        showToast("Dejaste de seguir esta tienda");
      } else {
        await supabase.from("follows").insert({ user_id: user.id, bisne_id: store?.id });
        setFollowing(true);
        setFollowers((f) => (f ?? 0) + 1);
        showToast("¡Siguiendo esta tienda!");
      }
    } catch (e) {
      console.error("Error al cambiar seguimiento:", e);
      showToast("No se pudo actualizar el seguimiento", "warning");
    } finally {
      setFollowLoading(false);
    }
  }, [user, following, store, showToast]);

  useEffect(() => {
    if (!navRef.current) return;
    const activeTab = navRef.current.querySelector(".category-btn.active");
    if (activeTab && activeTab.parentElement) {
      const container = activeTab.closest(".category-nav-container");
      if (container) {
        container.scrollTo({
          left: Math.max(0, activeTab.offsetLeft - container.offsetWidth / 2 + activeTab.offsetWidth / 2),
          behavior: "smooth",
        });
      }
    }
  }, [activeCategory]);

  const initials = (store?.business_name || "B").charAt(0).toUpperCase();

  return (
    <header className="store-fused-header" aria-label={`${store?.business_name || ""} — tienda`}>
      <div className="store-fused-top">
        <button
          type="button"
          className="store-back-btn"
          onClick={() => router.push("/")}
          title="Ir a la página de inicio"
          aria-label="Ir a la página de inicio"
        >
          <Icon name="arrow-left" size={18} />
        </button>

        <div className="store-fused-brand">
          <span className="store-fused-logo" aria-hidden="true">
            {store?.logoUrl ? (
              <SafeImage src={store.logoUrl} alt="" width={34} height={34} className="store-fused-logo-img" />
            ) : (
              <span className="store-fused-logo-initial">{initials}</span>
            )}
          </span>
          <div className="store-fused-brand-text">
            <div className="store-fused-name">
              <h1>{store?.business_name || "Tienda"}</h1>
              {store?.verified && (
                <span className="business-verified-badge" title="Tienda verificada">
                  <Icon name="check" size={12} />
                </span>
              )}
              {store?.isPersonal && <span className="personal-chip-sm">Perfil personal</span>}
            </div>
            <div className="store-fused-stats">
              {!store?.isPersonal && store?.rating != null && (
                <span className="store-fused-stat">
                  <Icon name="star" size={11} />
                  {store.rating.toFixed(1)}
                </span>
              )}
              {!store?.isPersonal && followers != null && (
                <span className="store-fused-stat">{followers} seguidores</span>
              )}
            </div>
          </div>
        </div>

        <SearchField
          value={searchQuery || ""}
          onChange={onSearchChange}
          placeholder={storeSearchPlaceholder(store?.business_name)}
          ariaLabel="Buscar en esta tienda"
        />

        {(categories.length > 0 || !isOwner) && (
          <div className="store-fused-cats">
            <div className="category-nav-container" ref={navRef}>
              <nav className="category-nav">
                <button
                  className={`category-btn ${activeCategory === "all" ? "active" : ""}`}
                  onClick={() => onCategoryChange("all")}
                >
                  Todos
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    className={`category-btn ${activeCategory === category ? "active" : ""}`}
                    onClick={() => onCategoryChange(category)}
                  >
                    {category}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        <div className="store-fused-actions">
          {isOwner && (
            <button type="button" className="store-fused-icon-btn" onClick={() => onEditSection?.("store")} title="Editar datos de la tienda" aria-label="Editar datos de la tienda">
              <Icon name="edit" size={16} />
            </button>
          )}

          <NotificationsBadge />

          {isOwner && (
            <button type="button" className="store-fused-icon-btn" onClick={onOpenStoreMenu} title="Gestión de mi tienda" aria-label="Gestión de mi tienda">
              <Icon name="menu" size={17} style={{ color: "var(--store-accent)" }} />
            </button>
          )}

          {/* Sin botón de perfil ni de favoritos aquí: en la página del bisne la
              identidad la lleva el menú de gestión del dueño, y Favoritos se
              abre desde el FAB del carrito, igual que en el resto del sitio. */}

          {!isOwner && contactHref && (
            <a href={contactHref} target="_blank" rel="noopener noreferrer" className="store-fused-contact">
              <Icon name="whatsapp" size={15} />
              <span>Contactar</span>
            </a>
          )}

          {!isOwner && !store?.isPersonal && (
            <button
              type="button"
              className={`store-fused-follow${following ? " following" : ""}`}
              onClick={toggleFollow}
              disabled={followLoading}
              aria-pressed={following}
              title={following ? "Dejar de seguir" : "Seguir tienda"}
            >
              <Icon name={following ? "user-check" : "user-plus"} size={15} />
              <span>{following ? "Siguiendo" : "Seguir"}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}