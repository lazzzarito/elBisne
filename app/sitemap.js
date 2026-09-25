import { getAllProductIds, getStoreConfig } from "@/lib/products";
import { getAllBisneHandles } from "@/lib/store";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://elbisne.vercel.app";

export default async function sitemap() {
  const config = getStoreConfig();

  const productIds = await getAllProductIds();
  const productUrls = productIds.map((id) => ({
    url: `${baseUrl}/product/${id}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Tiendas públicas de cada Bisne (Fase 10 · SEO extendido)
  const handles = await getAllBisneHandles();
  const bisneUrls = handles.map((handle) => ({
    url: `${baseUrl}/${handle}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.9,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/tienda`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/auth`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    ...bisneUrls,
    ...productUrls,
  ];
}
