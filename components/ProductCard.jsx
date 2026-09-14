"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import SafeImage from "@/components/SafeImage";
import Icon from "@/components/Icon";

export default function ProductCard({ product, onAddToCart, onOpenDetails, priority, isFavorited = false, onToggleFavorite, index = 0 }) {
  const { name, priceUSD, originalPrice, category, image, description, ratioClass } = product;
  const hasDiscount = originalPrice != null && originalPrice > priceUSD;
  const hasOptions = product.options && Object.keys(product.options).length > 0;
  const stock = product.stock;
  const productStatus = product.status;
  const isComingSoon = productStatus === "coming-soon";
  const isOutOfStock = !isComingSoon && stock === 0;
  const canInteract = !isComingSoon && !isOutOfStock;

  const [showPlus, setShowPlus] = useState(false);

  const handleAdd = useCallback((e) => {
    e.stopPropagation();
    if (!canInteract) return;
    if (hasOptions) {
      onOpenDetails(product);
    } else {
      onAddToCart(product);
      setShowPlus(true);
      setTimeout(() => setShowPlus(false), 900);
    }
  }, [canInteract, hasOptions, onOpenDetails, product, onAddToCart]);

  return (
    <motion.div
      className="product-card"
      onClick={() => onOpenDetails(product)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -5, boxShadow: "0 10px 30px rgba(17, 27, 33, 0.08)" }}
      whileTap={{ scale: 0.98 }}
    >
      <div className={`product-card-image-wrapper ${ratioClass}`}>
        <SafeImage
          src={image}
          alt={name}
          fill
          sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 33vw"
          className="product-card-image"
          priority={priority}
        />
        {isComingSoon ? (
          <span className="product-card-badge coming-soon">Próximamente</span>
        ) : isOutOfStock ? (
          <span className="product-card-badge out-of-stock">Agotado</span>
        ) : hasDiscount ? (
          <span className="product-card-badge">OFERTA</span>
        ) : null}
        <button
          className={`product-card-fav${isFavorited ? " favorited" : ""}`}
          onClick={(e) => { e.stopPropagation(); if (onToggleFavorite) onToggleFavorite(product.id); }}
          aria-label={isFavorited ? "Quitar de favoritos" : "Añadir a favoritos"}
        >
          {isFavorited ? <Icon name="heart-filled" /> : <Icon name="heart-outline" />}
        </button>
      </div>
      <div className="product-card-info">
        <span className="product-card-category">{category}</span>
        <h3 className="product-card-title">{name}</h3>
        {description && <p className="product-card-desc">{description}</p>}

        <div className="product-card-price-row">
          <div className="product-price-container">
            {hasDiscount && <span className="price-original">${originalPrice.toFixed(2)}</span>}
            <span className="price-primary">${priceUSD.toFixed(2)}</span>
          </div>
          {canInteract && (
            <button
              className="btn-add-to-cart"
              aria-label={hasOptions ? "Seleccionar opciones" : "Añadir al carrito"}
              title={hasOptions ? "Seleccionar opciones" : "Añadir al carrito"}
              onClick={handleAdd}
            >
              <Icon name="cart" />
              {showPlus && <span className="plus-badge">+1</span>}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
