"use client";

import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import Icon from "@/components/Icon";
import { FollowButton } from "@/components/profile/StoreProfileHeader";

// Bisnes recomendados por novedad (UI_UX.md §5.3): orden created_at desc,
// botón Seguir directo en la card para descubrir nuevos bisnes.
export default function BusinessesNewSection({ bisnes, max = 6 }) {
  if (!bisnes || bisnes.length === 0) return null;

  const newest = [...bisnes]
    .sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    })
    .slice(0, max);

  return (
    <section className="featured-section" aria-label="Bisnes nuevos">
      <h2 className="featured-title">
        <Icon name="sparkles" />
        Bisnes nuevos en elBisne
        <span className="featured-title-line" />
      </h2>

      <div className="businesses-carousel">
        {newest.map((bisne) => (
          <div key={bisne.id} className="business-card business-card-new">
            <Link href={`/b/${bisne.handle}`} className="business-card-main">
              <div className="business-card-logo">
                {bisne.logoUrl ? (
                  <SafeImage
                    src={bisne.logoUrl}
                    alt={bisne.business_name}
                    fill
                    sizes="80px"
                    className="business-card-logo-img"
                  />
                ) : (
                  <span className="business-card-initial">
                    {bisne.business_name?.charAt(0) || "B"}
                  </span>
                )}
              </div>
              <div className="business-card-info">
                <span className="business-card-name">
                  {bisne.business_name}
                  {bisne.verified && (
                    <span className="business-verified-badge" title="Verificado">
                      <Icon name="check" />
                    </span>
                  )}
                </span>
                {bisne.slogan && <span className="business-card-slogan">{bisne.slogan}</span>}
                <span className="business-card-meta">
                  {bisne.category && <span>{bisne.category}</span>}
                  <span>
                    {bisne.productCount} {bisne.productCount === 1 ? "producto" : "productos"}
                  </span>
                </span>
              </div>
            </Link>
            <div className="business-card-follow">
              <FollowButton bisneId={bisne.id} size="sm" withLabel={false} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
