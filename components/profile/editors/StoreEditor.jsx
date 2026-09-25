"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/upload";
import { useApp } from "@/context/AppContext";
import { useHistoryPopup } from "@/lib/use-history-popup";
import Icon from "@/components/Icon";

// ── Editor inline de la identidad de la tienda (cabecera) ──────────────
export default function StoreEditor({ bisneId, store, onSaved, onClose }) {
  const { showToast } = useApp();
  const [form, setForm] = useState(() => ({
    business_name: store?.business_name || "",
    slogan: store?.slogan || "",
    description: store?.description || "",
    address: store?.address || "",
    hours: store?.hours || "",
    phone_whatsapp: store?.phoneWhatsapp || "",
    delivery_mode: store?.deliveryMode || "both",
    instagram: store?.socialLinks?.instagram || "",
    facebook: store?.socialLinks?.facebook || "",
    map_embed_url: store?.mapEmbedUrl || "",
    logo_url: store?.logoUrl || "",
  }));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useHistoryPopup(true, onClose);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleLogo = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, "bisnes");
      if (url) set("logo_url", url);
    } catch (e) {
      showToast(e.message || "No se pudo subir el logo", "warning");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!bisneId || !isSupabaseConfigured()) return;
    if (!form.business_name.trim()) {
      showToast("El nombre es obligatorio", "warning");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("bisnes")
        .update({
          business_name: form.business_name.trim(),
          slogan: form.slogan.trim() || null,
          description: form.description.trim() || null,
          address: form.address.trim() || null,
          hours: form.hours.trim() || null,
          phone_whatsapp: form.phone_whatsapp.trim() || null,
          delivery_mode: form.delivery_mode,
          map_embed_url: form.map_embed_url.trim() || null,
          logo_url: form.logo_url || null,
          social_links: {
            instagram: form.instagram.trim() || null,
            facebook: form.facebook.trim() || null,
          },
        })
        .eq("id", bisneId);
      if (error) throw error;
      showToast("Tienda actualizada");
      onSaved?.();
      onClose?.();
    } catch (e) {
      console.error("Error guardando tienda:", e);
      showToast("No se pudo guardar la tienda", "warning");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="store-editor-overlay" onClick={onClose}>
      <div className="store-editor" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Editar tienda">
        <div className="store-editor-header">
          <h2 className="store-editor-title">Datos de la tienda</h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar"><Icon name="close" size={18} /></button>
        </div>

        <div className="store-editor-scroll">
          <div className="cinfo-field">
            <label className="cinfo-label">Logotipo</label>
            <div className="collection-form-image">
              {form.logo_url ? (
                <Image src={form.logo_url} alt="" width={56} height={56} className="collection-form-photo" style={{ borderRadius: "50%" }} />
              ) : (
                <span className="collection-form-ph"><Icon name="image" size={18} /></span>
              )}
              <label className="banner-editor-upload">
                <input type="file" accept="image/*" onChange={(e) => handleLogo(e.target.files?.[0])} disabled={uploading} />
                {uploading ? "…" : "Subir"}
              </label>
            </div>
          </div>

          <div className="cinfo-field">
            <label className="cinfo-label">Nombre de la tienda *</label>
            <input className="cinfo-input" type="text" value={form.business_name} onChange={(e) => set("business_name", e.target.value)} maxLength={60} />
          </div>
          <div className="cinfo-field">
            <label className="cinfo-label">Eslogan</label>
            <input className="cinfo-input" type="text" value={form.slogan} onChange={(e) => set("slogan", e.target.value)} maxLength={140} />
          </div>
          <div className="cinfo-field">
            <label className="cinfo-label">Descripción</label>
            <textarea className="cinfo-input" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={500} />
          </div>
          <div className="cinfo-field">
            <label className="cinfo-label">Dirección</label>
            <input className="cinfo-input" type="text" value={form.address} onChange={(e) => set("address", e.target.value)} maxLength={160} />
          </div>
          <div className="panel-form-row">
            <div className="cinfo-field">
              <label className="cinfo-label">Horario</label>
              <input className="cinfo-input" type="text" value={form.hours} onChange={(e) => set("hours", e.target.value)} placeholder="Lun–Sáb, 9:00–18:00" maxLength={120} />
            </div>
            <div className="cinfo-field">
              <label className="cinfo-label">WhatsApp</label>
              <input className="cinfo-input" type="tel" value={form.phone_whatsapp} onChange={(e) => set("phone_whatsapp", e.target.value)} placeholder="+5350000000" maxLength={20} />
            </div>
          </div>
          <div className="cinfo-field">
            <label className="cinfo-label">Modalidad de entrega</label>
            <select className="cinfo-input" value={form.delivery_mode} onChange={(e) => set("delivery_mode", e.target.value)}>
              <option value="both">Envío y recogida</option>
              <option value="delivery">Solo envío a domicilio</option>
              <option value="pickup">Solo recogida</option>
              <option value="none">Solo tienda física</option>
            </select>
          </div>
          <div className="panel-form-row">
            <div className="cinfo-field">
              <label className="cinfo-label">Instagram</label>
              <input className="cinfo-input" type="text" value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="https://instagram.com/…" maxLength={140} />
            </div>
            <div className="cinfo-field">
              <label className="cinfo-label">Facebook</label>
              <input className="cinfo-input" type="text" value={form.facebook} onChange={(e) => set("facebook", e.target.value)} placeholder="https://facebook.com/…" maxLength={140} />
            </div>
          </div>
          <div className="cinfo-field">
            <label className="cinfo-label">Mapa (URL embed de Google Maps)</label>
            <input className="cinfo-input" type="text" value={form.map_embed_url} onChange={(e) => set("map_embed_url", e.target.value)} placeholder="https://www.google.com/maps/embed?pb=…" maxLength={500} />
          </div>
        </div>

        <div className="store-editor-actions">
          <button type="button" className="store-wizard-back" onClick={onClose}>Cancelar</button>
          <button type="button" className="store-wizard-next" onClick={save} disabled={saving || uploading}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}