"use client";

import Image from "next/image";
import Icon from "@/components/Icon";

const REAL_IMAGE_FALLBACK = "/images/placeholder.svg";

function CollectionPreview({ collection }) {
  if (collection.imageUrl) {
    return (
      <Image src={collection.imageUrl} alt={collection.title} fill className="collection-card-photo" sizes="240px" />
    );
  }
  const imgs = (collection.products || [])
    .map((p) => p.image)
    .filter((img) => img && img !== REAL_IMAGE_FALLBACK)
    .slice(0, 4);
  if (imgs.length === 0) {
    return <span className="collection-card-ph"><Icon name="layers" size={24} /></span>;
  }
  const grid = imgs.length === 1 ? "mosaic-1" : imgs.length === 2 ? "mosaic-2" : "mosaic-2x2";
  return (
    <div className={`collection-card-mosaic ${grid}`}>
      {imgs.map((src, i) => (
        <span key={i} className="collection-card-tile">
          <Image src={src} alt="" fill className="collection-card-photo" sizes="120px" />
        </span>
      ))}
      {collection.products.length > 1 && (
        <span className="collection-card-count">{collection.products.length}</span>
      )}
    </div>
  );
}

// ── Colecciones / Combos (solo se muestra cuando hay >2 colecciones) ──
export default function CollectionsSection({
  collections,
  onOpenCollection,
  isOwner = false,
  onEditCollections,
}) {
  return (
    <section className="collections-section">
      <h2 className="featured-title">
        Colecciones y Combos
        <span className="featured-title-line" />
        {isOwner && (
          <button className="btn-offers-expand" onClick={onEditCollections} title="Editar colecciones">
            <Icon name="edit" size={13} />
            <span className="btn-expand-label">Editar</span>
          </button>
        )}
      </h2>

      <div className="collections-track">
        {collections.map((c) => (
          <button key={c.id} type="button" className="collection-card" onClick={() => onOpenCollection?.(c)} aria-label={c.title}>
            <div className="collection-card-img">
              <CollectionPreview collection={c} />
            </div>
            <div className="collection-card-info">
              <strong className="collection-card-title">{c.title}</strong>
              <span className="collection-card-meta">
                {c.products.length} producto{c.products.length === 1 ? "" : "s"} · {c.price > 0 ? `$${Number(c.price).toFixed(2)}` : "Gratis"}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}