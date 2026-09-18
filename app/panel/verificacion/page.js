"use client";

import { useEffect, useState } from "react";
import PanelLayout, { useMyBisne } from "../PanelLayout";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useApp } from "@/context/AppContext";
import Icon from "@/components/Icon";

export default function PanelVerificacionPage() {
  const bisne = useMyBisne();
  const { showToast } = useApp();
  const [request, setRequest] = useState(undefined); // undefined cargando
  const [contact, setContact] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!bisne || !isSupabaseConfigured()) return;
    let active = true;
    const supabase = createClient();
    supabase
      .from("verification_requests")
      .select("*")
      .eq("bisne_id", bisne.id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setRequest((prev) => prev ?? (data || null));
      });
    return () => {
      active = false;
    };
  }, [bisne]);

  if (bisne === undefined || bisne === null || request === undefined) {
    return <PanelLayout title="Verificación"><div className="panel-skeleton" aria-busy="true" /></PanelLayout>;
  }

  const submit = async () => {
    if (!contact.trim()) {
      showToast("Escribe un correo o teléfono de contacto", "warning");
      return;
    }
    setSending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("verification_requests").insert({
        bisne_id: bisne.id,
        status: "pending",
      });
      if (error) throw error;
      const { error: upErr } = await supabase
        .from("bisnes")
        .update({ verification_requested: true })
        .eq("id", bisne.id);
      if (upErr) throw upErr;
      setRequest({ status: "pending", submitted_at: new Date().toISOString() });
      showToast("Solicitud enviada. Te contactaremos pronto.");
    } catch (e) {
      console.error("Error solicitando verificación:", e);
      showToast("No se pudo enviar la solicitud", "warning");
    } finally {
      setSending(false);
    }
  };

  return (
    <PanelLayout title="Verificación" subtitle="Obtén el badge de tienda verificada">
      {bisne.verified ? (
        <div className="panel-verify-card verified">
          <span className="panel-verify-badge"><Icon name="check" size={18} /></span>
          <h2>¡Tu tienda está verificada!</h2>
          <p>
            El badge azul de verificación aparece junto al nombre de tu tienda en todo el
            marketplace: portada, explorar y resultados.
          </p>
        </div>
      ) : request?.status === "pending" ? (
        <div className="panel-verify-card pending">
          <span className="panel-verify-badge pending"><Icon name="clock" size={18} /></span>
          <h2>Solicitud en revisión</h2>
          <p>
            Enviaste tu solicitud el{" "}
            {new Date(request.submitted_at).toLocaleDateString("es", { day: "numeric", month: "long" })}.
            El equipo de elBisne la revisará y te contactará.
          </p>
        </div>
      ) : (
        <div className="panel-verify-card">
          <span className="panel-verify-badge"><Icon name="shield" size={18} /></span>
          <h2>Verifica tu tienda</h2>
          <p>
            El badge de verificación genera confianza: los compradores saben que tu tienda es
            real y activa. Revisamos que tu catálogo esté completo, con imágenes propias y
            datos de contacto correctos.
          </p>
          <ul className="panel-verify-checklist">
            <li><Icon name="check" size={12} /> Logo y portada propios</li>
            <li><Icon name="check" size={12} /> Al menos 3 productos con foto</li>
            <li><Icon name="check" size={12} /> WhatsApp y dirección correctos</li>
          </ul>
          <label className="cinfo-field" style={{ marginTop: "1rem" }}>
            <span className="cinfo-label">Contacto para la revisión *</span>
            <input
              className="cinfo-input"
              type="text"
              placeholder="Correo o teléfono"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </label>
          <button type="button" className="store-wizard-next" onClick={submit} disabled={sending}>
            {sending ? "Enviando…" : "Solicitar verificación"}
          </button>
        </div>
      )}
    </PanelLayout>
  );
}
