import { getProducts, getStoreConfig } from "@/lib/products";
import CatalogContainer from "../CatalogContainer";

export const revalidate = 60;

export default async function Tienda({ searchParams }) {
  const products = await getProducts();
  const storeConfig = getStoreConfig();
  const params = await searchParams;
  const initialCategory = typeof params?.category === "string" ? params.category : "all";

  return (
    <CatalogContainer
      initialProducts={products}
      storeConfig={storeConfig}
      initialCategory={initialCategory}
    />
  );
}