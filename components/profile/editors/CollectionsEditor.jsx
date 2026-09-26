"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/upload";
import { useApp } from "@/context/AppContext";
import { useHistoryPopup } from "@/lib/use-history-popup";
import Icon from "@/components/Icon";

const emptyForm = { title: "", bio: "", price: "", image_url: "", pinned: false, productIds: [] };

// Editor de colecciones/combos: listado + formulario + picker de productos
export default function CollectionsEditor({ bisneId, collections = [], products = [], onSaved, onClose }) {
  const { showToast } = useApp();
  const [form, setForm] = useState(null); // null = listado; object = formulario
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useHistoryPopup(true, onClose);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleProduct = (pid) =>
    set("productIds", (prev) => (prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]));

  const startEdit = (c) =>
    setForm({
      id: c.id,
      title: c.title,
      bio: c.bio || "",
      price: c.price,
      image_url: c.imageUrl || "",
      pinned: !!c.pinned,
      productIds: (c.products || []).map((p) => p.dbId || p.id),
    });

  const handleImage = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, "collections");
      if (url) set("image_url", url);
    } catch (e) {
      showToast(e.message || "No se pudo subir la imagen", "warning");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!bisneId || !isSupabaseConfigured() || !form?.title.trim()) {
      showToast("El título es obligatorio", "warning");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const row = {
        title: form.title.trim(),
        bio: form.bio.trim() || null,
        price: form.price === "" ? 0 : Number(form.price),
        image_url: form.image_url || null,
        pinned: !!form.pinned,
      };
      let collectionId = form.id;
      if (form.id) {
        const { error } = await supabase.from("collections").update(row).eq("id", form.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("collections")
          .insert({ ...row, bisne_id: bisneId, position: collections.length })
          .select("id")
          .single();
        if (error) throw error;
        collectionId = data.id;
      }
      await supabase.from("collection_items").delete().eq("collection_id", collectionId);
      if (form.productIds.length > 0) {
        const { error } = await supabase.from("collection_items").insert(
          form.productIds.map((pid, i) => ({ collection_id: collectionId, product_id: pid, position: i }))
        );
        if (error) throw error;
      }
      showToast(form.id ? "Colección guardada" : "Colección creada");
      setForm(null);
      onSaved?.();
    } catch (e) {
      console.error("Error guardando colección:", e);
      showToast("No se pudo guardar la colección", "warning");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c) => {
    if (!isSupabaseConfigured() || !confirm(`¿Eliminar "${c.title}"?`)) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from("collections").delete().eq("id", c.id);
      if (error) throw error;
      showToast("Colección eliminada");
      onSaved?.();
    } catch (e) {
      console.error("Error eliminando colección:", e);
      showToast("No se pudo eliminar", "warning");
    }
  };

  return (
    <div className="store-editor-overlay" onClick={onClose}>
      <div className="store-editor" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Editar colecciones">
        <div className="store-editor-header">
          <h2 className="store-editor-title">
            {form ? (form.id ? "Editar colección" : "Nueva colección") : "Colecciones y Combos"}
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar"><Icon name="close" size={20} /></button>
        </div>

        {!form ? (
          <div className="store-editor-scroll">
            <p className="store-editor-hint">
              Un combo agrupa productos a un precio fijo y se compra como un solo ítem. Los productos dentro descuentan su stock al venderlo.
            </p>
            {collections.length === 0 && (
              <p className="store-editor-none">Aún no tienes colecciones. Crea la primera.</p>
            )}
            <div className="collection-edit-list">
              {collections.map((c) => (
                <div key={c.id} className="collection-edit-row">
                  <div className="collection-edit-img">
                    {c.imageUrl || c.products[0]?.image ? (
                      <Image src={c.imageUrl || c.products[0].image} alt="" width={44} height={44} className="collection-edit-photo" />
                    ) : (
                      <span className="collection-edit-ph"><Icon name="layers" size={16} /></span>
                    )}
                  </div>
                  <div className="collection-edit-info">
                    <strong>{c.title}</strong>
                    <span>
                      {c.products.length} producto{c.products.length === 1 ? "" : "s"} · ${Number(c.price || 0).toFixed(2)}
                      {c.pinned && " · fijada"}
                    </span>
                  </div>
                  <div className="collection-edit-actions">
                    <button type="button" className="icon-btn" onClick={() => startEdit(c)} title="Editar"><Icon name="edit" size={15} /></button>
                    <button type="button" className="icon-btn" onClick={() => remove(c)} title="Eliminar"><Icon name="trash" size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="store-editor-add" onClick={() => setForm({ ...emptyForm, title: "", bio: "", price: "", image_url: "", pinned: false, productIds: [] })}>
              <Icon name="plus" size={14} /> Nueva colección
            </button>
          </div>
        ) : (
          <div className="store-editor-scroll">
            <div className="cinfo-field">
              <label className="cinfo-label">Nombre *</label>
              <input className="cinfo-input" type="text" value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={80} />
            </div>
            <div className="cinfo-field">
              <label className="cinfo-label">Descripción / bio</label>
              <textarea className="cinfo-input" rows={2} value={form.bio} onChange={(e) => set("bio", e.target.value)} maxLength={200} />
            </div>
            <div className="panel-form-row">
              <div className="cinfo-field">
                <label className="cinfo-label">Precio fijo USD</label>
                <input className="cinfo-input" type="number" min="0" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="0 = gratis" />
              </div>
              <div className="cinfo-field">
                <label className="cinfo-label">Imagen</label>
                <div className="collection-form-image">
                  {form.image_url ? (
                    <Image src={form.image_url} alt="" width={56} height={56} className="collection-form-photo" />
                  ) : (
                    <span className="collection-form-ph"><Icon name="image" size={18} /></span>
                  )}
                  <label className="banner-editor-upload">
                    <input type="file" accept="image/*" onChange={(e) => handleImage(e.target.files?.[0])} disabled={uploading} />
                    {uploading ? "…" : "Subir"}
                  </label>
                </div>
              </div>
            </div>
            <label className="cinfo-chip">
              <input type="checkbox" checked={form.pinned} onChange={(e) => set("pinned", e.target.checked)} />
              Fijar en el encabezado (máx. 2 en total)
            </label>

            <div className="cinfo-field" style={{ marginTop: "1rem" }}>
              <label className="cinfo-label">Productos del combo ({form.productIds.length})</label>
              <div className="collection-product-grid">
                {products.map((p) => {
                  const pid = p.dbId || p.id;
                  const active = form.productIds.includes(pid);
                  return (
                    <button
                      key={pid}
                      type="button"
                      className={`collection-product-chip${active ? " active" : ""}`}
                      onClick={() => toggleProduct(pid)}
                    >
                      <Image src={p.image} alt="" width={28} height={28} className="collection-product-chip-img" />
                      <span>{p.name}</span>
                    </button>
                  );
                })}
                {products.length === 0 && <p className="store-editor-none">Publica productos primero para armar combos.</p>}
              </div>
            </div>
          </div>
        )}

        <div className="store-editor-actions">
          {form ? (
            <>
              <button type="button" className="store-wizard-back" onClick={() => setForm(null)}>Volver</button>
              <button type="button" className="store-wizard-next" onClick={save} disabled={saving || uploading}>
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </>
          ) : (
            <button type="button" className="store-wizard-back" onClick={onClose}>Cerrar</button>
          )}
        </div>
      </div>
    </div>
  );
}