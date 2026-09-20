"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SafeImage from "@/components/SafeImage";
import Icon from "@/components/Icon";
import CatalogContainer from "../../CatalogContainer";
import ReviewList from "@/components/trust/ReviewList";
import StoreProfileHeader, { FollowButton } from "@/components/profile/StoreProfileHeader";
import ThemeEditorInline from "@/components/profile/ThemeEditorInline";
import { useApp } from "@/context/AppContext";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getChannelUrl } from "@/lib/messaging";

const DELIVERY_LABELS = {
  pickup: "Recojo en tienda",
  delivery: "Envío a domicilio",
  both: "Envío y recogida",
  none: "Solo tienda",
};

const TABS = [
  { id: "productos", label: "Productos", icon: "shopping-bag" },
  { id: "resenas", label: "Reseñas", icon: "star" },
  { id: "acerca", label: "Acerca de", icon: "info" },
];

export default function StorePageClient({ bisne, initialProducts, storeConfig }) {
  const router = useRouter();
  const { user, showToast } = useApp();
  const accent = bisne.theme?.accent || "#00a884";
  const scale = Math.max(0.6, Number(bisne.theme?.radiusScale) || 1);

  const themeStyle = useMemo(
    () => ({
      "--store-accent": accent,
      "--store-accent-bg": `color-mix(in srgb, ${accent} 12%, transparent)`,
      "--radius-sm": `${Math.round(6 * scale)}px`,
      "--radius-md": `${Math.round(10 * scale)}px`,
      "--radius-lg": `${Math.round(18 * scale)}px`,
    }),
    [accent, scale]
  );

  const [isOwner, setIsOwner] = useState(false);
  const [showThemeEditor, setShowThemeEditor] = useState(false);
  const [activeTab, setActiveTab] = useState("productos");

  // ¿El visitante es el dueño? → acciones inline de edición (UI_UX.md §2)
  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured()) return;
    let active = true;
    createClient()
      .from("bisnes")
      .select("id")
      .eq("id", bisne.id)
      .eq("owner_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setIsOwner(Boolean(data));
      });
    return () => { active = false; };
  }, [user?.id, bisne.id]);

  const categories = useMemo(
    () => Array.from(new Set(initialProducts.map((p) => p.category))),
    [initialProducts]
  );

  const contactHref = useMemo(
    () => getChannelUrl("whatsapp", storeConfig, `¡Hola ${bisne.business_name}! Quiero saber más sobre su tienda.`),
    [storeConfig, bisne.business_name]
  );

  const openThemeEditor = useCallback(() => setShowThemeEditor(true), []);
  const goAddProduct = useCallback(() => {
    router.push("/panel/productos");
  }, [router]);

  return (
    <div className="store-page sp-page" style={themeStyle}>
      <StoreProfileHeader
        bisne={bisne}
        isOwner={isOwner}
        onEditTheme={openThemeEditor}
        onAddProduct={goAddProduct}
        onOpenTab={setActiveTab}
      />

      {/* Barra de pestañas estilo IG */}
      <nav className="sp-tabs" role="tablist" aria-label="Secciones del perfil">
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
        {activeTab === "productos" && (
          <section role="tabpanel" aria-label="Productos del bisne">
            <CatalogContainer
              initialProducts={initialProducts}
              storeConfig={storeConfig}
              initialCategory="all"
              bisneId={bisne?.id}
            />
          </section>
        )}

        {activeTab === "resenas" && (
          <section className="sp-panel-section" role="tabpanel" aria-label="Reseñas del bisne">
            <div className="sp-rating-summary">
              <div className="sp-rating-big">
                {bisne.rating != null ? bisne.rating.toFixed(1) : "—"}
                <span className="sp-rating-stars" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Icon key={n} name="star" size={14} style={{ opacity: bisne.rating != null && n <= Math.round(bisne.rating) ? 1 : 0.25 }} />
                  ))}
                </span>
                <span className="sp-rating-count">{bisne.ratingCount ?? 0} reseñas</span>
              </div>
            </div>
            <ReviewList bisneId={bisne.id} />
          </section>
        )}

        {activeTab === "acerca" && (
          <section className="sp-panel-section" role="tabpanel" aria-label="Acerca del bisne">
            <div className="sp-about-card">
              <h3 className="sp-about-title">Acerca de {bisne.business_name}</h3>
              {bisne.description && <p className="sp-about-text">{bisne.description}</p>}

              <div className="sp-about-grid">
                {bisne.hours && (
                  <div className="sp-about-item">
                    <Icon name="clock" size={15} />
                    <div>
                      <strong>Horario</strong>
                      <p>{bisne.hours}</p>
                    </div>
                  </div>
                )}
                {bisne.address && (
                  <div className="sp-about-item">
                    <Icon name="map-pin" size={15} />
                    <div>
                      <strong>Dirección</strong>
                      <p>{bisne.address}</p>
                      {bisne.mapEmbedUrl && (
                        <div className="sp-about-map">
                          <iframe src={bisne.mapEmbedUrl} title="Mapa del bisne" loading="lazy" allowFullScreen />
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {bisne.deliveryMode && (
                  <div className="sp-about-item">
                    <Icon name="truck" size={15} />
                    <div>
                      <strong>Entrega</strong>
                      <p>{DELIVERY_LABELS[bisne.deliveryMode] || bisne.deliveryMode}</p>
                    </div>
                  </div>
                )}
                {bisne.phoneWhatsapp && (
                  <div className="sp-about-item">
                    <Icon name="whatsapp" size={15} />
                    <div>
                      <strong>WhatsApp</strong>
                      <p>{bisne.phoneWhatsapp}</p>
                    </div>
                  </div>
                )}
              </div>

              {isOwner && (
                <Link href="/panel" className="sp-btn ghost sp-about-panel-link">
                  <Icon name="shopping-bag" size={14} /> Mi panel (gestión avanzada)
                </Link>
              )}
            </div>
          </section>
        )}
      </div>

      {showThemeEditor && (
        <ThemeEditorInline
          bisneId={bisne.id}
          initialPinned={bisne.pinnedBanner}
          initialAccent={accent}
          onClose={() => setShowThemeEditor(false)}
        />
      )}
    </div>
  );
}
