"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/upload";
import { useApp } from "@/context/AppContext";
import { useHistoryPopup } from "@/lib/use-history-popup";
import Icon from "@/components/Icon";

const MAX_BANNERS = 5;
const MAX_PINNED = 2;
const uid = () => globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 10);

// Editor de banners (hasta 5) + colecciones fijadas (hasta 2)
export default function BannersEditor({ bisneId, banners = [], collections = [], products = [], onSaved, onClose }) {
  const { showToast } = useApp();
  const [items, setItems] = useState(() =>
    (banners || []).map((b) => ({ id: b.id || uid(), image_url: b.image_url || "", title: b.title || "", link_type: b.link_type || "product", target_id: b.target_id || "" }))
  );
  const [pinnedIds, setPinnedIds] = useState((collections || []).filter((c) => c.pinned).map((c) => c.id).slice(0, MAX_PINNED));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useHistoryPopup(true, onClose);

  const patch = (id, p) => setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...p } : it)));

  const handleImage = async (id, file) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, "banners");
      if (url) patch(id, { image_url: url });
    } catch (e) {
      showToast(e.message || "No se pudo subir la imagen", "warning");
    } finally {
      setUploading(false);
    }
  };

  const togglePin = (cid) => {
    setPinnedIds((prev) => {
      if (prev.includes(cid)) return prev.filter((x) => x !== cid);
      if (prev.length >= MAX_PINNED) {
        showToast(`Máximo ${MAX_PINNED} colecciones fijadas`, "warning");
        return prev;
      }
      return [...prev, cid];
    });
  };

  const save = async () => {
    if (!bisneId || !isSupabaseConfigured()) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const clean = items.filter((it) => it.image_url).slice(0, MAX_BANNERS);
      const { error } = await supabase.from("bisnes").update({ banners: clean }).eq("id", bisneId);
      if (error) throw error;
      await Promise.all(
        (collections || []).map((c) =>
          supabase.from("collections").update({ pinned: pinnedIds.includes(c.id) }).eq("id", c.id)
        )
      );
      showToast("Banners actualizados");
      onSaved?.();
      onClose?.();
    } catch (e) {
      console.error("Error guardando banners:", e);
      showToast("No se pudieron guardar los banners", "warning");
    } finally {
      setSaving(false);
    }
  };

  const productOptions = products.map((p) => ({ value: p.id, label: p.name }));
  const collectionOptions = collections.map((c) => ({ value: c.id, label: c.title }));

  return (
    <div className="store-editor-overlay" onClick={onClose}>
      <div className="store-editor" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Editar banners">
        <div className="store-editor-header">
          <h2 className="store-editor-title">Banners y destacados</h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar"><Icon name="close" size={20} /></button>
        </div>

        <div className="store-editor-scroll">
          <p className="store-editor-hint">
            Slider de hasta {MAX_BANNERS} banners. Cada banner abre un producto o una colección. Elige hasta {MAX_PINNED} colecciones fijadas para el encabezado.
          </p>

          <div className="store-editor-block">
            <strong className="store-editor-label">Banners ({items.length}/{MAX_BANNERS})</strong>
            {items.map((it, i) => (
              <div key={it.id} className="banner-editor-row">
                <div className="banner-editor-order">{i + 1}</div>
                <div className="banner-editor-img">
                  {it.image_url ? (
                    <Image src={it.image_url} alt="" width={72} height={72} className="banner-editor-img-photo" />
                  ) : (
                    <span className="banner-editor-img-ph"><Icon name="image" size={18} /></span>
                  )}
                  <label className="banner-editor-upload">
                    <input type="file" accept="image/*" onChange={(e) => handleImage(it.id, e.target.files?.[0])} disabled={uploading} />
                    {uploading ? "…" : "Subir"}
                  </label>
                </div>
                <div className="banner-editor-fields">
                  <input className="cinfo-input" type="text" value={it.title} onChange={(e) => patch(it.id, { title: e.target.value })} placeholder="Texto del banner (opcional)" maxLength={80} />
                  <div className="banner-editor-rowline">
                    <select className="cinfo-input" value={it.link_type} onChange={(e) => patch(it.id, { link_type: e.target.value, target_id: "" })}>
                      <option value="product">Abrir producto</option>
                      <option value="collection">Abrir colección</option>
                    </select>
                    <select className="cinfo-input" value={it.target_id} onChange={(e) => patch(it.id, { target_id: e.target.value })}>
                      <option value="">Selecciona…</option>
                      {(it.link_type === "product" ? productOptions : collectionOptions).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button type="button" className="banner-editor-remove" onClick={() => setItems((prev) => prev.filter((x) => x.id !== it.id))} aria-label="Quitar banner">
                  <Icon name="trash" size={15} />
                </button>
              </div>
            ))}
            <button type="button" className="store-editor-add" onClick={() => setItems((prev) => (prev.length >= MAX_BANNERS ? prev : [...prev, { id: uid(), image_url: "", title: "", link_type: "product", target_id: "" }]))} disabled={items.length >= MAX_BANNERS}>
              <Icon name="plus" size={14} /> Nuevo banner
            </button>
          </div>

          {collections.length > 0 && (
            <div className="store-editor-block">
              <strong className="store-editor-label">Colecciones fijadas ({pinnedIds.length}/{MAX_PINNED})</strong>
              <div className="store-wizard-chips">
                {collections.map((c) => (
                  <label key={c.id} className={`cinfo-chip${pinnedIds.includes(c.id) ? " active" : ""}`}>
                    <input type="checkbox" checked={pinnedIds.includes(c.id)} onChange={() => togglePin(c.id)} />
                    {c.title}
                  </label>
                ))}
              </div>
            </div>
          )}
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