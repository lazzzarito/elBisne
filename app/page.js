import { getProducts, getStoreConfig } from "@/lib/products";
import { getCategories, getBisnes } from "@/lib/feed";
import HomeFeed from "./HomeFeed";

export const revalidate = 60;

export default async function Home() {
  const [products, storeConfig, categories, bisnes] = await Promise.all([
    getProducts(),
    getStoreConfig(),
    getCategories(),
    getBisnes(),
  ]);

  return (
    <HomeFeed
      initialProducts={products}
      storeConfig={storeConfig}
      categories={categories}
      bisnes={bisnes}
    />
  );
}