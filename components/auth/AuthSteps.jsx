"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/auth-errors";
import Icon from "@/components/Icon";

// ── Registro en pasos (UI_UX.md §2 · dos rutas: comprador y bisne) ───────
// Vive en /perfil (sin sesión) y en el popup global de perfil. `onDone`
// avisa al contenedor cuando la cuenta quedó creada/iniciada.
const slugifyHandle = (v) =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);

export default function AuthSteps({ onDone }) {
  const { showToast } = useApp();
  // route: null (elegir) | "user" (comprador) | "bisne" (vendedor)
  const [route, setRoute] = useState(null);
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState("signup");
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const setField = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const isBisne = route === "bisne";
  const totalSteps = isBisne ? 3 : 2;

  const validateStep = () => {
    if (step === 1) {
      if (mode === "signup" && !form.fullName.trim()) return "Cuéntanos tu nombre";
      if (!form.email.trim()) return "Necesitamos tu correo";
      if (form.password.length < 6) return "La contraseña debe tener al menos 6 caracteres";
    }
    if (isBisne && step === 2) {
      if (!form.businessName?.trim()) return "¿Cómo se llama tu tienda?";
      if (!form.handle || form.handle.length < 3) return "Elige un enlace válido (mín. 3 caracteres)";
      if (!form.whatsapp?.trim()) return "Necesitamos tu WhatsApp para recibir pedidos";
    }
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    if (step < totalSteps) setStep(step + 1);
    else finish();
  };

  const finish = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();

      // ¿Ya hay sesión? (usuario convertido a bisne después)
      const { data: sessionData } = await supabase.auth.getSession();
      let userId = sessionData?.session?.user?.id;

      if (!userId) {
        const { data, error: authErr } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: { data: { full_name: form.fullName.trim() || form.email.split("@")[0] } },
        });
        if (authErr) throw new Error(translateAuthError(authErr.message));
        userId = data?.user?.id;
        // Si el proyecto exige confirmación de email, no hay sesión aún:
        if (!userId) {
          showToast("Revisa tu correo para confirmar tu cuenta");
          onDone?.();
          return;
        }
      }

      if (isBisne) {
        // Datos del bisne (paso final reutiliza la lógica del wizard)
        const { error: bisneErr } = await supabase.from("bisnes").insert({
          owner_id: userId,
          handle: form.handle,
          business_name: form.businessName.trim(),
          slogan: form.slogan?.trim() || null,
          phone_whatsapp: form.whatsapp.trim(),
          delivery_mode: "both",
        });
        if (bisneErr) {
          if (/duplicate|unique/i.test(bisneErr.message || "")) {
            throw new Error(`El enlace @${form.handle} ya está en uso. Prueba con otro.`);
          }
          throw new Error("No pudimos crear tu tienda. Inténtalo de nuevo.");
        }
      }

      showToast(isBisne ? "¡Tu cuenta y tienda están listas! 🎉" : "¡Cuenta creada! 🎉");
      onDone?.();
    } catch (e) {
      setError(e.message || "Algo salió mal. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // Paso 0: elegir ruta
  if (!route) {
    return (
      <div className="auth-steps">
        {/* El título vive en el header del drawer (ProfileAuthModal); aquí
            repetía el mismo "Únete a elBisne" dos veces en la misma pantalla. */}
        <p className="auth-steps-sub">Elige cómo quieres empezar. Podrás cambiarlo después.</p>
        <button type="button" className="auth-route-card" onClick={() => { setRoute("user"); setMode("signup"); }}>
          <span className="auth-route-icon"><Icon name="user" size={20} /></span>
          <span>
            <strong>Comprar y descubrir</strong>
            <small>Guarda favoritos, sigue bisnes y haz pedidos.</small>
          </span>
          <Icon name="arrow-up" size={16} style={{ transform: "rotate(90deg)" }} />
        </button>
        <button type="button" className="auth-route-card" onClick={() => { setRoute("bisne"); setMode("signup"); }}>
          <span className="auth-route-icon bisne"><Icon name="shopping-bag" size={20} /></span>
          <span>
            <strong>Vender en elBisne</strong>
            <small>Crea tu tienda con catálogo y pedidos por WhatsApp.</small>
          </span>
          <Icon name="arrow-up" size={16} style={{ transform: "rotate(90deg)" }} />
        </button>
        <div className="auth-steps-login-hint">
          ¿Ya tienes cuenta?{" "}
          <button type="button" onClick={() => { setRoute("user"); setMode("login"); }}>Inicia sesión</button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-steps">
      <div className="auth-steps-progress" aria-label={`Paso ${step} de ${totalSteps}`}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span key={i} className={`auth-steps-dot${i + 1 <= step ? " active" : ""}`} />
        ))}
      </div>

      {error && <div className="auth-error">{error}</div>}

      {step === 1 && (
        <>
          {mode === "signup" && (
            <label className="cinfo-field">
              <span className="cinfo-label">Tu nombre</span>
              <input
                className="cinfo-input"
                type="text"
                placeholder="Ej. María Pérez"
                value={form.fullName}
                onChange={(e) => setField("fullName", e.target.value)}
                autoComplete="name"
              />
            </label>
          )}
          <label className="cinfo-field">
            <span className="cinfo-label">Correo electrónico</span>
            <input
              className="cinfo-input"
              type="email"
              placeholder="tucorreo@ejemplo.com"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="cinfo-field">
            <span className="cinfo-label">Contraseña</span>
            <input
              className="cinfo-input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
        </>
      )}

      {isBisne && step === 2 && (
        <>
          <label className="cinfo-field">
            <span className="cinfo-label">Nombre de tu tienda *</span>
            <input
              className="cinfo-input"
              type="text"
              placeholder="Ej. Dulces de María"
              value={form.businessName || ""}
              maxLength={60}
              onChange={(e) => setField("businessName", e.target.value)}
            />
          </label>
          <label className="cinfo-field">
            <span className="cinfo-label">Enlace de tu tienda *</span>
            <div className="store-wizard-handle-input">
              <span className="store-wizard-handle-prefix">elbisne.app/</span>
              <input
                className="cinfo-input"
                type="text"
                placeholder="dulces-maria"
                value={form.handle || ""}
                maxLength={20}
                onChange={(e) => setField("handle", slugifyHandle(e.target.value))}
              />
            </div>
          </label>
          <label className="cinfo-field">
            <span className="cinfo-label">WhatsApp de pedidos *</span>
            <input
              className="cinfo-input"
              type="tel"
              placeholder="Ej. +53 5 123 4567"
              value={form.whatsapp || ""}
              onChange={(e) => setField("whatsapp", e.target.value)}
            />
          </label>
        </>
      )}

      {isBisne && step === 3 && (
        <>
          <label className="cinfo-field">
            <span className="cinfo-label">Frase que te represente (opcional)</span>
            <input
              className="cinfo-input"
              type="text"
              placeholder="Ej. Postres caseros con entrega el mismo día"
              value={form.slogan || ""}
              maxLength={90}
              onChange={(e) => setField("slogan", e.target.value)}
            />
          </label>
          <p className="auth-steps-hint">
            Podrás personalizar el resto (categoría, portada, horario) desde tu perfil después.
          </p>
        </>
      )}

      <div className="auth-steps-actions">
        <button
          type="button"
          className="auth-steps-back"
          onClick={() => {
            setError(null);
            if (step > 1) setStep(step - 1);
            else setRoute(null);
          }}
        >
          <Icon name="arrow-left" size={14} /> Atrás
        </button>
        <button type="button" className="auth-steps-next" onClick={next} disabled={loading}>
          {loading ? "Creando…" : step < totalSteps ? "Continuar" : isBisne ? "Crear mi tienda" : "Crear cuenta"}
        </button>
      </div>
    </div>
  );
}
