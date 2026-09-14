"use client";
import { useState, useCallback } from "react";
import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import { getChannelUrl, getDefaultChannel } from "@/lib/messaging";
import { useApp } from "@/context/AppContext";

export default function ProductPageClient({ product, storeConfig }) {
  const { addToCart } = useApp();
  const [qty, setQty] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState({});

  const handleAddToCart = useCallback(() => {
    const options = Object.keys(selectedOptions).length > 0 ? selectedOptions : null;
    addToCart(product, options, qty);
  }, [product, qty, selectedOptions, addToCart]);

  const getChannel = () => typeof window !== "undefined" ? (localStorage.getItem("elbisne_channel") || getDefaultChannel(storeConfig)) : getDefaultChannel(storeConfig);

  const handleShare = useCallback(async () => {
    const text = `Mira esto: ${product.name} - $${product.priceUSD.toFixed(2)}`;
    const url = typeof window !== "undefined" ? window.location.href : "";
    try { await navigator.clipboard.writeText(url); } catch (e) {}
    if (navigator.share) {
      await navigator.share({ title: product.name, text, url }).catch(() => {});
    } else {
      const shareUrl = getChannelUrl(getChannel(), storeConfig, text);
      window.open(shareUrl, '_blank');
    }
  }, [product, storeConfig]);

  const handleBuyNow = useCallback(() => {
    handleAddToCart();
    const msg = `¡Hola! Quiero comprar *${product.name}* ($${product.priceUSD.toFixed(2)}) x ${qty}.`;
    const url = getChannelUrl(getChannel(), storeConfig, msg);
    window.open(url, "_blank");
  }, [product, qty, storeConfig, handleAddToCart]);

  const hasOptions = product.options && Object.keys(product.options).length > 0;
  const hasDiscount = product.originalPrice != null && product.originalPrice > product.priceUSD;
  const stock = product.stock;
  const isComingSoon = product.status === "coming-soon";
  const isOutOfStock = !isComingSoon && stock === 0;
  const canInteract = !isComingSoon && !isOutOfStock;

  return (
    <div className="product-page-layout">
      <div className="product-page-back">
        <Link href="/tienda" className="product-page-back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Volver al catálogo
        </Link>
      </div>

      <div className="product-page-card">
        <div className="product-page-image-section">
          <div className="product-page-image-wrapper">
            <SafeImage src={product.image} alt={product.name} fill sizes="(max-width: 768px) 100vw, 50vw" priority />
          </div>
          {product.images?.length > 1 && (
            <div className="product-page-thumbs">
              {product.images.slice(1, 4).map((img, i) => (
                <div key={i} className="product-page-thumb">
                  <SafeImage src={img} alt={`${product.name} ${i + 2}`} fill sizes="80px" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="product-page-info">
          <span className="product-page-category">{product.category}</span>
          <h1 className="product-page-title">{product.name}</h1>

          <div className="product-page-price-row">
            {hasDiscount && <span className="price-original">${product.originalPrice.toFixed(2)}</span>}
            <span className="price-primary" style={{ fontSize: "1.5rem" }}>${product.priceUSD.toFixed(2)}</span>
          </div>

          {isComingSoon ? (
            <span className="product-card-badge coming-soon" style={{ position: "static", display: "inline-block", marginTop: "0.5rem" }}>Próximamente</span>
          ) : isOutOfStock ? (
            <span className="product-card-badge out-of-stock" style={{ position: "static", display: "inline-block", marginTop: "0.5rem" }}>Agotado</span>
          ) : null}

          {product.description && <p className="product-page-desc">{product.description}</p>}

          {hasOptions && canInteract && (
            <div className="product-page-options">
              {Object.entries(product.options).map(([optionKey, values]) => (
                <div key={optionKey} className="product-page-option-group">
                  <label className="product-page-option-label">{optionKey}</label>
                  <div className="product-page-option-values">
                    {values.map((opt) => (
                      <button
                        key={opt.name}
                        className={`product-page-option-btn${selectedOptions[optionKey] === opt.name ? " active" : ""}`}
                        onClick={() => setSelectedOptions((prev) => ({ ...prev, [optionKey]: opt.name }))}
                      >
                        {opt.name}
                        {opt.priceUSD && <span style={{ display: "block", fontSize: "0.7rem", opacity: 0.75 }}>${opt.priceUSD.toFixed(2)}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {canInteract && (
            <div className="product-page-actions">
              <div className="product-page-qty">
                <button className="qty-btn" onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1}>−</button>
                <span className="qty-value">{qty}</span>
                <button className="qty-btn" onClick={() => setQty(qty + 1)}>+</button>
              </div>
              <button className="btn-add-to-cart-page" onClick={handleAddToCart}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                Añadir al carrito
              </button>
              <button className="btn-buy-now-page" onClick={handleBuyNow}>Comprar ahora</button>
              <button className="btn-share-page" onClick={handleShare}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                Compartir
              </button>
            </div>
          )}

          {product.contentHtml && (
            <div className="product-page-details" dangerouslySetInnerHTML={{ __html: product.contentHtml }} />
          )}
        </div>
      </div>

    </div>
  );
}