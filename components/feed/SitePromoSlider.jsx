"use client";

import Link from "next/link";
import SafeImage from "@/components/SafeImage";

// Promos globales del sitio (UI_UX.md §4.1): imagen horizontal larga +
// dos cuadradas 1:1 al lado. Cada promo es un enlace DIRECTO (sin popup):
// al perfil de un bisne de la red (/b/handle) o a una URL externa.
// Se gestiona desde /admin.

// Mismo criterio de salida que tenía el popup (nunca un callejón sin salida):
//  · bisne → perfil del bisne
//  · url con enlace → enlace externo
//  · url sin enlace pero con bisne_handle → perfil del bisne (fallback)
//  · sin nada → Explorar
function getPromoTarget(promo) {
  if (promo.link_type === "bisne" && promo.bisne_handle) {
    return { href: `/b/${promo.bisne_handle}`, external: false };
  }
  if (promo.link_type === "url") {
    if (promo.link_url) return { href: promo.link_url, external: true };
    if (promo.bisne_handle) return { href: `/b/${promo.bisne_handle}`, external: false };
  }
  if (promo.link_url) return { href: promo.link_url, external: true };
  if (promo.bisne_handle) return { href: `/b/${promo.bisne_handle}`, external: false };
  return { href: "/explorar", external: false };
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

export default function SitePromoSlider({ promos }) {
  if (!promos || promos.length === 0) return null;

  const [landscape, ...squares] = promos;

  return (
    <section className="site-promos" aria-label="Promociones del sitio">
      <div className="site-promos-grid">
        <PromoLink
          promo={landscape}
          className="site-promo-landscape"
          aria-label={landscape.title || "Ver promoción"}
        >
          <SafeImage
            src={landscape.image_url}
            alt={landscape.title || "Promoción"}
            fill
            sizes="(max-width: 480px) 100vw, 720px"
            priority
            className="site-promo-img"
          />
          {(landscape.title || landscape.subtitle) && (
            <span className="site-promo-overlay">
              <span className="site-promo-title">{landscape.title}</span>
              {landscape.subtitle && <span className="site-promo-subtitle">{landscape.subtitle}</span>}
            </span>
          )}
        </PromoLink>

        {squares.length > 0 && (
          <div className="site-promos-squares">
            {squares.slice(0, 2).map((promo) => (
              <PromoLink
                key={promo.id}
                promo={promo}
                className="site-promo-square"
                aria-label={promo.title || "Ver promoción"}
              >
                <SafeImage
                  src={promo.image_url}
                  alt={promo.title || "Promoción"}
                  fill
                  sizes="(max-width: 480px) 50vw, 230px"
                  className="site-promo-img"
                />
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
              <SafeImage src={promo.image_url} alt={promo.title || ""} fill sizes="140px" className="site-promo-img" />
            </PromoLink>
          ))}
        </div>
      )}
    </section>
  );
}
