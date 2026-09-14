"use client";

import Link from "next/link";
import Icon from "@/components/Icon";

export default function CategoriesCarousel({ categories, onSelect }) {
  if (!categories || !categories.length) return null;
  const ICON_FALLBACK = "home";

  return (
    <section className="categories-carousel-section" aria-label="Categorías">
      <h2 className="featured-title">
        Categorías
        <span className="featured-title-line" />
      </h2>
      <div className="categories-carousel">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/tienda?category=${encodeURIComponent(category.name)}`}
            className="category-chip"
            onClick={() => onSelect?.(category.name)}
          >
            <span className="category-chip-icon">
              <Icon name={category.icon || ICON_FALLBACK} size={18} />
            </span>
            <span className="category-chip-name">{category.name}</span>
            <span className="category-chip-count">{category.productCount > 0 ? category.productCount : null}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}