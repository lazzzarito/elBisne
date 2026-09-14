import { getAllProductIds, getStoreConfig } from "@/lib/products";

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

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...productUrls,
  ];
}
