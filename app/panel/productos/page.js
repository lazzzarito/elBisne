"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PanelLayout, { useMyBisne } from "../PanelLayout";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useApp } from "@/context/AppContext";
import SafeImage from "@/components/SafeImage";
import Icon from "@/components/Icon";
import ProductForm from "@/components/panel/ProductForm";
import PersonalProfileOnboarding from "@/components/panel/PersonalProfileOnboarding";

const RENEW_MS = 30 * 24 * 60 * 60 * 1000;

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });

function ProductosInner() {
  const bisne = useMyBisne({ redirectToPerfil: false });
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, showToast } = useApp();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | {} | product
  const [deletingId, setDeletingId] = useState(null);

  const isPersonal = bisne?.type === "personal";

  const load = useCallback(async () => {
    if (!bisne || !isSupabaseConfigured()) return;
    const supabase = createClient();
    const [{ data: prods }, { data: cats }, { data: cols }] = await Promise.all([
      supabase.from("products").select("*").eq("bisne_id", bisne.id).order("created_at", { ascending: false }),
      supabase.from("categories").select("id, name, slug, group_name").order("group_name, name"),
      supabase.from("collections").select("id, title").eq("bisne_id", bisne.id).order("position"),
    ]);
    setProducts(prods || []);
    setCategories(cats || []);
    setCollections(cols || []);
    setLoading(false);
  }, [bisne]);

  useEffect(() => {
    // `load` es la carga de datos (no un setState derivado del render): el
    // lint de react-hooks marca cualquier llamada directa, pero el fetch
    // asíncrono dentro es exactamente el caso de uso legítimo del efecto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

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

  const renew = useCallback(async (product) => {
    if (!isSupabaseConfigured()) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("products")
        .update({ expires_at: new Date(Date.now() + RENEW_MS).toISOString() })
        .eq("id", product.id);
      if (error) throw error;
      showToast("Producto renovado (30 días extra)");
      load();
    } catch (e) {
      console.error("Error renovando producto:", e);
      showToast("No se pudo renovar", "warning");
    }
  }, [load, showToast]);

  if (bisne === undefined) {
    return <PanelLayout title="Productos"><div className="panel-skeleton" aria-busy="true" /></PanelLayout>;
  }

  if (bisne === null) {
    return (
      <PanelLayout title="Publica tus productos" allowNoBisne>
        <PersonalProfileOnboarding user={user} />
      </PanelLayout>
    );
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
                  {isPersonal && (
                    <>
                      {" · "}
                      {p.expires_at && new Date(p.expires_at) <= new Date() ? (
                        <span className="panel-expired-badge">caducado</span>
                      ) : p.expires_at ? (
                        <>caduca · {formatDate(p.expires_at)}</>
                      ) : (
                        "sin caducidad"
                      )}
                    </>
                  )}
                  {p.stock != null && ` · stock ${p.stock}`}
                  {p.featured && " · ⭐ destacado"}
                  {p.status !== "available" && ` · ${p.status === "coming_soon" ? "próximamente" : "agotado"}`}
                </span>
                {isPersonal && (
                  <span className="panel-product-renew">
                    <button type="button" className="panel-renew-btn" onClick={() => renew(p)} disabled={deletingId === p.id}>
                      <Icon name="clock" size={12} /> Renovar 30 días
                    </button>
                  </span>
                )}
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
          collections={collections}
          isPersonal={isPersonal}
          onSaved={() => {
            setEditing(null);
            load();
          }}
          onDeleted={() => {
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
