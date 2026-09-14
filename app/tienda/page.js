import { getProducts, getStoreConfig } from "@/lib/products";
import CatalogContainer from "../CatalogContainer";

export const revalidate = 60;

export default async function Tienda() {
  const products = await getProducts();
  const storeConfig = getStoreConfig();

  return (
    <CatalogContainer
      initialProducts={products}
      storeConfig={storeConfig}
    />
  );
}