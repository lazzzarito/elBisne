"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useApp } from "@/context/AppContext";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/auth-errors";
import MasonryGrid from "@/components/MasonryGrid";
import ProductCard from "@/components/ProductCard";
import ProductModal from "@/components/ProductModal";
import ActivateStoreWizard from "@/components/ActivateStoreWizard";
import SafeImage from "@/components/SafeImage";
import Icon from "@/components/Icon";

const TABS = [
  { id: "guardados", label: "Guardados", icon: "heart-outline" },
  { id: "tiendas", label: "Tiendas seguidas", icon: "explore" },
  { id: "pedidos", label: "Mis pedidos", icon: "shopping-bag" },
];

const QuickBuyModal = dynamic(() => import("@/components/QuickBuyModal"), { ssr: false, loading: () => null });

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
        <Link href="/explorar" className="perfil-empty-link">Explorar bisnes</Link>
      </div>
    );
  }

  return (
    <div className="followed-list">
      {stores.map((store) => (
        <div key={store.id} className="followed-row">
          <Link href={`/b/${store.handle}`} className="followed-link">
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
              <span className="followed-handle">/b/{store.handle}</span>
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
              {order.bisnes?.handle && <span className="order-row-handle"> /b/{order.bisnes.handle}</span>}
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

// ── Registro en pasos (UI_UX.md §2 · dos rutas: comprador y bisne) ───────
const slugifyHandle = (v) =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);

function AuthSteps({ onDone }) {
  const { showToast } = useApp();
  // route: null (elegir) | "user" (comprador) | "bisne" (vendedor)
  const [route, setRoute] = useState(null);
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState("signup");
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const setField = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const isBisne = route === "bisne";
  const totalSteps = isBisne ? 3 : 2;

  const validateStep = () => {
    if (step === 1) {
      if (mode === "signup" && !form.fullName.trim()) return "Cuéntanos tu nombre";
      if (!form.email.trim()) return "Necesitamos tu correo";
      if (form.password.length < 6) return "La contraseña debe tener al menos 6 caracteres";
    }
    if (isBisne && step === 2) {
      if (!form.businessName?.trim()) return "¿Cómo se llama tu tienda?";
      if (!form.handle || form.handle.length < 3) return "Elige un enlace válido (mín. 3 caracteres)";
      if (!form.whatsapp?.trim()) return "Necesitamos tu WhatsApp para recibir pedidos";
    }
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    if (step < totalSteps) setStep(step + 1);
    else finish();
  };

  const finish = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();

      // ¿Ya hay sesión? (usuario convertido a bisne después)
      const { data: sessionData } = await supabase.auth.getSession();
      let userId = sessionData?.session?.user?.id;

      if (!userId) {
        const { data, error: authErr } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: { data: { full_name: form.fullName.trim() || form.email.split("@")[0] } },
        });
        if (authErr) throw new Error(translateAuthError(authErr.message));
        userId = data?.user?.id;
        // Si el proyecto exige confirmación de email, no hay sesión aún:
        if (!userId) {
          showToast("Revisa tu correo para confirmar tu cuenta");
          onDone?.();
          return;
        }
      }

      if (isBisne) {
        // Datos del bisne (paso final reutiliza la lógica del wizard)
        const { error: bisneErr } = await supabase.from("bisnes").insert({
          owner_id: userId,
          handle: form.handle,
          business_name: form.businessName.trim(),
          slogan: form.slogan?.trim() || null,
          phone_whatsapp: form.whatsapp.trim(),
          delivery_mode: "both",
        });
        if (bisneErr) {
          if (/duplicate|unique/i.test(bisneErr.message || "")) {
            throw new Error(`El enlace @${form.handle} ya está en uso. Prueba con otro.`);
          }
          throw new Error("No pudimos crear tu tienda. Inténtalo de nuevo.");
        }
      }

      showToast(isBisne ? "¡Tu cuenta y tienda están listas! 🎉" : "¡Cuenta creada! 🎉");
      onDone?.();
    } catch (e) {
      setError(e.message || "Algo salió mal. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // Paso 0: elegir ruta
  if (!route) {
    return (
      <div className="auth-steps">
        <h2 className="auth-steps-title">Únete a elBisne</h2>
        <p className="auth-steps-sub">Elige cómo quieres empezar. Podrás cambiarlo después.</p>
        <button type="button" className="auth-route-card" onClick={() => { setRoute("user"); setMode("signup"); }}>
          <span className="auth-route-icon"><Icon name="user" size={20} /></span>
          <span>
            <strong>Comprar y descubrir</strong>
            <small>Guarda favoritos, sigue bisnes y haz pedidos.</small>
          </span>
          <Icon name="arrow-up" size={16} style={{ transform: "rotate(90deg)" }} />
        </button>
        <button type="button" className="auth-route-card" onClick={() => { setRoute("bisne"); setMode("signup"); }}>
          <span className="auth-route-icon bisne"><Icon name="shopping-bag" size={20} /></span>
          <span>
            <strong>Vender en elBisne</strong>
            <small>Crea tu tienda con catálogo y pedidos por WhatsApp.</small>
          </span>
          <Icon name="arrow-up" size={16} style={{ transform: "rotate(90deg)" }} />
        </button>
        <div className="auth-steps-login-hint">
          ¿Ya tienes cuenta?{" "}
          <button type="button" onClick={() => { setRoute("user"); setMode("login"); }}>Inicia sesión</button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-steps">
      <div className="auth-steps-progress" aria-label={`Paso ${step} de ${totalSteps}`}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span key={i} className={`auth-steps-dot${i + 1 <= step ? " active" : ""}`} />
        ))}
      </div>

      {error && <div className="auth-error">{error}</div>}

      {step === 1 && (
        <>
          {mode === "signup" && (
            <label className="cinfo-field">
              <span className="cinfo-label">Tu nombre</span>
              <input
                className="cinfo-input"
                type="text"
                placeholder="Ej. María Pérez"
                value={form.fullName}
                onChange={(e) => setField("fullName", e.target.value)}
                autoComplete="name"
              />
            </label>
          )}
          <label className="cinfo-field">
            <span className="cinfo-label">Correo electrónico</span>
            <input
              className="cinfo-input"
              type="email"
              placeholder="tucorreo@ejemplo.com"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="cinfo-field">
            <span className="cinfo-label">Contraseña</span>
            <input
              className="cinfo-input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
        </>
      )}

      {isBisne && step === 2 && (
        <>
          <label className="cinfo-field">
            <span className="cinfo-label">Nombre de tu tienda *</span>
            <input
              className="cinfo-input"
              type="text"
              placeholder="Ej. Dulces de María"
              value={form.businessName || ""}
              maxLength={60}
              onChange={(e) => setField("businessName", e.target.value)}
            />
          </label>
          <label className="cinfo-field">
            <span className="cinfo-label">Enlace de tu tienda *</span>
            <div className="store-wizard-handle-input">
              <span className="store-wizard-handle-prefix">elbisne.app/b/</span>
              <input
                className="cinfo-input"
                type="text"
                placeholder="dulces-maria"
                value={form.handle || ""}
                maxLength={20}
                onChange={(e) => setField("handle", slugifyHandle(e.target.value))}
              />
            </div>
          </label>
          <label className="cinfo-field">
            <span className="cinfo-label">WhatsApp de pedidos *</span>
            <input
              className="cinfo-input"
              type="tel"
              placeholder="Ej. +53 5 123 4567"
              value={form.whatsapp || ""}
              onChange={(e) => setField("whatsapp", e.target.value)}
            />
          </label>
        </>
      )}

      {isBisne && step === 3 && (
        <>
          <label className="cinfo-field">
            <span className="cinfo-label">Frase que te represente (opcional)</span>
            <input
              className="cinfo-input"
              type="text"
              placeholder="Ej. Postres caseros con entrega el mismo día"
              value={form.slogan || ""}
              maxLength={90}
              onChange={(e) => setField("slogan", e.target.value)}
            />
          </label>
          <p className="auth-steps-hint">
            Podrás personalizar el resto (categoría, portada, horario) desde tu perfil después.
          </p>
        </>
      )}

      <div className="auth-steps-actions">
        <button
          type="button"
          className="auth-steps-back"
          onClick={() => {
            setError(null);
            if (step > 1) setStep(step - 1);
            else setRoute(null);
          }}
        >
          <Icon name="arrow-left" size={14} /> Atrás
        </button>
        <button type="button" className="auth-steps-next" onClick={next} disabled={loading}>
          {loading ? "Creando…" : step < totalSteps ? "Continuar" : isBisne ? "Crear mi tienda" : "Crear cuenta"}
        </button>
      </div>
    </div>
  );
}

