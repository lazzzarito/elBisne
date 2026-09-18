"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import Icon from "@/components/Icon";
import SafeImage from "@/components/SafeImage";

// Emails del equipo elBisne (configurable por env pública)
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export default function AdminPage() {
  const { user, isLoggedIn, authLoading, showToast } = useApp();
  const [pending, setPending] = useState([]);
  const [bisnes, setBisnes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);

  const isAdmin = isLoggedIn && user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

  const load = useCallback(async () => {
    if (!isAdmin || !isSupabaseConfigured()) return;
    setLoading(true);
    const supabase = createClient();
    const { data: bisnesData } = await supabase
      .from("bisnes")
      .select("id, handle, business_name, logo_url, verified, verification_requested, suspended")
      .order("created_at", { ascending: false });
    setBisnes(bisnesData || []);
    setPending([]);
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || !isSupabaseConfigured()) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: bisnesData } = await supabase
        .from("bisnes")
        .select("id, handle, business_name, logo_url, verified, verification_requested, suspended")
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setBisnes(bisnesData || []);
        setPending([]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const setVerified = useCallback(async (bisne, verified) => {
    setActingId(bisne.id);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("bisnes").update({ verified }).eq("id", bisne.id);
      if (error) throw error;
      setBisnes((prev) => prev.map((b) => (b.id === bisne.id ? { ...b, verified } : b)));
      showToast(verified ? `${bisne.business_name} verificada` : `Verificación retirada a ${bisne.business_name}`);
    } catch (e) {
      console.error("Error cambiando verificación:", e);
      showToast("Sin permisos para moderar (usa service_role desde el dashboard)", "warning");
    } finally {
      setActingId(null);
    }
  }, [showToast]);

  const setSuspended = useCallback(async (bisne, suspended) => {
    setActingId(bisne.id);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("bisnes").update({ suspended }).eq("id", bisne.id);
      if (error) throw error;
      setBisnes((prev) => prev.map((b) => (b.id === bisne.id ? { ...b, suspended } : b)));
      showToast(suspended ? "Tienda suspendida" : "Tienda reactivada");
    } catch (e) {
      console.error("Error cambiando suspensión:", e);
      showToast("Sin permisos para moderar (usa service_role desde el dashboard)", "warning");
    } finally {
      setActingId(null);
    }
  }, [showToast]);

  if (authLoading) {
    return (
      <main className="admin-page" id="main-content">
        <div className="panel-skeleton" aria-busy="true" />
      </main>
    );
  }

  if (!isLoggedIn || !isAdmin) {
    return (
      <main className="admin-page" id="main-content">
        <div className="perfil-guest-card">
          <div className="perfil-guest-icon"><Icon name="shield" size={28} /></div>
          <h1>Admin</h1>
          <p>Esta área es solo para el equipo de elBisne.</p>
          {!isLoggedIn ? (
            <Link href="/auth" className="perfil-guest-cta">Iniciar sesión</Link>
          ) : (
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Tu cuenta ({user?.email}) no está en la lista de administradores
              (<code>NEXT_PUBLIC_ADMIN_EMAILS</code>).
            </p>
          )}
        </div>
      </main>
    );
  }

  const pendingRequests = bisnes.filter((b) => b.verification_requested && !b.verified);

  return (
    <main className="admin-page" id="main-content">
      <header className="notif-header">
        <h1>Moderación</h1>
        <span className="admin-chip">{bisnes.length} tiendas</span>
      </header>

      {/* Solicitudes de verificación pendientes */}
      <section className="admin-section">
        <h2 className="panel-section-title">
          Verificaciones pendientes
          <span className="perfil-section-count">{pendingRequests.length}</span>
        </h2>
        {pendingRequests.length === 0 ? (
          <div className="panel-empty"><p>No hay solicitudes pendientes.</p></div>
        ) : (
          <div className="admin-bisne-list">
            {pendingRequests.map((b) => (
              <div key={b.id} className="admin-bisne-row">
                <div className="admin-bisne-logo">
                  {b.logo_url ? (
                    <SafeImage src={b.logo_url} alt="" width={36} height={36} className="admin-bisne-logo-img" />
                  ) : (
                    <span>{(b.business_name || "B").charAt(0)}</span>
                  )}
                </div>
                <div className="admin-bisne-info">
                  <strong>{b.business_name}</strong>
                  <span>/b/{b.handle}</span>
                </div>
                <div className="admin-bisne-actions">
                  <button
                    type="button"
                    className="panel-btn-primary"
                    onClick={() => setVerified(b, true)}
                    disabled={actingId === b.id}
                  >
                    <Icon name="check" size={12} /> Verificar
                  </button>
                  <Link href={`/b/${b.handle}`} className="panel-btn-secondary">Revisar</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Todas las tiendas */}
      <section className="admin-section">
        <h2 className="panel-section-title">Todas las tiendas</h2>
        {loading ? (
          <div className="panel-skeleton" aria-busy="true" />
        ) : (
          <div className="admin-bisne-list">
            {bisnes.map((b) => (
              <div key={b.id} className="admin-bisne-row">
                <div className="admin-bisne-logo">
                  {b.logo_url ? (
                    <SafeImage src={b.logo_url} alt="" width={36} height={36} className="admin-bisne-logo-img" />
                  ) : (
                    <span>{(b.business_name || "B").charAt(0)}</span>
                  )}
                </div>
                <div className="admin-bisne-info">
                  <strong>
                    {b.business_name}
                    {b.verified && <span className="business-verified-badge" title="Verificada"><Icon name="check" size={11} /></span>}
                    {b.suspended && <span className="admin-suspended-chip">Suspendida</span>}
                  </strong>
                  <span>/b/{b.handle}</span>
                </div>
                <div className="admin-bisne-actions">
                  <button
                    type="button"
                    className="panel-btn-secondary"
                    onClick={() => setSuspended(b, !b.suspended)}
                    disabled={actingId === b.id}
                  >
                    {b.suspended ? "Reactivar" : "Suspender"}
                  </button>
                  {b.verified && (
                    <button
                      type="button"
                      className="panel-btn-secondary danger"
                      onClick={() => setVerified(b, false)}
                      disabled={actingId === b.id}
                    >
                      Quitar ✓
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="admin-note">
        <Icon name="info" size={13} /> Las acciones de moderación requieren policies de admin en la
        base (o se aplican desde el dashboard de Supabase con service_role).
      </p>
    </main>
  );
}
