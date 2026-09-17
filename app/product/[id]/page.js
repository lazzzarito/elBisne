import Link from "next/link";
import { getProductById, getAllProductIds, getStoreConfig } from "@/lib/products";
import ProductPageClient from "./ProductPageClient";
import Script from "next/script";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://elbisne.vercel.app";

export const revalidate = 60;

export async function generateStaticParams() {
  const ids = await getAllProductIds();
  return ids.map((id) => ({ id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return { title: "Producto no encontrado" };

  const storeConfig = getStoreConfig();
  const siteName = storeConfig.name || "elBisne";
  const title = product.seoTitle || `${product.name} — ${siteName}`;
  const description = product.seoDescription || product.description || `Compra ${product.name} en línea.`;
  const image = product.image || "/images/placeholder.svg";
  const url = `${baseUrl}/product/${id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName,
      type: "website",
      images: [{ url: image, width: 1200, height: 1200, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    alternates: { canonical: url },
  };
}

export default async function ProductPage({ params }) {
  const { id } = await params;
  const product = await getProductById(id);
  const storeConfig = getStoreConfig();

  if (!product) {
    return (
      <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
        <h1>Producto no encontrado</h1>
        <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>Este producto no existe o fue eliminado.</p>
        <Link href="/tienda" style={{ display: "inline-block", marginTop: "2rem", color: "var(--accent-green)", fontWeight: 600 }}>← Volver al catálogo</Link>
      </div>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.image,
    offers: {
      "@type": "Offer",
      price: product.priceUSD,
      priceCurrency: storeConfig.currency?.code || "USD",
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org/",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: `${baseUrl}/` },
      { "@type": "ListItem", position: 2, name: product.category || "Catálogo", item: `${baseUrl}/tienda?category=${product.category}` },
      { "@type": "ListItem", position: 3, name: product.name },
    ],
  };

  return (
    <>
      <Script
        id="product-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Script
        id="breadcrumb-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <ProductPageClient product={product} storeConfig={storeConfig} />
    </>
  );
}
