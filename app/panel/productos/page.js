"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PanelLayout, { useMyBisne } from "../PanelLayout";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useApp } from "@/context/AppContext";
import SafeImage from "@/components/SafeImage";
import Icon from "@/components/Icon";

const emptyForm = {
  name: "",
  description: "",
  price: "",
  original_price: "",
  stock: "",
  status: "available",
  featured: false,
  offer: false,
  images: [],
};

function ProductForm({ bisneId, product, categories, onSaved, onCancel }) {
  const { showToast } = useApp();
  const [form, setForm] = useState(
    product
      ? {
          name: product.name || "",
          description: product.description || "",
          price: product.price ?? "",
          original_price: product.original_price ?? "",
          stock: product.stock ?? "",
          status: product.status || "available",
          featured: !!product.featured,
          offer: !!product.offer,
          images: Array.isArray(product.images) ? product.images : [],
        }
      : emptyForm
  );
  const [categoryId, setCategoryId] = useState(product?.category_id || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleUpload = async (files) => {
    if (!files?.length || !isSupabaseConfigured()) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const urls = [];
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          showToast(`${file.name} supera 5 MB`, "warning");
          continue;
        }
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `products/${bisneId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage
          .from("product-images")
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        if (data?.publicUrl) urls.push(data.publicUrl);
      }
      if (urls.length) set("images", [...form.images, ...urls]);
    } catch (e) {
      console.error("Error subiendo imágenes:", e);
      showToast("No se pudieron subir las imágenes", "warning");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || form.price === "" || Number.isNaN(Number(form.price))) {
      showToast("Nombre y precio son obligatorios", "warning");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const row = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        original_price: form.original_price === "" ? null : Number(form.original_price),
        stock: form.stock === "" ? null : Number(form.stock),
        status: form.status,
        featured: form.featured,
        offer: !!form.original_price && Number(form.original_price) > Number(form.price),
        images: form.images,
        category_id: categoryId || null,
      };

      if (product) {
        const { error } = await supabase.from("products").update(row).eq("id", product.id);
        if (error) throw error;
        showToast("Producto actualizado");
      } else {
        const { error } = await supabase.from("products").insert({ ...row, bisne_id: bisneId });
        if (error) throw error;
        showToast("Producto creado");
      }
      onSaved();
    } catch (err) {
      console.error("Error guardando producto:", err);
      showToast("No se pudo guardar el producto", "warning");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel-form-overlay" onClick={onCancel}>
      <form className="panel-form" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 className="panel-form-title">{product ? "Editar producto" : "Nuevo producto"}</h2>

        <div className="cinfo-field">
          <label className="cinfo-label">Nombre *</label>
          <input className="cinfo-input" type="text" value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={100} />
        </div>

        <div className="cinfo-field">
          <label className="cinfo-label">Descripción</label>
          <textarea className="cinfo-input" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={500} />
        </div>

        <div className="panel-form-row">
          <div className="cinfo-field">
            <label className="cinfo-label">Precio USD *</label>
            <input className="cinfo-input" type="number" min="0" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} />
          </div>
          <div className="cinfo-field">
            <label className="cinfo-label">Precio anterior</label>
            <input className="cinfo-input" type="number" min="0" step="0.01" value={form.original_price} onChange={(e) => set("original_price", e.target.value)} placeholder="Para ofertas" />
          </div>
        </div>

        <div className="panel-form-row">
          <div className="cinfo-field">
            <label className="cinfo-label">Stock</label>
            <input className="cinfo-input" type="number" min="0" value={form.stock} onChange={(e) => set("stock", e.target.value)} placeholder="∞ si vacío" />
          </div>
          <div className="cinfo-field">
            <label className="cinfo-label">Estado</label>
            <select className="cinfo-input" value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="available">Disponible</option>
              <option value="coming_soon">Próximamente</option>
              <option value="out_of_stock">Agotado</option>
            </select>
          </div>
        </div>

        <div className="cinfo-field">
          <label className="cinfo-label">Categoría</label>
          <select className="cinfo-input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="cinfo-field">
          <label className="cinfo-label">Imágenes</label>
          <label className="panel-upload-zone">
            <input type="file" accept="image/*" multiple onChange={(e) => handleUpload(e.target.files)} disabled={uploading} />
            {uploading ? "Subiendo…" : <span><Icon name="plus" size={14} /> Añadir imágenes (máx. 5 MB)</span>}
          </label>
          {form.images.length > 0 && (
            <div className="panel-form-images">
              {form.images.map((url) => (
                <div key={url} className="panel-form-image">
                  <SafeImage src={url} alt="" width={56} height={56} className="panel-form-image-img" />
                  <button
                    type="button"
                    className="panel-form-image-remove"
                    onClick={() => set("images", form.images.filter((u) => u !== url))}
                    aria-label="Quitar imagen"
                  >
                    <Icon name="close" size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel-form-checks">
          <label className="cinfo-chip">
            <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} />
            Destacado
          </label>
        </div>

        <div className="panel-form-actions">
          <button type="button" className="store-wizard-back" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="store-wizard-next" disabled={saving || uploading}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ProductosInner() {
  const bisne = useMyBisne();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useApp();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | {} | product
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    if (!bisne || !isSupabaseConfigured()) return;
    const supabase = createClient();
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase.from("products").select("*").eq("bisne_id", bisne.id).order("created_at", { ascending: false }),
      supabase.from("categories").select("id, name").order("name"),
    ]);
    setProducts(prods || []);
    setCategories(cats || []);
    setLoading(false);
  }, [bisne]);

  useEffect(() => {
    if (!bisne || !isSupabaseConfigured()) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const [{ data: prods }, { data: cats }] = await Promise.all([
        supabase.from("products").select("*").eq("bisne_id", bisne.id).order("created_at", { ascending: false }),
        supabase.from("categories").select("id, name").order("name"),
      ]);
      if (!cancelled) {
        setProducts(prods || []);
        setCategories(cats || []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bisne]);

  // Abrir formulario si viene de la acción rápida "Añadir producto" (derivado en render)
  const [openedFromQuery, setOpenedFromQuery] = useState(false);
  if (!openedFromQuery && searchParams.get("nuevo") === "1" && bisne) {
    setOpenedFromQuery(true);
    setEditing({});
    router.replace("/panel/productos");
  }

  const remove = useCallback(async (product) => {
    if (!confirm(`¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(product.id);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("products").delete().eq("id", product.id);
      if (error) throw error;
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      showToast("Producto eliminado");
    } catch (e) {
      console.error("Error eliminando producto:", e);
      showToast("No se pudo eliminar", "warning");
    } finally {
      setDeletingId(null);
    }
  }, [showToast]);

  if (bisne === undefined || bisne === null) {
    return <PanelLayout title="Productos"><div className="panel-skeleton" aria-busy="true" /></PanelLayout>;
  }

  return (
    <PanelLayout
      title="Productos"
      subtitle={`${products.length} publicados`}
      actions={
        <button type="button" className="panel-btn-primary" onClick={() => setEditing({})}>
          <Icon name="plus" size={13} /> Nuevo
        </button>
      }
    >
      {loading ? (
        <div className="panel-skeleton" aria-busy="true">
          <div className="perfil-skeleton-line" style={{ width: "85%" }} />
          <div className="perfil-skeleton-line" style={{ width: "70%" }} />
        </div>
      ) : products.length === 0 ? (
        <div className="panel-empty">
          <p>Publica tu primer producto para empezar a vender.</p>
          <button type="button" className="panel-btn-primary" onClick={() => setEditing({})}>
            <Icon name="plus" size={13} /> Crear producto
          </button>
        </div>
      ) : (
        <div className="panel-products-list">
          {products.map((p) => (
            <div key={p.id} className="panel-product-row">
              <div className="panel-product-img">
                <SafeImage src={(Array.isArray(p.images) && p.images[0]) || "/images/placeholder.svg"} alt={p.name} width={52} height={52} className="panel-product-img-img" />
              </div>
              <div className="panel-product-info">
                <strong className="panel-product-name">{p.name}</strong>
                <span className="panel-product-meta">
                  ${Number(p.price).toFixed(2)}
                  {p.stock != null && ` · stock ${p.stock}`}
                  {p.featured && " · ⭐ destacado"}
                  {p.status !== "available" && ` · ${p.status === "coming_soon" ? "próximamente" : "agotado"}`}
                </span>
              </div>
              <div className="panel-product-actions">
                <button type="button" className="panel-icon-btn" onClick={() => setEditing(p)} title="Editar">
                  <Icon name="info" size={14} />
                </button>
                <button type="button" className="panel-icon-btn danger" onClick={() => remove(p)} disabled={deletingId === p.id} title="Eliminar">
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing !== null && (
        <ProductForm
          bisneId={bisne.id}
          product={editing.id ? editing : null}
          categories={categories}
          onSaved={() => {
            setEditing(null);
            load();
          }}
          onCancel={() => setEditing(null)}
        />
      )}
    </PanelLayout>
  );
}

export default function PanelProductosPage() {
  return (
    <Suspense fallback={<div className="panel-page"><div className="panel-skeleton" aria-busy="true" /></div>}>
      <ProductosInner />
    </Suspense>
  );
}
