"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { lockBodyScroll } from "@/lib/scroll-lock";
import Icon from "@/components/Icon";

// Editor inline (Fase A): permite fijar banner (oferta/mapa/imagen) y ajustar
// el acento del tema sin salir del perfil. El panel /panel sigue existiendo
// para gestión seria; esto es lo "frecuente" hecho inline (UI_UX.md §6).
export default function ThemeEditorInline({ bisneId, initialPinned, initialAccent, onClose }) {
  const router = useRouter();
  const { showToast } = useApp();
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(initialPinned || { type: null, ref: "" });
  const [accent, setAccent] = useState(initialAccent || "");

  useEffect(() => {
    const unlock = lockBodyScroll();
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      unlock();
    };
  }, [onClose]);

  const setType = (type) => setBanner((p) => ({ ...p, type }));

  const save = async () => {
    if (!isSupabaseConfigured()) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const update = {};
      const clean = { ...banner };
      if (!clean.type) {
        update.pinned_banner = null;
      } else {
        if (clean.type === "image") {
          // Subir imagen si el usuario pegó una URL no válida no aplica: solo URL directa
          update.pinned_banner = { type: "image", ref: clean.ref || "" };
        } else if (clean.type === "map") {
          update.pinned_banner = { type: "map", ref: clean.ref || "" };
        } else if (clean.type === "offer") {
          update.pinned_banner = { type: "offer", ref: clean.ref || "" };
        }
      }
      if (accent && /^#[0-9a-fA-F]{6}$/.test(accent)) {
        update.theme = { accent, radiusScale: 1 };
      }
      const { error } = await supabase.from("bisnes").update(update).eq("id", bisneId);
      if (error) throw error;
      showToast("Cambios guardados");
      onClose?.();
      router.refresh();
    } catch (e) {
      console.error("Error guardando banner fijado:", e);
      showToast("No se pudo guardar. Inténtalo de nuevo.", "warning");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="theme-inline-overlay" onClick={onClose}>
      <div className="theme-inline-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Editar tienda">
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          <Icon name="close" size={20} />
        </button>

        <h2 className="theme-inline-title">Editar tienda</h2>

        <div className="cinfo-field">
          <label className="cinfo-label">Banner fijado (lo ven tus visitantes)</label>
          <div className="store-wizard-chips">
            {[
              { type: null, label: "Ninguno" },
              { type: "offer", label: "Oferta" },
              { type: "map", label: "Mapa" },
              { type: "image", label: "Imagen" },
            ].map((opt) => (
              <label key={opt.label} className={`cinfo-chip${banner.type === opt.type ? " active" : ""}`}>
                <input
                  type="radio"
                  name="pinned-type"
                  checked={banner.type === opt.type}
                  onChange={() => setType(opt.type)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {banner.type === "offer" && (
          <div className="cinfo-field">
            <label className="cinfo-label">Texto de la oferta</label>
            <input
              className="cinfo-input"
              type="text"
              placeholder="Ej. 2x1 en helados todos los viernes"
              value={banner.ref || ""}
              maxLength={120}
              onChange={(e) => setBanner((p) => ({ ...p, ref: e.target.value }))}
            />
          </div>
        )}

        {banner.type === "map" && (
          <div className="cinfo-field">
            <label className="cinfo-label">URL del mapa (Google Maps embed)</label>
            <input
              className="cinfo-input"
              type="url"
              placeholder="https://www.google.com/maps/embed?pb=..."
              value={banner.ref || ""}
              onChange={(e) => setBanner((p) => ({ ...p, ref: e.target.value }))}
            />
          </div>
        )}

        {banner.type === "image" && (
          <div className="cinfo-field">
            <label className="cinfo-label">URL de la imagen</label>
            <input
              className="cinfo-input"
              type="url"
              placeholder="https://…/banner.webp"
              value={banner.ref || ""}
              onChange={(e) => setBanner((p) => ({ ...p, ref: e.target.value }))}
            />
          </div>
        )}

        <div className="cinfo-field">
          <label className="cinfo-label">Color de acento</label>
          <input
            className="cinfo-input"
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(accent) ? accent : "#00a884"}
            onChange={(e) => setAccent(e.target.value)}
          />
        </div>

        <button type="button" className="sp-btn primary" onClick={save} disabled={saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
