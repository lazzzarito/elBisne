import { getProducts, getStoreConfig } from "@/lib/products";
import PerfilClient from "./PerfilClient";

export const revalidate = 60;

export const metadata = {
  title: "Mi Perfil | elBisne",
  description:
    "Gestiona tu cuenta, revisa tus productos guardados y activa tu tienda en elBisne.",
};

export default async function PerfilPage() {
  const [products, storeConfig] = await Promise.all([getProducts(), getStoreConfig()]);

  return <PerfilClient products={products} storeConfig={storeConfig} />;
}
