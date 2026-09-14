import Link from "next/link";
import { getProducts, getStoreConfig } from "@/lib/products";

export const revalidate = 60;

export default async function Home() {
  const products = await getProducts();
  const storeConfig = getStoreConfig();
  const featured = products.filter((p) => p.featured && !p.status).slice(0, 6);

  return (
    <main className="home-page" id="main-content">
      <section className="home-hero">
        <h1 className="home-hero-title">{storeConfig.name || "elBisne"}</h1>
        <p className="home-hero-subtitle">{storeConfig.location || "Explora productos locales increíbles"}</p>
        <Link href="/tienda" className="home-hero-cta">Ver catálogo</Link>
      </section>

      {featured.length > 0 && (
        <section className="home-featured-section">
          <h2 className="home-section-title">Destacados</h2>
          <p className="home-section-sub">Una selección de lo mejor del catálogo.</p>
          <div className="home-featured-grid">
            {featured.map((product) => (
              <Link key={product.id} href={`/product/${product.id}`} className="home-featured-card">
                <span className="home-featured-name">{product.name}</span>
                <span className="home-featured-price">${product.priceUSD.toFixed(2)}</span>
                {product.category && <span className="home-featured-category">{product.category}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}