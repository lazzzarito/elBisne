"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { lockBodyScroll } from "@/lib/scroll-lock";
import { useHistoryPopup } from "@/lib/use-history-popup";
import SafeImage from "@/components/SafeImage";
import Icon from "@/components/Icon";

export default function FollowedStoresModal({ onClose }) {
  const { user } = useApp();
  const [stores, setStores] = useState(undefined); // undefined = cargando

  useEffect(() => {
    const unlock = lockBodyScroll();
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      unlock();
    };
  }, [onClose]);

  useHistoryPopup(true, onClose);

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured()) return;
    let active = true;
    const supabase = createClient();
    supabase
      .from("follows")
      .select("bisne_id, bisnes(handle, business_name, slogan, logo_url, cover_url, verified)")
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
    return () => {
      active = false;
    };
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

  // Sin sesión no hay follows: estado derivado en render
  const effectiveStores = user?.id ? stores : [];

  return (
    <div className="store-info-overlay" onClick={onClose}>
      <div className="store-info-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          <Icon name="close" size={18} />
        </button>

        <div className="store-info-scroll">
          <div className="store-info-header" style={{ paddingRight: "2.5rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <h2 className="store-info-title">Tus tiendas</h2>
              <span className="store-info-badge">
                {effectiveStores === undefined ? "Cargando…" : `${effectiveStores.length} siguiendo`}
              </span>
            </div>
          </div>

          <div className="store-info-body" style={{ paddingBottom: "1.5rem" }}>
            {effectiveStores === undefined ? (
              <div className="panel-skeleton" aria-busy="true">
                <div className="perfil-skeleton-line" style={{ width: "80%" }} />
                <div className="perfil-skeleton-line" style={{ width: "60%" }} />
              </div>
            ) : effectiveStores.length === 0 ? (
              <div className="cart-empty-message">
                <Icon name="heart-donate" size={42} style={{ margin: "0 auto 0.75rem", display: "block" }} />
                <p>Aún no sigues ninguna tienda.</p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  Pulsa <strong>Seguir</strong> en la portada de un bisne para ver sus novedades aquí.
                </p>
                <Link href="/explorar" className="perfil-empty-link" style={{ display: "inline-block", marginTop: "0.75rem" }}>
                  Explorar bisnes
                </Link>
              </div>
            ) : (
              <div className="followed-list">
                {effectiveStores.map((store) => (
                  <div key={store.id} className="followed-row">
                    <Link href={`/b/${store.handle}`} className="followed-link" onClick={onClose}>
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
