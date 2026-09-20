"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getChannelUrl } from "@/lib/messaging";
import SafeImage from "@/components/SafeImage";
import Icon from "@/components/Icon";

// ── FollowButton con estética de corazón (UI_UX.md §2: el corazón ES el seguir) ──
export function FollowButton({ bisneId, handle, size = "md", withLabel = true }) {
  const { user, showToast } = useApp();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;
    let active = true;
    const supabase = createClient();
    supabase
      .from("follows")
      .select("bisne_id")
      .eq("user_id", user.id)
      .eq("bisne_id", bisneId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setFollowing(Boolean(data));
      });
    return () => { active = false; };
  }, [user, bisneId]);

  const toggle = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      showToast("Para seguir tiendas inicia sesión", "warning");
      return;
    }
    if (!user) {
      showToast("Inicia sesión para seguir este bisne", "warning");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    try {
      if (following) {
        await supabase.from("follows").delete().match({ user_id: user.id, bisne_id: bisneId });
        setFollowing(false);
        showToast("Dejaste de seguir esta tienda");
      } else {
        await supabase.from("follows").insert({ user_id: user.id, bisne_id: bisneId });
        setFollowing(true);
        showToast("¡Siguiendo esta tienda!");
      }
    } catch (e) {
      console.error("Error al cambiar seguimiento:", e);
      showToast("No se pudo actualizar el seguimiento", "warning");
    } finally {
      setLoading(false);
    }
  }, [user, following, bisneId, showToast]);

  return (
    <button
      type="button"
      className={`sp-follow-btn${following ? " following" : ""}${size === "sm" ? " sm" : ""}`}
      onClick={toggle}
      disabled={loading}
      aria-pressed={following}
      aria-label={following ? "Dejar de seguir" : "Seguir tienda"}
      title={following ? "Dejar de seguir" : "Seguir tienda"}
    >
      <Icon name={following ? "heart-filled" : "heart-outline"} size={size === "sm" ? 14 : 16} />
      {withLabel && <span>{following ? "Siguiendo" : "Seguir"}</span>}
    </button>
  );
}

function RatingChip({ rating, ratingCount }) {
  if (rating == null) return null;
  return (
    <span className="sp-rating-chip" title={`${ratingCount} reseñas`}>
      <Icon name="star" size={13} />
      {rating.toFixed(1)}
    </span>
  );
}

function Counter({ value, label, onClick, disabled }) {
  if (disabled || !onClick) {
    return (
      <div className="sp-counter">
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    );
  }
  return (
    <button type="button" className="sp-counter clickable" onClick={onClick}>
      <strong>{value}</strong>
      <span>{label}</span>
    </button>
  );
}

// ── Banner fijable (oferta | mapa | imagen) ─────────────────────────────
function PinnedBanner({ banner, bisneHandle }) {
  if (!banner || !banner.type) return null;

  if (banner.type === "image" && banner.ref) {
    return (
      <div className="sp-pinned-banner">
        <SafeImage src={banner.ref} alt="Banner fijado" fill sizes="(max-width: 1023px) 100vw, 900px" />
      </div>
    );
  }
  if (banner.type === "map" && banner.ref) {
    return (
      <div className="sp-pinned-banner">
        <iframe src={banner.ref} title="Ubicación del bisne" loading="lazy" allowFullScreen />
      </div>
    );
  }
  if (banner.type === "offer") {
    return (
      <Link href={`/b/${bisneHandle}`} className="sp-pinned-banner sp-pinned-offer">
        <Icon name="sparkles" size={18} />
        <span>{banner.ref || "Oferta destacada"}</span>
      </Link>
    );
  }
  return null;
}

