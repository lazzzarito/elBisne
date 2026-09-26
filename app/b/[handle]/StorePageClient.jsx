"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import CatalogContainer from "../../CatalogContainer";
import ReviewList from "@/components/trust/ReviewList";
import WriteReviewModal from "@/components/trust/WriteReviewModal";
import StoreOwnerMenu from "@/components/profile/StoreOwnerMenu";
import { useApp } from "@/context/AppContext";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getChannelUrl } from "@/lib/messaging";
import { getBisneByHandle } from "@/lib/store";

// Página pública de tienda (layout Whatalog + edición en vivo del dueño)
// La cabecera/catálogo/footer viven en CatalogContainer en modo tienda; aquí
// se resuelve si el visitante es el dueño, se activa el "store chrome"
// (oculta TopNav/globales) y se inyectan reseñas antes del footer.
export default function StorePageClient({ bisne, initialProducts, initialCollections, storeConfig }) {
  const { user, setStoreChrome } = useApp();
  const [bisneData, setBisneData] = useState(bisne);
  const [isOwner, setIsOwner] = useState(false);
  const [showOwnerMenu, setShowOwnerMenu] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewVersion, setReviewVersion] = useState(0);

  const accent = bisneData?.theme?.accent || "#00a884";
  const scale = Math.max(0.6, Number(bisneData?.theme?.radiusScale) || 1);

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

  // ¿El visitante es el dueño? → activa el chrome de tienda (oculta TopNav,
  // el FAB global pasa a "Publicar producto") y permite edición en vivo.
  useEffect(() => {
    let active = true;
    const check = async () => {
      let owner = false;
      if (user?.id && isSupabaseConfigured()) {
        const { data } = await createClient()
          .from("bisnes")
          .select("id")
          .eq("id", bisne.id)
          .eq("owner_id", user.id)
          .maybeSingle();
        if (active) owner = Boolean(data);
      }
      setIsOwner(owner);
      setAuthChecked(true);
    };
    check();
    return () => { active = false; };
  }, [user?.id, bisne.id]);

  useEffect(() => {
    setStoreChrome({ active: true, bisneId: bisne.id, isOwner });
    return () => setStoreChrome({ active: false, bisneId: null, isOwner: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner]);

  const refreshStoreData = useCallback(async () => {
    if (!bisne.handle || !isSupabaseConfigured()) return;
    const fresh = await getBisneByHandle(bisne.handle);
    if (fresh) setBisneData(fresh);
  }, [bisne.handle]);

  const contactHref = useMemo(
    () =>
      getChannelUrl(
        "whatsapp",
        {
          messaging: { channels: { whatsapp: { enabled: true, number: bisneData?.phoneWhatsapp } } },
          whatsappNumber: bisneData?.phoneWhatsapp,
        },
        `¡Hola ${bisneData?.business_name || ""}! Te encontré en elBisne.`
      ),
    [bisneData?.phoneWhatsapp, bisneData?.business_name]
  );

  const beforeFooter = bisneData?.isPersonal ? null : (
    <section className="store-reviews-section" id="store-reviews" aria-label="Reseñas de la tienda">
      <ReviewList
        bisneId={bisneData?.id}
        refreshKey={reviewVersion}
        onLeaveReview={() => setShowReview(true)}
      />
    </section>
  );

  return (
    <div className="store-page" style={themeStyle}>
      <CatalogContainer
        initialProducts={initialProducts}
        initialCollections={initialCollections}
        storeConfig={storeConfig}
        initialCategory="all"
        bisneId={bisneData?.id}
        storeMode
        store={bisneData}
        isOwner={isOwner && authChecked}
        onOpenStoreMenu={() => setShowOwnerMenu(true)}
        onStoreDataChanged={refreshStoreData}
        beforeFooter={beforeFooter}
      />

      {showOwnerMenu && (
        <StoreOwnerMenu
          open={showOwnerMenu}
          handle={bisneData?.handle}
          isPersonal={bisneData?.isPersonal}
          onClose={() => setShowOwnerMenu(false)}
        />
      )}

      {showReview && (
        <WriteReviewModal
          bisneId={bisneData?.id}
          bisneName={bisneData?.business_name}
          onClose={() => setShowReview(false)}
          onSaved={() => setReviewVersion((v) => v + 1)}
        />
      )}
    </div>
  );
}