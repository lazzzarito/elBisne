import { getProducts, getStoreConfig } from "@/lib/products";
import { getCategories, getBisnes, getSitePromos, getAdSlots } from "@/lib/feed";
import ExplorarPage from "./ExplorarPage";

export const revalidate = 60;

export async function generateMetadata() {
  return {
    title: "Explorar | elBisne",
    description: "Busca productos, explora tendencias y colecciones, y descubre bisnes cerca de ti.",
  };
}

export default async function Explorar() {
  const [products, storeConfig, categories, bisnes, sitePromos, adSlots] = await Promise.all([
    getProducts(),
    getStoreConfig(),
    getCategories(),
    getBisnes(),
    getSitePromos(),
    getAdSlots(),
  ]);

  return (
    <ExplorarPage
      initialProducts={products}
      storeConfig={storeConfig}
      categories={categories}
      bisnes={bisnes}
      sitePromos={sitePromos}
      adSlots={adSlots}
    />
  );
}