// Traducción de errores de auth de Supabase a español (compartido entre
// AuthPageClient y el registro en pasos del PerfilClient).
export function translateAuthError(msg = "") {
  if (/invalid login credentials/i.test(msg)) return "Correo o contraseña incorrectos.";
  if (/already registered|already been registered/i.test(msg)) return "Ya existe una cuenta con ese correo.";
  if (/email not confirmed/i.test(msg)) return "Tu correo aún no está confirmado. Revisa tu bandeja de entrada.";
  if (/at least 6 characters/i.test(msg)) return "La contraseña debe tener al menos 6 caracteres.";
  if (/rate limit/i.test(msg)) return "Demasiados intentos. Espera un momento y vuelve a intentarlo.";
  if (/invalid email/i.test(msg)) return "Introduce un correo válido.";
  return msg;
}
