import { getProducts, getStoreConfig } from "@/lib/products";
import { getCategories, getBisnes, getSitePromos, getAdSlots } from "@/lib/feed";
import HomeFeed from "./HomeFeed";

export const revalidate = 60;

export default async function Home() {
  const [products, storeConfig, categories, bisnes, sitePromos, adSlots] = await Promise.all([
    getProducts(),
    getStoreConfig(),
    getCategories(),
    getBisnes(),
    getSitePromos(),
    getAdSlots(),
  ]);

  return (
    <HomeFeed
      initialProducts={products}
      storeConfig={storeConfig}
      categories={categories}
      bisnes={bisnes}
      sitePromos={sitePromos}
      adSlots={adSlots}
    />
  );
}
