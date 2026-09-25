"use client";

import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import BannerCarousel from "@/components/ui/BannerCarousel";

// Promos globales del sitio (UI_UX.md §4.1): imagen horizontal larga +
// dos cuadradas 1:1 al lado. La imagen larga es un carrusel con autoplay
// y gestos (móvil y escritorio) que rota por todas las promos. Cada promo
// es un enlace DIRECTO (sin popup): al perfil de un bisne de la red
// (/handle) o a una URL externa. Se gestiona desde /admin.

// Mismo criterio de salida que tenía el popup (nunca un callejón sin salida):
//  · bisne → perfil del bisne
//  · url con enlace → enlace externo
//  · url sin enlace pero con bisne_handle → perfil del bisne (fallback)
//  · sin nada → Inicio
function getPromoTarget(promo) {
  if (promo.link_type === "bisne" && promo.bisne_handle) {
    return { href: `/${promo.bisne_handle}`, external: false };
  }
  if (promo.link_type === "url") {
    if (promo.link_url) return { href: promo.link_url, external: true };
    if (promo.bisne_handle) return { href: `/${promo.bisne_handle}`, external: false };
  }
  if (promo.link_url) return { href: promo.link_url, external: true };
  if (promo.bisne_handle) return { href: `/${promo.bisne_handle}`, external: false };
  return { href: "/", external: false };
}

function PromoLink({ promo, className, children, ...rest }) {
  const { href, external } = getPromoTarget(promo);
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} {...rest}>
      {children}
    </Link>
  );
}

function PromoImage({ promo, className, sizes, priority }) {
  return (
    <SafeImage src={promo.image_url} alt={promo.title || "Promoción"} fill sizes={sizes} priority={priority} className={className} />
  );
}

export default function SitePromoSlider({ promos }) {
  if (!promos || promos.length === 0) return null;

  const [landscape, ...squares] = promos;
  const allPromos = promos.slice(0, 10);

  const landscapeSlides = allPromos.map((promo) => (
    <PromoLink
      key={promo.id}
      promo={promo}
      className="site-promo-landscape"
      aria-label={promo.title || "Ver promoción"}
    >
      <PromoImage promo={promo} className="site-promo-img" sizes="(max-width: 480px) 100vw, 720px" priority={promo.id === landscape.id} />
      {(promo.title || promo.subtitle) && (
        <span className="site-promo-overlay">
          <span className="site-promo-title">{promo.title}</span>
          {promo.subtitle && <span className="site-promo-subtitle">{promo.subtitle}</span>}
        </span>
      )}
    </PromoLink>
  ));

  return (
    <section className="site-promos" aria-label="Promociones del sitio">
      <div className="site-promos-grid">
        <BannerCarousel
          slides={landscapeSlides}
          className="site-promo-carousel"
          trackClassName="site-promo-track"
          itemClassName="site-promo-carousel-item"
          ariaLabel="Banner de promociones"
        />

        {squares.length > 0 && (
          <div className="site-promos-squares">
            {squares.slice(0, 2).map((promo) => (
              <PromoLink
                key={promo.id}
                promo={promo}
                className="site-promo-square"
                aria-label={promo.title || "Ver promoción"}
              >
                <PromoImage promo={promo} className="site-promo-img" sizes="(max-width: 480px) 50vw, 230px" />
                {promo.title && (
                  <span className="site-promo-overlay">
                    <span className="site-promo-title">{promo.title}</span>
                  </span>
                )}
              </PromoLink>
            ))}
          </div>
        )}
      </div>

      {/* Mini-slider horizontal si hay más promos (hasta 10) */}
      {promos.length > 3 && (
        <div className="site-promos-scroll">
          {promos.slice(3, 10).map((promo) => (
            <PromoLink
              key={promo.id}
              promo={promo}
              className="site-promo-thumb"
              aria-label={promo.title || "Ver promoción"}
            >
              <PromoImage promo={promo} className="site-promo-img" sizes="140px" />
            </PromoLink>
          ))}
        </div>
      )}
    </section>
  );
}