import { getProducts, getStoreConfig } from "@/lib/products";
import { getBisnes, getSitePromos } from "@/lib/feed";
import HomeFeed from "./HomeFeed";

export const revalidate = 60;

export default async function Home() {
  const [products, storeConfig, bisnes, sitePromos] = await Promise.all([
    getProducts(),
    getStoreConfig(),
    getBisnes(),
    getSitePromos(),
  ]);

  return (
    <HomeFeed
      initialProducts={products}
      storeConfig={storeConfig}
      bisnes={bisnes}
      sitePromos={sitePromos}
    />
  );
}