// ── Header estilo Instagram del perfil/tienda unificado ─────────────────
// isOwner: el visitante es el dueño del bisne → acciones de edición inline.
export default function StoreProfileHeader({ bisne, isOwner = false, onEditTheme, onAddProduct, onOpenTab }) {
  const { showToast } = useApp();
  const [followers, setFollowers] = useState(null);

  useEffect(() => {
    if (!bisne?.id || !isSupabaseConfigured()) return;
    let active = true;
    createClient()
      .rpc("get_bisne_followers", { p_bisne_id: bisne.id })
      .then(({ data }) => {
        if (active) setFollowers(Number(data) || 0);
      });
    return () => { active = false; };
  }, [bisne?.id]);

  const contactHref = useMemo(
    () =>
      getChannelUrl(
        "whatsapp",
        {
          messaging: { channels: { whatsapp: { enabled: true, number: bisne.phoneWhatsapp } } },
          whatsappNumber: bisne.phoneWhatsapp,
        },
        `¡Hola ${bisne.business_name}! Te encontré en elBisne.`
      ),
    [bisne.phoneWhatsapp, bisne.business_name]
  );

  // Contadores clicables (UI_UX.md §2): productos → pestaña Productos,
  // reseñas → pestaña Reseñas. Seguidores queda informativo por ahora.
  const stats = [
    {
      value: bisne.productCount ?? 0,
      label: bisne.productCount === 1 ? "producto" : "productos",
      onClick: () => onOpenTab?.("productos"),
    },
    { value: followers ?? "…", label: "seguidores", onClick: null },
    {
      value: bisne.rating != null ? bisne.rating.toFixed(1) : "—",
      label: "reseñas",
      onClick: () => onOpenTab?.("resenas"),
    },
  ];

  return (
    <header className="sp-header" aria-label={`${bisne.business_name} — perfil`}>
      <PinnedBanner banner={bisne.pinnedBanner} bisneHandle={bisne.handle} />

      <div className="sp-header-main">
        <div className="sp-avatar" aria-hidden="true">
          {bisne.logoUrl ? (
            <SafeImage src={bisne.logoUrl} alt={bisne.business_name} width={86} height={86} className="sp-avatar-img" />
          ) : (
            <span className="sp-avatar-initial">{(bisne.business_name || "B").charAt(0)}</span>
          )}
        </div>

        <div className="sp-header-info">
          <div className="sp-name-row">
            <h1 className="sp-name">{bisne.business_name}</h1>
            {bisne.verified && (
              <span className="business-verified-badge" title="Tienda verificada">
                <Icon name="check" size={12} />
              </span>
            )}
            <RatingChip rating={bisne.rating} ratingCount={bisne.ratingCount} />
          </div>

          {bisne.slogan && <p className="sp-bio">{bisne.slogan}</p>}

          <div className="sp-meta-row">
            {bisne.category && (
              <span className="sp-meta-item"><Icon name="shopping-bag" size={12} /> {bisne.category}</span>
            )}
            {bisne.address && (
              <span className="sp-meta-item"><Icon name="map-pin" size={12} /> {bisne.address}</span>
            )}
          </div>
        </div>

        <div className="sp-counters">
          {stats.map((s) => (
            <Counter key={s.label} value={s.value} label={s.label} onClick={s.onClick} />
          ))}
        </div>
      </div>

      <div className="sp-actions">
        {isOwner ? (
          <>
            <button type="button" className="sp-btn primary" onClick={onEditTheme}>
              <Icon name="sparkles" size={14} /> Editar tienda
            </button>
            <button type="button" className="sp-btn" onClick={onAddProduct}>
              <Icon name="plus" size={14} /> Añadir producto
            </button>
            <Link href="/panel" className="sp-btn ghost">
              <Icon name="shopping-bag" size={14} /> Mi panel
            </Link>
          </>
        ) : (
          <>
            <FollowButton bisneId={bisne.id} handle={bisne.handle} />
            <a href={contactHref} target="_blank" rel="noopener noreferrer" className="sp-btn primary">
              <Icon name="whatsapp" size={15} /> Contactar
            </a>
          </>
        )}
      </div>
    </header>
  );
}