// ── Perfil principal ─────────────────────────────────────────────────────
export default function PerfilClient({ products, storeConfig }) {
  const router = useRouter();
  const { isLoggedIn, user, authLoading, signOut, favoriteIds, toggleFavorite, addToCart, showToast, withStock, handleOrderComplete } = useApp();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quickBuyProduct, setQuickBuyProduct] = useState(null);
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

      {/* Tienda del usuario (si ya activó una) — acceso inline al perfil de tienda */}
      {myBisne !== null && (
        <section className="perfil-section perfil-bisne-section" aria-label="Tu tienda">
          {myBisne === undefined ? (
            <div className="perfil-store-placeholder" aria-busy="true">Cargando tu tienda…</div>
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
                  <Link href={`/b/${myBisne.handle}`} className="profile-store-link">
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
        <section className="perfil-section perfil-bisne-section" aria-label="Activa tu tienda">
          <div className="perfil-store-cta">
            <p className="perfil-store-cta-text">
              ¿Vendes algo? Publica tu catálogo, recibe pedidos por WhatsApp y llega a miles de compradores.
            </p>
            <ActivateStoreWizard
              user={user}
              storeConfig={storeConfig}
              onCreated={handleCreated}
            />
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
        onQuickBuy={setQuickBuyProduct}
        isFavorited={selectedProduct ? favoriteIds.includes(selectedProduct.id) : false}
        onToggleFavorite={toggleFavorite}
      />

      {quickBuyProduct && (
        <QuickBuyModal
          product={quickBuyProduct}
          onClose={() => setQuickBuyProduct(null)}
          onOrderComplete={() => {
            handleOrderComplete();
            setSelectedProduct(null);
          }}
          storeConfig={storeConfig}
        />
      )}
    </main>
  );
}
