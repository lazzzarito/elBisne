"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import MasonryGrid from "@/components/MasonryGrid";
import ProductCard from "@/components/ProductCard";
import ProductModal from "@/components/ProductModal";
import ActivateStoreWizard from "@/components/ActivateStoreWizard";
import Icon from "@/components/Icon";
import SafeImage from "@/components/SafeImage";

const DELIVERY_LABELS = {
  pickup: "Recojo en tienda",
  delivery: "Envío a domicilio",
  both: "Envío y recogida",
  none: "Solo tienda",
};

function initialsOf(name) {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

// ── Tarjeta de la tienda del usuario (si ya activó una) ─────────────────
function StoreCard({ bisne }) {
  return (
    <div className="profile-store-card">
      {bisne.coverUrl && (
        <div className="profile-store-cover">
          <SafeImage src={bisne.coverUrl} alt="" fill sizes="(max-width: 768px) 100vw, 600px" />
        </div>
      )}
      {bisne.hasPanel && <span className="profile-store-panel-chip">Vendedor</span>}
      <div className="profile-store-row">
        <div className="profile-store-logo">
          {bisne.logoUrl ? (
            <SafeImage src={bisne.logoUrl} alt={bisne.businessName} width={48} height={48} className="profile-store-logo-img" />
          ) : (
            <span className="profile-store-initial">{initialsOf(bisne.businessName)}</span>
          )}
        </div>
        <div className="profile-store-info">
          <h3 className="profile-store-name">
            {bisne.businessName}
            {bisne.verified && (
              <span className="business-verified-badge" title="Tienda verificada">
                <Icon name="check" size={12} />
              </span>
            )}
          </h3>
          <p className="profile-store-handle">@{bisne.handle}</p>
          {bisne.deliveryMode && (
            <p className="profile-store-meta">
              <Icon name="truck" size={13} /> {DELIVERY_LABELS[bisne.deliveryMode] || bisne.deliveryMode}
            </p>
          )}
        </div>
        <div className="profile-store-links">
          <Link href={`/b/${bisne.handle}`} className="profile-store-link">
            Ver tienda
            <Icon name="arrow-up" size={13} style={{ transform: "rotate(45deg)" }} />
          </Link>
          <Link href="/panel" className="profile-store-link secondary">
            <Icon name="shopping-bag" size={13} />
            Mi panel
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PerfilClient({ products, storeConfig }) {
  const { isLoggedIn, user, authLoading, signOut, favoriteIds, toggleFavorite, addToCart, showToast } = useApp();
  const [selectedProduct, setSelectedProduct] = useState(null);
  // null = sin tienda; undefined = aún cargando (sentinela)
  const [myBisne, setMyBisne] = useState(undefined);

  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuario";

  // Cargar el bisne del usuario autenticado (si existe)
  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured()) return;
    let active = true;
    const supabase = createClient();
    supabase
      .from("bisnes")
      .select("id, handle, business_name, slogan, logo_url, cover_url, delivery_mode, verified")
      .eq("owner_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setMyBisne(
          data
            ? {
                id: data.id,
                handle: data.handle,
                businessName: data.business_name,
                slogan: data.slogan || "",
                logoUrl: data.logo_url || null,
                coverUrl: data.cover_url || null,
                deliveryMode: data.delivery_mode || "both",
                verified: !!data.verified,
                hasPanel: true,
              }
            : null
        );
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const favoriteProducts = useMemo(
    () => products.filter((p) => favoriteIds.includes(p.id)),
    [products, favoriteIds]
  );

  // ── Estado no autenticado / cargando ──
  if (authLoading) {
    return (
      <main className="perfil-page" id="main-content">
        <div className="perfil-skeleton" aria-busy="true">
          <div className="perfil-skeleton-avatar" />
          <div className="perfil-skeleton-lines">
            <div className="perfil-skeleton-line" style={{ width: "45%" }} />
            <div className="perfil-skeleton-line" style={{ width: "65%" }} />
          </div>
        </div>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="perfil-page" id="main-content">
        <div className="perfil-guest-card">
          <div className="perfil-guest-icon">
            <Icon name="user" size={28} />
          </div>
          <h1>Mi Perfil</h1>
          <p>
            Inicia sesión para gestionar tu perfil, ver tus productos guardados y activar tu
            propia tienda en elBisne.
          </p>
          <Link href="/auth" className="perfil-guest-cta">
            Iniciar sesión / Registrarse
          </Link>
        </div>
      </main>
    );
  }

  // ── Estado autenticado ──
  return (
    <main className="perfil-page" id="main-content">
      {/* Encabezado del perfil */}
      <header className="perfil-header">
        <div className="perfil-avatar" aria-hidden="true">
          {initialsOf(name)}
        </div>
        <div className="perfil-header-info">
          <h1 className="perfil-name">{name}</h1>
          <p className="perfil-email">{user.email}</p>
        </div>
        <button
          type="button"
          className="perfil-signout"
          onClick={() => signOut()}
        >
          Cerrar sesión
        </button>
      </header>

      {/* Tienda del usuario */}
      <section className="perfil-section" aria-label="Tu tienda">
        <h2 className="perfil-section-title">
          <Icon name="shopping-bag" size={16} />
          Tu tienda
        </h2>
        {myBisne === undefined ? (
          <div className="perfil-store-placeholder" aria-busy="true">Cargando tu tienda…</div>
        ) : myBisne ? (
          <StoreCard bisne={myBisne} />
        ) : (
          <div className="perfil-store-cta">
            <p className="perfil-store-cta-text">
              ¿Vendes algo? Publica tu catálogo, recibe pedidos por WhatsApp y llega a miles de
              compradores.
            </p>
            <ActivateStoreWizard
              user={user}
              storeConfig={storeConfig}
              onCreated={(bisne) => {
                setMyBisne(bisne);
                showToast("¡Tu tienda está activa! 🎉");
              }}
            />
          </div>
        )}
      </section>

      {/* Productos guardados */}
      <section className="perfil-section" aria-label="Productos guardados">
        <h2 className="perfil-section-title">
          <Icon name="heart-filled" size={16} />
          Guardados
          <span className="perfil-section-count">{favoriteProducts.length}</span>
        </h2>

        {favoriteProducts.length > 0 ? (
          <MasonryGrid>
            {favoriteProducts.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                index={i}
                onOpenDetails={setSelectedProduct}
                onAddToCart={addToCart}
                isFavorited={favoriteIds.includes(product.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </MasonryGrid>
        ) : (
          <div className="perfil-empty-favs">
            <p>Aún no guardas productos.</p>
            <Link href="/" className="perfil-empty-link">
              Explorar el catálogo
            </Link>
          </div>
        )}
      </section>

      {/* Modal de detalle de producto (compartido con el catálogo) */}
      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={addToCart}
        storeConfig={storeConfig}
        isFavorited={selectedProduct ? favoriteIds.includes(selectedProduct.id) : false}
        onToggleFavorite={toggleFavorite}
      />
    </main>
  );
}
