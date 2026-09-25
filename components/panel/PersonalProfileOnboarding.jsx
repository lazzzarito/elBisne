"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import Icon from "@/components/Icon";

const slugifyHandle = (v) =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);

// Onboarding del perfil personal (común): crea un bisnes type="personal".
// Productos con caducidad de 30 días, sin ofertas ni valoraciones.
export default function PersonalProfileOnboarding({ user }) {
  const router = useRouter();
  const { showToast } = useApp();
  const [form, setForm] = useState({
    name: user?.user_metadata?.full_name || "",
    handle: "",
    whatsapp: "",
  });
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const defaultName = () =>
    (user?.user_metadata?.full_name || user?.email?.split("@")[0] || "").trim();

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "¿Cómo te llamas?";
    if (!form.handle || form.handle.length < 3) errs.handle = "Elige un enlace de al menos 3 caracteres";
    if (!form.whatsapp.trim() || !/^\+?[\d\s()-]{7,}$/.test(form.whatsapp.trim()))
      errs.whatsapp = "Necesitamos tu WhatsApp para recibir pedidos";
    return errs;
  };

  const submit = async () => {
    setTouched({ name: true, handle: true, whatsapp: true });
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setError(null);
      return;
    }
    if (!isSupabaseConfigured()) return;
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: taken } = await supabase
        .from("bisnes")
        .select("handle")
        .eq("handle", form.handle)
        .maybeSingle();
      if (taken) {
        setError(`El enlace @${form.handle} ya está en uso. Prueba con otro.`);
        return;
      }
      const { data: inserted, error: insertErr } = await supabase
        .from("bisnes")
        .insert({
          owner_id: user.id,
          handle: form.handle,
          business_name: form.name.trim(),
          phone_whatsapp: form.whatsapp.trim(),
          type: "personal",
          delivery_mode: "both",
        })
        .select("id, handle, business_name, logo_url, cover_url, delivery_mode, verified, type")
        .single();
      if (insertErr) throw insertErr;
      showToast("Perfil personal creado 🎉");
      window.dispatchEvent(new Event("elbisne:my-bisne-changed"));
      router.refresh();
    } catch (e) {
      console.error("Error creando perfil personal:", e);
      setError(
        /duplicate key|unique/i.test(e.message || "")
          ? `El enlace @${form.handle} ya está en uso. Prueba con otro.`
          : "No pudimos crear tu perfil. Inténtalo de nuevo."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const errs = touched ? validate() : {};

  return (
    <section className="personal-onboard" aria-label="Crea tu perfil personal">
      <div className="personal-onboard-head">
        <span className="personal-onboard-icon"><Icon name="user" size={20} /></span>
        <div>
          <h2 className="personal-onboard-title">Publica productos gratis</h2>
          <p className="personal-onboard-sub">
            Perfil personal: solo productos, con validez de <strong>30 días</strong>.
            Sin ofertas flash ni valoraciones. Los pedidos te llegan por WhatsApp.
          </p>
        </div>
      </div>

      {error && <div className="store-wizard-error">{error}</div>}

      <div className="cinfo-field">
        <label className="cinfo-label">Tu nombre *</label>
        <input
          className={`cinfo-input${errs.name ? " error" : ""}`}
          type="text"
          placeholder={defaultName() || "Ej. María Pérez"}
          value={form.name}
          maxLength={60}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          onBlur={() => setTouched((p) => ({ ...p, name: true }))}
        />
        {errs.name && <span className="cinfo-error">{errs.name}</span>}
      </div>

      <div className="cinfo-field">
        <label className="cinfo-label">Enlace de tu perfil *</label>
        <div className="store-wizard-handle-input">
          <span className="store-wizard-handle-prefix">elbisne.app/</span>
          <input
            className={`cinfo-input${errs.handle ? " error" : ""}`}
            type="text"
            placeholder={slugifyHandle(defaultName()) || "tu-nombre"}
            value={form.handle}
            maxLength={20}
            onChange={(e) => setForm((p) => ({ ...p, handle: slugifyHandle(e.target.value) }))}
            onBlur={() => setTouched((p) => ({ ...p, handle: true }))}
          />
        </div>
        {errs.handle && <span className="cinfo-error">{errs.handle}</span>}
      </div>

      <div className="cinfo-field">
        <label className="cinfo-label">WhatsApp para recibir pedidos *</label>
        <input
          className={`cinfo-input${errs.whatsapp ? " error" : ""}`}
          type="tel"
          placeholder="Ej. +53 5 123 4567"
          value={form.whatsapp}
          onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))}
          onBlur={() => setTouched((p) => ({ ...p, whatsapp: true }))}
        />
        {errs.whatsapp && <span className="cinfo-error">{errs.whatsapp}</span>}
      </div>

      <div className="personal-onboard-actions">
        <button type="button" className="store-wizard-next" onClick={submit} disabled={submitting}>
          {submitting ? "Creando…" : "Crear mi perfil personal"}
        </button>
        <Link href="/perfil" className="store-wizard-back">
          <Icon name="arrow-left" size={14} />
          Volver a mi perfil
        </Link>
      </div>

      <p className="personal-onboard-alt">
        ¿Tienes un negocio? <Link href="/perfil">Activa una tienda completa</Link> con ofertas, reseñas y catálogo ilimitado.
      </p>
    </section>
  );
}