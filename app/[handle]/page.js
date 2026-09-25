import { notFound } from "next/navigation";
import { getAllBisneHandles, getBisneByHandle } from "@/lib/store";
import { getProducts, getStoreConfig } from "@/lib/products";
import { getCollectionsByBisne } from "@/lib/collections";
import StorePageClient from "../b/[handle]/StorePageClient";

export const revalidate = 60;

export async function generateStaticParams() {
  const handles = await getAllBisneHandles();
  return handles.map((handle) => ({ handle }));
}

export async function generateMetadata({ params }) {
  const { handle } = await params;
  const bisne = await getBisneByHandle(handle);
  if (!bisne) return { title: "Tienda no encontrada | elBisne" };
  return {
    title: `${bisne.business_name} | elBisne`,
    description: bisne.slogan || bisne.description || `Catálogo de ${bisne.business_name} en elBisne.`,
    openGraph: {
      title: `${bisne.business_name} | elBisne`,
      description: bisne.slogan || bisne.description || "",
      images: bisne.logoUrl ? [{ url: bisne.logoUrl }] : undefined,
    },
  };
}

// Página pública de tienda en la raíz (UI_UX.md §4.6):/{handle}
// El antiguo prefijo /b/{handle} redirige aquí (301).
export default async function StorePage({ params }) {
  const { handle } = await params;
  const [bisne, allProducts, baseStoreConfig] = await Promise.all([
    getBisneByHandle(handle),
    getProducts(),
    getStoreConfig(),
  ]);

  if (!bisne) notFound();

  // Banner fijable por el dueño (oferta | mapa | imagen) — UI_UX.md §2
  const pinnedBanner = bisne.pinnedBanner || null;

  const products = allProducts.filter((p) => p.bisneId === bisne.id);
  const collections = await getCollectionsByBisne(bisne.id);
  const banners = (Array.isArray(bisne.banners) ? bisne.banners : [])
    .filter((b) => b && b.image_url)
    .slice(0, 5);

  // ── storeConfig por tienda: base del marketplace + datos del bisne ──
  const promoPairs = (baseStoreConfig.promoLinks || []).map((link, i) => ({
    link,
    banner: (baseStoreConfig.promoBanners || [])[i] || null,
    hasMatch: link.type === "promo" ? products.some((p) => p.promo === link.target) : products.some((p) => p.id === link.target),
  })).filter((p) => p.hasMatch);

  const storeConfig = {
    ...baseStoreConfig,
    name: bisne.business_name,
    logoUrl: bisne.logoUrl || baseStoreConfig.logoUrl,
    location: bisne.address || baseStoreConfig.location,
    whatsappNumber: bisne.phoneWhatsapp || baseStoreConfig.whatsappNumber,
    currency: {
      ...(baseStoreConfig.currency || {}),
      code: bisne.currencyCode || baseStoreConfig.currency?.code || "USD",
      symbol: bisne.currencySymbol || baseStoreConfig.currency?.symbol || "$",
    },
    messaging: {
      defaultChannel: "whatsapp",
      channels: {
        whatsapp: { enabled: true, number: bisne.phoneWhatsapp || baseStoreConfig.whatsappNumber },
      },
    },
    delivery: { mode: bisne.deliveryMode || "both" },
    socialLinks: { ...baseStoreConfig.socialLinks, ...(bisne.socialLinks || {}) },
    mapEmbedUrl: bisne.mapEmbedUrl || baseStoreConfig.mapEmbedUrl,
    googleMapsUrl: baseStoreConfig.googleMapsUrl || "#",
    businessHours: bisne.hours || baseStoreConfig.businessHours,
    promoBanners: promoPairs.map((p) => p.banner).filter(Boolean),
    promoLinks: promoPairs.map((p) => p.link),
  };

  return (
    <StorePageClient
      bisne={{ ...bisne, description: bisne.description || "", pinnedBanner, banners }}
      initialProducts={products}
      initialCollections={collections}
      storeConfig={storeConfig}
    />
  );
}