"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { groupCategories } from "@/lib/category-groups";
import { useApp } from "@/context/AppContext";
import SafeImage from "@/components/SafeImage";
import Icon from "@/components/Icon";

// Formulario de producto reutilizable (panel + perfil del dueño).
// Acepta tanto la fila cruda de Supabase (panel) como el producto mapeado
// del catálogo (perfil): normaliza los campos y usa dbId para actualizar.

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Categoría del producto. Una sola por producto: `products.category_id` es la
  // fuente de verdad, y `product_categories` queda como espejo de una fila por
  // compatibilidad con las consultas que aún la leen. Aceptar varias categorías
  // hacía que un mismo producto apareciera listado en grupos distintos según qué
  // consulta lo trajera.
function resolveCategoryId(product, categories) {
  if (!product) return null;
  if (product.category_id) return product.category_id;
  const fromName = (product.categories || []).find((name) =>
    (categories || []).some((x) => x.name === name)
  );
  return (categories || []).find((x) => x.name === fromName)?.id || null;
}

function initialForm(product) {
  if (!product) return emptyForm;
  return {
    name: product.name || "",
    description: product.description || "",
    price: product.price ?? product.priceUSD ?? "",
    original_price: product.original_price ?? product.originalPrice ?? "",
    stock: product.stock === Infinity ? "" : (product.stock ?? ""),
    status: product.status || "available",
    featured: !!product.featured,
    offer: !!product.offer,
    images: Array.isArray(product.images) ? product.images : [],
  };
}

export default function ProductForm({ bisneId, product, categories = [], collections = [], onSaved, onDeleted, onCancel, isPersonal = false }) {
  const { showToast } = useApp();
  const dbId = product?.dbId || (product?.id && UUID_RE.test(product.id) ? product.id : null) || null;

  const [form, setForm] = useState(() => initialForm(product));
  const [categoryId, setCategoryId] = useState(() => resolveCategoryId(product, categories));
  const [collectionIds, setCollectionIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  // Carga las colecciones a las que pertenece el producto al editar
  useEffect(() => {
    if (!product || !isSupabaseConfigured() || !dbId) return;
    let active = true;
    createClient()
      .from("collection_items")
      .select("collection_id")
      .eq("product_id", dbId)
      .then(({ data }) => {
        if (active) setCollectionIds((data || []).map((r) => r.collection_id));
      });
    return () => { active = false; };
  }, [dbId, product]);

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

  const syncCollections = async (supabase, productId) => {
    if (collections.length === 0) return;
    await supabase.from("collection_items").delete().eq("product_id", productId);
    if (collectionIds.length > 0) {
      await supabase.from("collection_items").insert(
        collectionIds.map((cid, i) => ({ collection_id: cid, product_id: productId, position: i }))
      );
    }
  };

    // Solo se guarda products.category_id (migración 018). El formulario es de
    // selección única (radio) y `submit` exige una.

  const categoriesByGroup = useMemo(() => groupCategories(categories), [categories]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || form.price === "" || Number.isNaN(Number(form.price))) {
      showToast("Nombre y precio son obligatorios", "warning");
      return;
    }
    if (!categoryId) {
      showToast("Elige una categoría", "warning");
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
        category_id: categoryId,
        // Perfiles personales: cada guardado renueva la caducidad a 30 días.
        ...(isPersonal
          ? { expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }
          : {}),
      };

      let productId = dbId;
      if (dbId) {
        const { error } = await supabase.from("products").update(row).eq("id", dbId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert({ ...row, bisne_id: bisneId })
          .select("id")
          .single();
        if (error) throw error;
        productId = data.id;
      }

      await syncCollections(supabase, productId);

      showToast(product ? "Producto actualizado" : "Producto creado");
      onSaved?.(productId);
    } catch (err) {
      console.error("Error guardando producto:", err);
      showToast("No se pudo guardar el producto", "warning");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!dbId || deleting) return;
    if (!confirm(`¿Eliminar "${form.name}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("products").delete().eq("id", dbId);
      if (error) throw error;
      showToast("Producto eliminado");
      onDeleted?.(dbId);
    } catch (err) {
      console.error("Error eliminando producto:", err);
      showToast("No se pudo eliminar", "warning");
    } finally {
      setDeleting(false);
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

        {isPersonal ? (
          <div className="panel-form-row">
            <div className="cinfo-field">
              <label className="cinfo-label">Precio USD *</label>
              <input className="cinfo-input" type="number" min="0" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} />
            </div>
            <div className="cinfo-field">
              <label className="cinfo-label">Stock</label>
              <input className="cinfo-input" type="number" min="0" value={form.stock} onChange={(e) => set("stock", e.target.value)} placeholder="∞ si vacío" />
            </div>
          </div>
        ) : (
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
        )}

        {isPersonal && (
          <p className="panel-form-note">
            <Icon name="clock" size={12} /> Perfil personal: tu producto se publica durante <strong>30 días</strong> y se renueva automáticamente al guardarlo. No admite ofertas ni colecciones.
          </p>
        )}

        <div className="panel-form-row">
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
          {Object.entries(categoriesByGroup).map(([group, items]) => (
            <div key={group} className="cat-group">
              <span className="cat-group-name">{group}</span>
              <div className="store-wizard-chips">
                {items.map((c) => {
                  const active = categoryId === c.id;
                  return (
                    <label key={c.id} className={`cinfo-chip${active ? " active" : ""}`}>
                      <input
                        type="radio"
                        name="product-category"
                        checked={active}
                        onChange={() => setCategoryId(c.id)}
                      />
                      {c.name}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {!isPersonal && collections.length > 0 && (
          <div className="cinfo-field">
            <label className="cinfo-label">Colecciones / Combos</label>
            <div className="store-wizard-chips">
              {collections.map((col) => {
                const active = collectionIds.includes(col.id);
                return (
                  <label key={col.id} className={`cinfo-chip${active ? " active" : ""}`}>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() =>
                        setCollectionIds((prev) =>
                          prev.includes(col.id) ? prev.filter((id) => id !== col.id) : [...prev, col.id]
                        )
                      }
                    />
                    {col.title}
                  </label>
                );
              })}
            </div>
          </div>
        )}

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
          {dbId && (
            <button type="button" className="store-wizard-back danger" onClick={remove} disabled={deleting}>
              {deleting ? "Eliminando…" : "Eliminar"}
            </button>
          )}
          <button type="button" className="store-wizard-back" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="store-wizard-next" disabled={saving || uploading}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
