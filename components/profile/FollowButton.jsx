"use client";

import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import Icon from "@/components/Icon";

// ── FollowButton (el corazón ES el seguir) ──────────────────────────────
export default function FollowButton({ bisneId, handle, size = "md", withLabel = true }) {
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
