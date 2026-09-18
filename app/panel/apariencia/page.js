"use client";

import { useEffect, useState } from "react";
import PanelLayout, { useMyBisne } from "../PanelLayout";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useApp } from "@/context/AppContext";
import Icon from "@/components/Icon";

const PRESET_COLORS = ["#00a884", "#25d366", "#0ea5e9", "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#ef4444"];

export default function PanelAparienciaPage() {
  const bisne = useMyBisne();
  const { showToast } = useApp();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  // Derivar form del bisne en render (sin estado duplicado innecesario):
  // se inicializa lazy y se recalcula solo si aún no existe.
  if (bisne && !form) {
    setForm({
      accent: bisne.theme?.accent || "#00a884",
      radiusScale: Number(bisne.theme?.radiusScale) || 1,
      slogan: bisne.slogan || "",
      description: bisne.description || "",
      address: bisne.address || "",
      hours: bisne.hours || "",
      phone_whatsapp: bisne.phone_whatsapp || "",
      logo_url: bisne.logo_url || null,
      cover_url: bisne.cover_url || null,
      delivery_mode: bisne.delivery_mode || "both",
    });
  }

  if (bisne === undefined || bisne === null || !form) {
    return <PanelLayout title="Apariencia"><div className="panel-skeleton" aria-busy="true" /></PanelLayout>;
  }

  const set = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const uploadImage = async (file, kind) => {
    if (!file || !isSupabaseConfigured()) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("La imagen no debe superar 5 MB", "warning");
      return;
    }
    kind === "logo" ? setLogoUploading(true) : setCoverUploading(true);
    try {
      const supabase = createClient();
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `bisnes/${bisne.id}-${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { cacheControl: "3600", upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      if (data?.publicUrl) set(`${kind}_url`, data.publicUrl);
    } catch (e) {
      console.error("Error subiendo imagen:", e);
      showToast("No se pudo subir la imagen", "warning");
    } finally {
      kind === "logo" ? setLogoUploading(false) : setCoverUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("bisnes")
        .update({
          theme: { accent: form.accent, radiusScale: form.radiusScale },
          slogan: form.slogan || null,
          description: form.description || null,
          address: form.address || null,
          hours: form.hours || null,
          phone_whatsapp: form.phone_whatsapp,
          logo_url: form.logo_url,
          cover_url: form.cover_url,
          delivery_mode: form.delivery_mode,
        })
        .eq("id", bisne.id);
      if (error) throw error;
      showToast("Apariencia actualizada");
    } catch (e) {
      console.error("Error guardando apariencia:", e);
      showToast("No se pudo guardar", "warning");
    } finally {
      setSaving(false);
    }
  };

  const previewStyle = {
    "--store-accent": form.accent,
    "--radius-lg": `${Math.round(18 * form.radiusScale)}px`,
  };

  return (
    <PanelLayout title="Apariencia" subtitle="Personaliza cómo te ve el marketplace">
      <div className="panel-form-inline">
        {/* Vista previa */}
        <div className="panel-theme-preview" style={previewStyle}>
          <div className="panel-theme-preview-cover" style={form.cover_url ? { backgroundImage: `url(${form.cover_url})` } : undefined}>
            <div className="panel-theme-preview-logo">
              {form.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logo_url} alt="" width={44} height={44} style={{ borderRadius: "50%", objectFit: "cover", width: "100%", height: "100%" }} />
              ) : (
                <span>{(bisne.business_name || "B").charAt(0)}</span>
              )}
            </div>
          </div>
          <div className="panel-theme-preview-body">
            <strong>{bisne.business_name}</strong>
            <span className="panel-theme-preview-slogan">{form.slogan || bisne.handle}</span>
            <span className="panel-theme-preview-btn" style={{ background: "var(--store-accent)" }}>Contactar</span>
          </div>
        </div>

        {/* Acento */}
        <div className="cinfo-field">
          <label className="cinfo-label">Color de acento</label>
          <div className="panel-color-row">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`panel-color-dot${form.accent === c ? " active" : ""}`}
                style={{ background: c }}
                onClick={() => set("accent", c)}
                aria-label={`Color ${c}`}
              />
            ))}
            <input type="color" value={form.accent} onChange={(e) => set("accent", e.target.value)} className="panel-color-input" title="Color personalizado" />
          </div>
        </div>

        {/* Radios */}
        <div className="cinfo-field">
          <label className="cinfo-label">
            Bordes: {form.radiusScale > 1.4 ? "Muy redondeados" : form.radiusScale < 0.8 ? "Cuadrados" : "Equilibrados"} ({form.radiusScale.toFixed(1)}×)
          </label>
          <input
            type="range"
            min="0.5"
            max="1.8"
            step="0.1"
            value={form.radiusScale}
            onChange={(e) => set("radiusScale", Number(e.target.value))}
            className="panel-range"
          />
        </div>

        <div className="cinfo-field">
          <label className="cinfo-label">Slogan</label>
          <input className="cinfo-input" type="text" value={form.slogan} onChange={(e) => set("slogan", e.target.value)} maxLength={90} placeholder="Una frase que te represente" />
        </div>

        <div className="cinfo-field">
          <label className="cinfo-label">Descripción</label>
          <textarea className="cinfo-input" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={400} />
        </div>

        <div className="panel-form-row">
          <div className="cinfo-field">
            <label className="cinfo-label">Dirección</label>
            <input className="cinfo-input" type="text" value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div className="cinfo-field">
            <label className="cinfo-label">Horario</label>
            <input className="cinfo-input" type="text" value={form.hours} onChange={(e) => set("hours", e.target.value)} placeholder="Lun-Sáb 9:00-18:00" />
          </div>
        </div>

        <div className="panel-form-row">
          <div className="cinfo-field">
            <label className="cinfo-label">WhatsApp de pedidos</label>
            <input className="cinfo-input" type="tel" value={form.phone_whatsapp} onChange={(e) => set("phone_whatsapp", e.target.value)} />
          </div>
          <div className="cinfo-field">
            <label className="cinfo-label">Entregas</label>
            <select className="cinfo-input" value={form.delivery_mode} onChange={(e) => set("delivery_mode", e.target.value)}>
              <option value="both">Envío y recogida</option>
              <option value="delivery">Solo envío</option>
              <option value="pickup">Solo recogida</option>
              <option value="none">Sin entregas</option>
            </select>
          </div>
        </div>

        {/* Logo & portada */}
        <div className="panel-form-row">
          <div className="cinfo-field">
            <label className="cinfo-label">Logo</label>
            <label className="panel-upload-zone small">
              <input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files?.[0], "logo")} disabled={logoUploading} />
              {logoUploading ? "Subiendo…" : form.logo_url ? "Cambiar logo" : <span><Icon name="plus" size={13} /> Subir logo</span>}
            </label>
          </div>
          <div className="cinfo-field">
            <label className="cinfo-label">Portada</label>
            <label className="panel-upload-zone small">
              <input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files?.[0], "cover")} disabled={coverUploading} />
              {coverUploading ? "Subiendo…" : form.cover_url ? "Cambiar portada" : <span><Icon name="plus" size={13} /> Subir portada</span>}
            </label>
          </div>
        </div>

        <button type="button" className="store-wizard-next" onClick={save} disabled={saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </PanelLayout>
  );
}
