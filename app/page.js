import { getProducts, getStoreConfig } from "@/lib/products";
import CatalogContainer from "./CatalogContainer";

// Ensure Next.js builds this statically (SSG) but also regenerates when markdown changes
export const revalidate = 60; 

export default async function Home() {
  const products = await getProducts();
  const storeConfig = getStoreConfig();

  return (
    <CatalogContainer 
      initialProducts={products} 
      storeConfig={storeConfig} 
    />
  );
}
