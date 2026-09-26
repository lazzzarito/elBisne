"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { groupCategories, FALLBACK_GROUP } from "@/lib/category-groups";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { lockBodyScroll } from "@/lib/scroll-lock";
import { useHistoryPopup } from "@/lib/use-history-popup";
import Icon from "@/components/Icon";

const slugifyHandle = (v) =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20); // los SSG paths y el prefijo visual quedan cortos y legibles

// Solo hojas reales del catálogo. "Tecnología" y "Hogar" son títulos de grupo,
// no categorías, y por eso no pueden aparecer aquí como opciones.
const FALLBACK_CATEGORIES = [
  "Ropa de Mujer",
  "Celulares y Accesorios",
  "Muebles",
  "Alimentos y Bebidas",
  "Otros - General",
];

export default function ActivateStoreWizard({ user, storeConfig, onCreated, existing = null }) {
  const router = useRouter();
  const { showToast } = useApp();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverUploading, setCoverUploading] = useState(false);

  const [form, setForm] = useState({
    businessName: existing?.business_name || "",
    handle: existing?.handle || "",
    whatsapp: existing?.phone_whatsapp || "",
    categorySlug: "",
    slogan: existing?.slogan || "",
  });
  const [touched, setTouched] = useState({});

  // Al abrir sobre un perfil personal existente, sus datos ya quedarán
  // precargados vía el estado inicial; el key fuerza remontaje si cambia.

  // Cerrar popup con historial del navegador
  useHistoryPopup(open, () => setOpen(false));

  useEffect(() => {
    if (!open) return undefined;
    const unlock = lockBodyScroll();
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      unlock();
    };
  }, [open]);

  // Cargar categorías desde Supabase al abrir
  useEffect(() => {
    if (!open || !isSupabaseConfigured()) return;
    let active = true;
    const supabase = createClient();
    supabase
      .from("categories")
      .select("slug, name")
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (active && data && data.length > 0) {
          setCategories(data.map((c) => ({ slug: c.slug, name: c.name })));
        }
      });
    return () => {
      active = false;
    };
  }, [open]);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const errors = {};
  if (!form.businessName.trim()) errors.businessName = "¿Cómo se llama tu tienda?";
  if (!form.handle) errors.handle = "Elige un enlace para tu tienda";
  else if (form.handle.length < 3) errors.handle = "Mínimo 3 caracteres";
  if (!form.whatsapp.trim()) errors.whatsapp = "Necesitamos tu WhatsApp para recibir pedidos";
  else if (!/^\+?[\d\s()-]{7,}$/.test(form.whatsapp.trim()))
    errors.whatsapp = "Revisa el formato: ej. +53 5 123 4567";

  const step1Valid = !errors.businessName && !errors.handle && !errors.whatsapp;

  const close = () => {
    setOpen(false);
    setStep(1);
    setError(null);
  };

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("La imagen no debe superar 5 MB", "warning");
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const uploadCover = async (supabase, handle) => {
    if (!coverFile) return null;
    setCoverUploading(true);
    try {
      const ext = (coverFile.name.split(".").pop() || "jpg").toLowerCase();
      const path = `covers/${handle}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("product-images")
        .upload(path, coverFile, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
      return pub?.publicUrl || null;
    } catch (e) {
      console.error("Error subiendo portada:", e);
      showToast("No se pudo subir la portada, la tienda se crea sin ella", "warning");
      return null;
    } finally {
      setCoverUploading(false);
    }
  };

  const handleSubmit = async () => {
    setTouched({ businessName: true, handle: true, whatsapp: true });
    if (!step1Valid) {
      setStep(1);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();

      // Verificar disponibilidad del handle antes de insertar (solo al crear)
      if (!existing) {
        const { data: taken } = await supabase
          .from("bisnes")
          .select("handle")
          .eq("handle", form.handle)
          .maybeSingle();
        if (taken) {
          setError(`El enlace @${form.handle} ya está en uso. Prueba con otro.`);
          setSubmitting(false);
          return;
        }
      }

      const coverUrl = existing ? null : await uploadCover(supabase, form.handle);

      // Buscar category_id a partir del slug (opcional)
      let categoryId = null;
      if (form.categorySlug) {
        const { data: cat } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", form.categorySlug)
          .maybeSingle();
        categoryId = cat?.id || null;
      }

      let inserted;
      if (existing) {
        // Conversión: el perfil personal pasa a tienda completa (mismo handle)
        const { data: updated, error: upErr } = await supabase
          .from("bisnes")
          .update({
            business_name: form.businessName.trim(),
            slogan: form.slogan.trim() || null,
            phone_whatsapp: form.whatsapp.trim(),
            category_id: categoryId,
            type: "business",
          })
          .eq("id", existing.id)
          .select("id, handle, business_name, logo_url, cover_url, delivery_mode, verified, type")
          .single();
        if (upErr) throw upErr;
        inserted = updated;
        // Al pasar a tienda, los productos dejan de caducar
        await supabase.from("products").update({ expires_at: null }).eq("bisne_id", existing.id);
        if (coverUrl) {
          const { error: cvErr } = await supabase
            .from("bisnes")
            .update({ cover_url: coverUrl })
            .eq("id", existing.id);
          if (cvErr) throw cvErr;
        }
      } else {
        const { data: ins, error: insertErr } = await supabase
          .from("bisnes")
          .insert({
            owner_id: user.id,
            handle: form.handle,
            business_name: form.businessName.trim(),
            slogan: form.slogan.trim() || null,
            phone_whatsapp: form.whatsapp.trim(),
            category_id: categoryId,
            cover_url: coverUrl,
            delivery_mode: "both",
          })
          .select("id, handle, business_name, logo_url, cover_url, delivery_mode, verified")
          .single();
        if (insertErr) throw insertErr;
        inserted = ins;
      }

      const newBisne = {
        id: inserted.id,
        handle: inserted.handle,
        businessName: inserted.business_name,
        slogan: "",
        logoUrl: inserted.logo_url || null,
        coverUrl: inserted.cover_url || null,
        deliveryMode: inserted.delivery_mode || "both",
        verified: !!inserted.verified,
        type: inserted.type || "business",
      };

      showToast(existing ? "¡Tu perfil ahora es una tienda completa! 🎉" : "¡Tu tienda está activa! 🎉");
      window.dispatchEvent(new Event("elbisne:my-bisne-changed"));
      close();
      if (typeof onCreated === "function") onCreated(newBisne);
      // Refrescar la ruta para que el catálogo/SSG recoja la nueva tienda
      router.refresh();
    } catch (e) {
      console.error("Error activando tienda:", e);
      setError(
        /duplicate key|unique/i.test(e.message || "")
          ? `El enlace @${form.handle} ya está en uso. Prueba con otro.`
          : "No pudimos activar tu tienda. Inténtalo de nuevo."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Sin Supabase configurado no hay catálogo que agrupar: se cae a un grupo
  // único. Las hojas del respaldo son nombres reales de hoja, nunca títulos.
  const grouped = groupCategories(categories);
  const categoriesByGroup = grouped.length
    ? grouped
    : [[FALLBACK_GROUP, FALLBACK_CATEGORIES.map((name) => ({ name, slug: name, group_name: FALLBACK_GROUP }))]];

  return (
    <>
      <button type="button" className="store-wizard-cta" onClick={() => setOpen(true)}>
        <Icon name="plus" size={14} />
        Activa tu tienda
      </button>

      {open && (
        <div className="store-wizard-overlay" key={existing?.id || "wizard-new"} onClick={close}>
          <div
            className="store-wizard-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Activa tu tienda"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="store-wizard-handlebar" aria-hidden="true" />

            <button className="modal-close store-wizard-close" onClick={close} aria-label="Cerrar">
              <Icon name="close" size={20} />
            </button>

            <div className="store-wizard-scroll">
              {/* Progreso */}
              <div className="store-wizard-header">
                <h2 className="store-wizard-title">{existing ? "Convierte tu perfil en tienda" : "Activa tu tienda"}</h2>
                <div className="store-wizard-steps" aria-label={`Paso ${step} de 2`}>
                  <span className={`store-wizard-step${step >= 1 ? " active" : ""}`} />
                  <span className={`store-wizard-step${step >= 2 ? " active" : ""}`} />
                </div>
              </div>

              {error && <div className="store-wizard-error">{error}</div>}

              {step === 1 && (
                <div className="store-wizard-form">
                  <p className="store-wizard-hint">
                    Crea tu catálogo en minutos. Recibirás los pedidos directo en tu WhatsApp.
                  </p>

                  <div className="cinfo-field">
                    <label className="cinfo-label">Nombre de la tienda *</label>
                    <input
                      className={`cinfo-input${errors.businessName && touched.businessName ? " error" : ""}`}
                      type="text"
                      placeholder="Ej. Dulces de María"
                      value={form.businessName}
                      maxLength={60}
                      onChange={(e) => setField("businessName", e.target.value)}
                      onBlur={() => setTouched((p) => ({ ...p, businessName: true }))}
                    />
                    {errors.businessName && touched.businessName && (
                      <span className="cinfo-error">{errors.businessName}</span>
                    )}
                  </div>

                  <div className="cinfo-field">
                    <label className="cinfo-label">Enlace de tu tienda *</label>
                    <div className="store-wizard-handle-input">
                      <span className="store-wizard-handle-prefix">elbisne.app/</span>
                      <input
                        className={`cinfo-input${errors.handle && touched.handle ? " error" : ""}`}
                        type="text"
                        placeholder="dulces-maria"
                        value={form.handle}
                        maxLength={20}
                        disabled={Boolean(existing)}
                        onChange={(e) => setField("handle", slugifyHandle(e.target.value))}
                        onBlur={() => setTouched((p) => ({ ...p, handle: true }))}
                      />
                    </div>
                    {errors.handle && touched.handle && (
                      <span className="cinfo-error">{errors.handle}</span>
                    )}
                    {existing && (
                      <span className="cinfo-help">El enlace de tu perfil personal se mantiene.</span>
                    )}
                  </div>

                  <div className="cinfo-field">
                    <label className="cinfo-label">WhatsApp de pedidos *</label>
                    <input
                      className={`cinfo-input${errors.whatsapp && touched.whatsapp ? " error" : ""}`}
                      type="tel"
                      placeholder="Ej. +53 5 123 4567"
                      value={form.whatsapp}
                      onChange={(e) => setField("whatsapp", e.target.value)}
                      onBlur={() => setTouched((p) => ({ ...p, whatsapp: true }))}
                    />
                    {errors.whatsapp && touched.whatsapp && (
                      <span className="cinfo-error">{errors.whatsapp}</span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="store-wizard-next"
                    onClick={() => {
                      setTouched({ businessName: true, handle: true, whatsapp: true });
                      if (step1Valid) setStep(2);
                    }}
                  >
                    Continuar
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="store-wizard-form">
                  <div className="cinfo-field">
                    <label className="cinfo-label">Categoría principal</label>
                    {categoriesByGroup.map(([group, items]) => (
                      <div key={group} className="cat-group">
                        <span className="cat-group-name">{group}</span>
                        <div className="store-wizard-chips">
                          {items.map((c) => {
                            const name = c.name;
                            return (
                              <label
                                key={name}
                                className={`cinfo-chip${form.categorySlug === (c.slug || name) ? " active" : ""}`}
                              >
                                <input
                                  type="radio"
                                  name="wizard-category"
                                  value={c.slug || name}
                                  checked={form.categorySlug === (c.slug || name)}
                                  onChange={() => setField("categorySlug", c.slug || name)}
                                />
                                {name}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="cinfo-field">
                    <label className="cinfo-label">Frase que te represente (opcional)</label>
                    <input
                      className="cinfo-input"
                      type="text"
                      placeholder="Ej. Postres caseros con entrega el mismo día"
                      value={form.slogan}
                      maxLength={90}
                      onChange={(e) => setField("slogan", e.target.value)}
                    />
                  </div>

                  {!existing && (
                  <div className="cinfo-field">
                    <label className="cinfo-label">Portada (opcional)</label>
                    <label className="store-wizard-cover-picker">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverChange}
                        disabled={coverUploading}
                      />
                      {coverPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={coverPreview}
                          alt="Vista previa de la portada"
                          className="store-wizard-cover-preview"
                        />
                      ) : (
                        <span className="store-wizard-cover-empty">
                          <Icon name="plus" size={18} />
                          Añadir imagen de portada
                        </span>
                      )}
                    </label>
                    {coverFile && (
                      <button
                        type="button"
                        className="store-wizard-cover-remove"
                        onClick={() => {
                          setCoverFile(null);
                          setCoverPreview(null);
                        }}
                      >
                        Quitar portada
                      </button>
                    )}
                  </div>
                )}

                {existing && (
                  <p className="panel-form-note">
                    <Icon name="sparkles" size={12} /> Al convertir en tienda completa desbloqueas ofertas, reseñas,
                    verificación y catálogo sin caducidad. Tus productos se conservan.
                  </p>
                )}

                <div className="store-wizard-actions">
                    <button type="button" className="store-wizard-back" onClick={() => setStep(1)}>
                      <Icon name="arrow-left" size={14} />
                      Atrás
                    </button>
                    <button
                      type="button"
                      className="store-wizard-next"
                      onClick={handleSubmit}
                      disabled={submitting || coverUploading}
                    >
                      {coverUploading
                        ? "Subiendo portada…"
                        : submitting
                          ? "Activando…"
                          : existing
                            ? "Convertir en tienda completa"
                            : "Activar mi tienda"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
