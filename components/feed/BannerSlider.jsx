"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import SafeImage from "@/components/SafeImage";
import Icon from "@/components/Icon";

export default function BannerSlider({ banners, onBannerClick }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  const count = banners.length;
  const goTo = useCallback((i) => {
    setIndex(((i % count) + count) % count);
  }, [count]);

  useEffect(() => {
    if (count <= 1 || paused) return;
    timerRef.current = setTimeout(() => {
      setIndex((i) => (i + 1) % count);
    }, 5000);
    return () => clearTimeout(timerRef.current);
  }, [index, count, paused]);

  if (!count) return null;

  return (
    <section
      className="banner-slider"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Promociones destacadas"
    >
      <div
        className="banner-slider-track"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {banners.map((banner, i) => (
          <div key={i} className="banner-slide">
            <button
              type="button"
              className="banner-slide-btn"
              onClick={() => onBannerClick?.(i)}
              aria-label={banner.title || "Ver promoción"}
            >
              <SafeImage
                src={banner.image}
                alt={banner.title || "Promoción"}
                fill
                sizes="(max-width: 1400px) 100vw, 1400px"
                className="banner-slide-img"
                priority={i === 0}
              />
              <span className="banner-slide-overlay">
                <span className="banner-slide-title">{banner.title}</span>
                {banner.subtitle && <span className="banner-slide-subtitle">{banner.subtitle}</span>}
              </span>
            </button>
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            className="banner-arrow banner-arrow-prev"
            onClick={() => goTo(index - 1)}
            aria-label="Anterior"
          >
            <Icon name="arrow-left" />
          </button>
          <button
            type="button"
            className="banner-arrow banner-arrow-next"
            onClick={() => goTo(index + 1)}
            aria-label="Siguiente"
          >
            <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>
              <Icon name="arrow-left" />
            </span>
          </button>
          <div className="banner-dots">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`banner-dot${i === index ? " active" : ""}`}
                onClick={() => goTo(i)}
                aria-label={`Ir a banner ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}