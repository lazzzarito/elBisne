"use client";

import Icon from "@/components/Icon";

const PRICE_STEPS = [0, 25, 50, 100, 200];

export default function ExploreFilters({
  categories,
  activeCategory,
  onCategoryChange,
  maxPrice,
  onMaxPriceChange,
  offersOnly,
  onOffersOnlyChange,
  sortBy,
  onSortChange,
  productCount,
  totalCount,
}) {
  const hasChanges =
    activeCategory !== "all" || maxPrice > 0 || offersOnly || sortBy !== "featured";

  const clearAll = () => {
    onCategoryChange("all");
    onMaxPriceChange(0);
    onOffersOnlyChange(false);
    onSortChange("featured");
  };

  return (
    <section className="explore-filters" aria-label="Filtros">
      <div className="explore-filters-row">
        <div className="explore-cat-scroll">
          <button
            type="button"
            className={`explore-pill${activeCategory === "all" ? " active" : ""}`}
            onClick={() => onCategoryChange("all")}
          >
            Todo
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`explore-pill${activeCategory === cat ? " active" : ""}`}
              onClick={() => onCategoryChange(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`explore-toggle${offersOnly ? " active" : ""}`}
          onClick={() => onOffersOnlyChange(!offersOnly)}
          title="Solo productos en oferta"
        >
          <Icon name="sparkles" />
          Ofertas
        </button>

        <div className="explore-sort-select">
          <label className="explore-sort-label">
            <Icon name="filter" />
            Ordenar
          </label>
          <select
            className="explore-sort-input"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            aria-label="Ordenar resultados"
          >
            <option value="featured">Destacados</option>
            <option value="price-asc">Precio ↑</option>
            <option value="price-desc">Precio ↓</option>
            <option value="name-asc">Nombre A-Z</option>
            <option value="name-desc">Nombre Z-A</option>
          </select>
        </div>
      </div>

      <div className="explore-filters-row explore-filters-secondary">
        <div className="explore-price">
          <span className="explore-price-label">
            Precio máx: {maxPrice > 0 ? `$${maxPrice}` : "Sin límite"}
          </span>
          <input
            type="range"
            min={0}
            max={PRICE_STEPS[PRICE_STEPS.length - 1]}
            step={5}
            value={maxPrice}
            onChange={(e) => onMaxPriceChange(Number(e.target.value))}
            aria-label="Precio máximo"
            className="explore-price-range"
          />
          <div className="explore-price-scale">
            <span>$0</span>
            <span>${PRICE_STEPS[PRICE_STEPS.length - 1]}</span>
          </div>
        </div>

        <div className="explore-count">
          {productCount} de {totalCount} productos
        </div>

        {hasChanges && (
          <button type="button" className="btn-clear-filters" onClick={clearAll}>
            <Icon name="cross" />
            Limpiar filtros
          </button>
        )}
      </div>
    </section>
  );
}