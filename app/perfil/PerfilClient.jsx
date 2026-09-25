"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import MasonryGrid from "@/components/MasonryGrid";
import ProductCard from "@/components/ProductCard";
import ProductModal from "@/components/ProductModal";
import ActivateStoreWizard from "@/components/ActivateStoreWizard";
import AuthSteps from "@/components/auth/AuthSteps";
import SafeImage from "@/components/SafeImage";
import Icon from "@/components/Icon";

const TABS = [
  { id: "guardados", label: "Guardados", icon: "heart-outline" },
  { id: "tiendas", label: "Tiendas seguidas", icon: "explore" },
  { id: "pedidos", label: "Mis pedidos", icon: "shopping-bag" },
];

const DELIVERY_LABELS = {
  pickup: "Recojo en tienda",
  delivery: "Envío a domicilio",
  both: "Envío y recogida",
  none: "Solo tienda",
};

const ORDER_STATUS_LABELS = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  shipped: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

function initialsOf(name) {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

// ── Pestaña Tiendas seguidas (lista con logo + link, UI_UX.md §2) ────────
function FollowedStoresTab() {
  const { user } = useApp();
  const [stores, setStores] = useState(undefined);

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured()) return;
    let active = true;
    const supabase = createClient();
    supabase
      .from("follows")
      .select("bisne_id, bisnes(handle, business_name, slogan, logo_url, verified)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!active) return;
        setStores(
          (data || [])
            .filter((f) => f.bisnes)
            .map((f) => ({
              id: f.bisne_id,
              handle: f.bisnes.handle,
              name: f.bisnes.business_name,
              slogan: f.bisnes.slogan || "",
              logoUrl: f.bisnes.logo_url || null,
              verified: !!f.bisnes.verified,
            }))
        );
      });
    return () => { active = false; };
  }, [user?.id]);

  const unfollow = async (store) => {
    if (!user?.id || !isSupabaseConfigured()) return;
    setStores((prev) => prev.filter((s) => s.id !== store.id));
    try {
      const supabase = createClient();
      await supabase.from("follows").delete().match({ user_id: user.id, bisne_id: store.id });
    } catch (e) {
      console.error("Error dejando de seguir:", e);
      setStores((prev) => [...prev, store]);
    }
  };

  if (stores === undefined) {
    return (
      <div className="panel-skeleton" aria-busy="true">
        <div className="perfil-skeleton-line" style={{ width: "75%" }} />
        <div className="perfil-skeleton-line" style={{ width: "55%" }} />
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className="perfil-empty-favs">
        <Icon name="heart-donate" size={36} />
        <p>Aún no sigues ninguna tienda.</p>
        <Link href="/" className="perfil-empty-link">Descubrir bisnes</Link>
      </div>
    );
  }

  return (
    <div className="followed-list">
      {stores.map((store) => (
        <div key={store.id} className="followed-row">
          <Link href={`/${store.handle}`} className="followed-link">
            <span className="followed-logo">
              {store.logoUrl ? (
                <SafeImage src={store.logoUrl} alt={store.name} width={44} height={44} className="followed-logo-img" />
              ) : (
                <span className="followed-initial">{(store.name || "B").charAt(0)}</span>
              )}
            </span>
            <span className="followed-info">
              <span className="followed-name">
                {store.name}
                {store.verified && (
                  <span className="business-verified-badge" title="Verificada">
                    <Icon name="check" size={11} />
                  </span>
                )}
              </span>
              {store.slogan && <span className="followed-slogan">{store.slogan}</span>}
              <span className="followed-handle">/{store.handle}</span>
            </span>
          </Link>
          <button
            type="button"
            className="followed-unfollow"
            onClick={() => unfollow(store)}
            title="Dejar de seguir"
            aria-label={`Dejar de seguir a ${store.name}`}
          >
            <Icon name="heart-filled" size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Pestaña Mis pedidos (lista simple con tracking) ──────────────────────
function MyOrdersTab() {
  const { user } = useApp();
  const [orders, setOrders] = useState(undefined);

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured()) return;
    let active = true;
    const supabase = createClient();
    supabase
      .from("orders")
      .select("id, total, status, created_at, items, bisnes(handle, business_name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (active) setOrders(data || []);
      });
    return () => { active = false; };
  }, [user?.id]);

  if (orders === undefined) {
    return (
      <div className="panel-skeleton" aria-busy="true">
        <div className="perfil-skeleton-line" style={{ width: "75%" }} />
        <div className="perfil-skeleton-line" style={{ width: "55%" }} />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="perfil-empty-favs">
        <Icon name="shopping-bag" size={36} />
        <p>Aún no has hecho pedidos.</p>
        <Link href="/" className="perfil-empty-link">Descubrir productos</Link>
      </div>
    );
  }

  return (
    <div className="orders-list">
      {orders.map((order) => (
        <Link key={order.id} href={`/pedido/${order.id}`} className="order-row">
          <div className="order-row-info">
            <span className="order-row-bisne">
              {order.bisnes?.business_name || "Tienda"}
              {order.bisnes?.handle && <span className="order-row-handle"> /{order.bisnes.handle}</span>}
            </span>
            <span className="order-row-items">
              {Array.isArray(order.items) ? order.items.length : 0} {Array.isArray(order.items) && order.items.length === 1 ? "artículo" : "artículos"}
            </span>
            <span className="order-row-date">
              {new Date(order.created_at).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
          <div className="order-row-right">
            <span className={`order-status-chip status-${order.status}`}>
              {ORDER_STATUS_LABELS[order.status] || order.status}
            </span>
            <span className="order-row-total">${Number(order.total).toFixed(2)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ── Perfil principal ─────────────────────────────────────────────────────
export default function PerfilClient({ products, storeConfig }) {
  const router = useRouter();
  const { isLoggedIn, user, authLoading, signOut, favoriteIds, toggleFavorite, addToCart, showToast, withStock, handleOrderComplete } = useApp();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeTab, setActiveTab] = useState("guardados");
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
      .select("id, handle, business_name, slogan, logo_url, cover_url, delivery_mode, verified, type, phone_whatsapp")
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
                business_name: data.business_name,
                slogan: data.slogan || "",
                logoUrl: data.logo_url || null,
                coverUrl: data.cover_url || null,
                deliveryMode: data.delivery_mode || "both",
                verified: !!data.verified,
                hasPanel: true,
                type: data.type || "business",
                isPersonal: data.type === "personal",
                phone_whatsapp: data.phone_whatsapp || "",
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

  const handleCreated = useCallback(
    (bisne) => {
      setMyBisne(bisne);
      showToast("¡Tu tienda está activa! 🎉");
      router.refresh();
    },
    [showToast, router]
  );

  // ── Estado cargando ──
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

  // ── Sin sesión: registro en pasos DIRECTO (sin botón intermedio) ──
  if (!isLoggedIn) {
    return (
      <main className="perfil-page" id="main-content">
        <div className="perfil-guest-wrap">
          <AuthSteps />
        </div>
      </main>
    );
  }

  // ── Estado autenticado: pestañas (Guardados / Tiendas / Pedidos) ──
  return (
    <main className="perfil-page" id="main-content">
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

      {/* Perfil del usuario (si ya activó uno) — acceso inline al perfil de tienda */}
      {myBisne !== null && (
        <section className="perfil-section perfil-bisne-section" aria-label={myBisne?.isPersonal ? "Tu perfil personal" : "Tu tienda"}>
          {myBisne === undefined ? (
            <div className="perfil-store-placeholder" aria-busy="true">Cargando tu perfil…</div>
          ) : myBisne.isPersonal ? (
            <div className="profile-store-card">
              <div className="profile-store-row">
                <div className="profile-store-logo">
                  {myBisne.logoUrl ? (
                    <SafeImage src={myBisne.logoUrl} alt={myBisne.businessName} width={48} height={48} className="profile-store-logo-img" />
                  ) : (
                    <span className="profile-store-initial">{initialsOf(myBisne.businessName)}</span>
                  )}
                </div>
                <div className="profile-store-info">
                  <h3 className="profile-store-name">
                    {myBisne.businessName}
                    <span className="personal-chip">Perfil personal</span>
                  </h3>
                  <p className="profile-store-handle">@{myBisne.handle} · productos con validez de 30 días</p>
                </div>
                <div className="profile-store-links">
                  <Link href={`/${myBisne.handle}`} className="profile-store-link">
                    Ver mi perfil público
                    <Icon name="arrow-up" size={13} style={{ transform: "rotate(45deg)" }} />
                  </Link>
                </div>
              </div>
              <div className="personal-upgrade">
                <p className="personal-upgrade-text">
                  ¿Quieres vender como tienda completa? Desbloquea ofertas flash, reseñas y catálogo sin caducidad.
                </p>
                <ActivateStoreWizard user={user} storeConfig={storeConfig} existing={myBisne} onCreated={handleCreated} />
              </div>
            </div>
          ) : (
            <div className="profile-store-card">
              {myBisne.coverUrl && (
                <div className="profile-store-cover">
                  <SafeImage src={myBisne.coverUrl} alt="" fill sizes="(max-width: 768px) 100vw, 600px" />
                </div>
              )}
              <div className="profile-store-row">
                <div className="profile-store-logo">
                  {myBisne.logoUrl ? (
                    <SafeImage src={myBisne.logoUrl} alt={myBisne.businessName} width={48} height={48} className="profile-store-logo-img" />
                  ) : (
                    <span className="profile-store-initial">{initialsOf(myBisne.businessName)}</span>
                  )}
                </div>
                <div className="profile-store-info">
                  <h3 className="profile-store-name">
                    {myBisne.businessName}
                    {myBisne.verified && (
                      <span className="business-verified-badge" title="Tienda verificada">
                        <Icon name="check" size={12} />
                      </span>
                    )}
                  </h3>
                  <p className="profile-store-handle">@{myBisne.handle}</p>
                </div>
                <div className="profile-store-links">
                  <Link href={`/${myBisne.handle}`} className="profile-store-link">
                    Ver mi perfil de tienda
                    <Icon name="arrow-up" size={13} style={{ transform: "rotate(45deg)" }} />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {myBisne === null && (
        <section className="perfil-section perfil-bisne-section" aria-label="Crea tu perfil o tienda">
          <div className="perfil-store-cta">
            <p className="perfil-store-cta-text">
              Crea un perfil personal para publicar productos con validez de 30 días, o activa una tienda
              completa con ofertas, reseñas y catálogo ilimitado. Los pedidos llegan por WhatsApp.
            </p>
            <div className="perfil-cta-grid">
              <Link href="/panel/productos" className="perfil-cta-card">
                <span className="perfil-cta-card-icon"><Icon name="user" size={20} /></span>
                <strong className="perfil-cta-card-title">Publica productos gratis</strong>
                <span className="perfil-cta-card-desc">
                  Perfil personal: solo productos, con validez de 30 días. Sin ofertas ni valoraciones.
                </span>
              </Link>
              <div className="perfil-cta-card wizard">
                <ActivateStoreWizard
                  user={user}
                  storeConfig={storeConfig}
                  onCreated={handleCreated}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Pestañas del perfil */}
      <nav className="sp-tabs perfil-tabs" role="tablist" aria-label="Secciones de tu perfil">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`sp-tab${activeTab === tab.id ? " active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon name={tab.icon} size={15} />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="sp-tabpanels">
        {activeTab === "guardados" && (
          <section role="tabpanel" aria-label="Productos guardados">
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
                <Icon name="heart-donate" size={36} />
                <p>Aún no guardas productos.</p>
                <Link href="/" className="perfil-empty-link">Explorar el catálogo</Link>
              </div>
            )}
          </section>
        )}

        {activeTab === "tiendas" && (
          <section role="tabpanel" aria-label="Tiendas seguidas">
            <FollowedStoresTab />
          </section>
        )}

        {activeTab === "pedidos" && (
          <section role="tabpanel" aria-label="Mis pedidos">
            <MyOrdersTab />
          </section>
        )}
      </div>

      <ProductModal
        product={withStock(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={addToCart}
        storeConfig={storeConfig}
        onOrderComplete={handleOrderComplete}
        isFavorited={selectedProduct ? favoriteIds.includes(selectedProduct.id) : false}
        onToggleFavorite={toggleFavorite}
      />
    </main>
  );
}
