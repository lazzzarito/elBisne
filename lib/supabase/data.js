import { createClient } from "@supabase/supabase-js";

export const isSupabaseConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

// Cliente de datos para LECTURA pública del catálogo (SSG/ISR).
// Usa supabase-js plano (sin cookies) para no volver dinámicos los builds.
export function createDataClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase no está configurado. Revisa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local"
    );
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );
}