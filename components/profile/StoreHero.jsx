"use client";

import Image from "next/image";
import Icon from "@/components/Icon";
import BannerCarousel from "@/components/ui/BannerCarousel";

// Hero de la tienda (layout Whatalog)
// Slider de banners full-width (máx. 5) + hasta 2 colecciones fijadas a la
// derecha (cuadradas 1:1, como en la home). Cada elemento abre un producto
// o una colección. El banner iguala el alto de la columna de cuadradas.
export default function StoreHero({
  banners = [],
  pinnedCollections = [],
  isOwner = false,
  onOpenBanner,
  onOpenCollection,
  onEditHero,
}) {
  const hasBanners = banners.length > 0;
  const hasPinned = pinnedCollections.length > 0;

  if (!hasBanners && !hasPinned) return null;

  const layoutClass = hasBanners && hasPinned ? "" : hasPinned ? " pinned-only" : " no-pinned";

  const slides = banners.map((b) => (
    <button
      key={b.id}
      type="button"
      className="store-banner-btn"
      onClick={() => onOpenBanner?.(b)}
      aria-label={b.title || "Banner"}
    >
      <Image
        src={b.image_url}
        alt={b.title || ""}
        fill
        className="store-banner-img"
        sizes="(max-width: 768px) 100vw, 70vw"
        priority
      />
      {b.title && <span className="store-banner-caption">{b.title}</span>}
    </button>
  ));

  return (
    <div className={`store-hero${layoutClass}`}>
      {hasBanners && (
        <BannerCarousel
          slides={slides}
          className="store-banners"
          trackClassName="store-banner-track"
          itemClassName="store-banner-slide"
          ariaLabel="Carrusel de banners"
        />
      )}

      {hasPinned && (
        <div className={`store-hero-pinned${hasBanners ? "" : " standalone"}`}>
          {pinnedCollections.map((c) => {
            const coverSrc =
              c.imageUrl ||
              (c.products || []).map((p) => p.image).find((img) => img && img !== "/images/placeholder.svg");
            return (
              <button
                key={c.id}
                type="button"
                className="store-hero-thumb"
                onClick={() => onOpenCollection?.(c)}
                aria-label={c.title}
              >
                {coverSrc ? (
                  <Image
                    src={coverSrc}
                    alt={c.title}
                    fill
                    className="store-hero-thumb-img"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                ) : (
                  <span className="store-hero-thumb-ph"><Icon name="layers" size={22} /></span>
                )}
                <span className="store-hero-thumb-label">{c.title}</span>
              </button>
            );
          })}
        </div>
      )}

      {isOwner && (
        <button type="button" className="store-edit-fab store-hero-edit" onClick={onEditHero} title="Editar banners y destacados">
          <Icon name="edit" size={15} />
        </button>
      )}
    </div>
  );
}