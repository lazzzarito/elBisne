"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/auth-errors";

export default function AuthPageClient() {
  const router = useRouter();
  const { showToast } = useApp();
  const supabaseRef = useRef(null);
  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getSupabase = () => {
    if (!supabaseRef.current) supabaseRef.current = createClient();
    return supabaseRef.current;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const sb = getSupabase();
      if (mode === "login") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) {
          setError(translateAuthError(error.message));
        } else {
          showToast("Sesión iniciada");
          router.push("/perfil");
          router.refresh();
        }
      } else {
        const { error } = await sb.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName.trim() || email.split("@")[0] } },
        });
        if (error) {
          setError(translateAuthError(error.message));
        } else {
          showToast("Revisa tu correo para confirmar tu cuenta");
          setMode("login");
        }
      }
    } catch (err) {
      setError(translateAuthError(err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const sb = getSupabase();
      const { error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setError(translateAuthError(error.message));
    } catch (err) {
      setError(translateAuthError(err.message));
      setLoading(false);
    }
  };

  if (!isSupabaseConfigured()) {
    return (
      <div className="auth-page">
        <p className="auth-back">
          <Link href="/" className="auth-back-link">
            ← Volver a Inicio
          </Link>
        </p>
        <div className="auth-card">
          <div className="auth-brand">elBisne</div>
          <p className="auth-subtitle">Inicia sesión para gestionar tu tienda</p>
          <div className="auth-notice">
            Supabase aún no está configurado. Agrega <code>NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> a <code>.env.local</code> para activar el
            registro y el inicio de sesión.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <p className="auth-back">
        <Link href="/" className="auth-back-link">
          ← Volver a Inicio
        </Link>
      </p>

      <div className="auth-card">
        <div className="auth-brand">elBisne</div>
        <p className="auth-subtitle">
          {mode === "login"
            ? "Inicia sesión para continuar"
            : "Crea tu cuenta en segundos"}
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab${mode === "login" ? " active" : ""}`}
            onClick={() => {
              setMode("login");
              setError(null);
            }}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            className={`auth-tab${mode === "signup" ? " active" : ""}`}
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
          >
            Crear cuenta
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label className="auth-field">
              <span>Nombre completo</span>
              <input
                type="text"
                className="auth-input"
                placeholder="Tu nombre"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </label>
          )}

          <label className="auth-field">
            <span>Correo electrónico</span>
            <input
              type="email"
              className="auth-input"
              placeholder="tucorreo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className="auth-field">
            <span>Contraseña</span>
            <input
              type="password"
              className="auth-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading
              ? "Procesando…"
              : mode === "login"
                ? "Iniciar sesión"
                : "Crear cuenta"}
          </button>
        </form>

        <div className="auth-divider">
          <span>o</span>
        </div>

        <button
          type="button"
          className="auth-btn-google"
          onClick={handleGoogle}
          disabled={loading}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.1 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
          </svg>
          Continuar con Google
        </button>

        <p className="auth-legal">
          Al continuar aceptas los términos de uso y la política de privacidad del sitio.
        </p>
      </div>
    </div>
  );
}