import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

// Sube una imagen al bucket dado y devuelve su URL pública. Usado por los
// editores inline (banners, colecciones, tienda, productos).
export async function uploadImage(file, folder = "products") {
  if (!file || !isSupabaseConfigured()) return null;
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("La imagen supera los 5 MB");
  }
  const supabase = createClient();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `upload/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data?.publicUrl || null;
}