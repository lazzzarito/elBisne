"use client";

import { useEffect, useState } from "react";
import SafeImage from "@/components/SafeImage";
import { lockBodyScroll } from "@/lib/scroll-lock";
import { useHistoryPopup } from "@/lib/use-history-popup";
import { useFocusTrap } from "@/lib/use-focus-trap";

export default function ProductModal({ product, onClose, onAddToCart, storeConfig, onQuickBuy, productQty: productQtyProp = 1, onQtyChange, isFavorited = false, onToggleFavorite }) {
  // ── Track active image index for gallery ──
  const [activeImage, setActiveImage] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [showPlusBadge, setShowPlusBadge] = useState(false);
  const [lastAddedQty, setLastAddedQty] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [internalQty, setInternalQty] = useState(1);

  // Cantidad controlada (padre) o local si no se pasa onQtyChange
  const isControlledQty = typeof onQtyChange === "function";
  const productQty = isControlledQty ? productQtyProp : internalQty;
  const handleQtyChange = (qty) => {
    if (isControlledQty) onQtyChange(qty);
    else setInternalQty(qty);
  };

  // Reset derivado en render cuando cambia el producto (patrón oficial React)
  const [lastProduct, setLastProduct] = useState(product);
  if (product !== lastProduct) {
    setLastProduct(product);
    const defaults = {};
    if (product) {
      if (product.options) {
        Object.entries(product.options).forEach(([key, values]) => {
          if (values && values.length > 0) {
            defaults[key] = values[0].name;
          }
        });
      }
      setSelectedOptions(defaults);
      setActiveImage(0);
      setInternalQty(1);
    }
  }

  useEffect(() => {
    if (!product) return undefined;
    return lockBodyScroll();
  }, [product]);

  useHistoryPopup(!!product, onClose);
  const modalRef = useFocusTrap(!!product);

  const [animateHeart, setAnimateHeart] = useState(false);

  useEffect(() => {
    if (animateHeart) {
      const timer = setTimeout(() => setAnimateHeart(false), 400);
      return () => clearTimeout(timer);
    }
  }, [animateHeart]);

  if (!product) return null;

  const { name, priceUSD, originalPrice, category, images, description, contentHtml, attributes, options } = product;
  const stock = product.stock;
  const productStatus = product.status;
  const isComingSoon = productStatus === "coming-soon";
  const isOutOfStock = !isComingSoon && stock === 0;
  const isLowStock = !isComingSoon && !isOutOfStock && stock > 0 && stock < 10;
  const maxQty = isComingSoon || isOutOfStock ? 0 : (isFinite(stock) ? stock : 99);
  const canInteract = !isComingSoon && !isOutOfStock;

  // Build image list dynamically, including any option-specific images that aren't already present
  let baseImages = images && images.length > 0 ? [...images] : [product.image];
  if (options) {
    Object.values(options).forEach((values) => {
      if (Array.isArray(values)) {
        values.forEach((val) => {
          if (val && val.image && !baseImages.includes(val.image)) {
            baseImages.push(val.image);
          }
        });
      }
    });
  }
  const productImages = baseImages;

  // Compute dynamic price and original price based on selected options
  let activePrice = priceUSD;
  let activeOriginalPrice = originalPrice;

  if (options && Object.keys(selectedOptions).length > 0) {
    Object.entries(selectedOptions).forEach(([optionKey, selectedValName]) => {
      const optGroup = options[optionKey];
      if (optGroup) {
        const matchedVal = optGroup.find((o) => o.name === selectedValName);
        if (matchedVal && matchedVal.priceUSD !== undefined) {
          activePrice = matchedVal.priceUSD;
          activeOriginalPrice = matchedVal.originalPrice !== undefined ? matchedVal.originalPrice : null;
        }
      }
    });
  }

  const hasDiscount = activeOriginalPrice != null && activeOriginalPrice > activePrice;
  const hasAttributes = attributes && Object.keys(attributes).length > 0;

  const handleOptionSelect = (optionKey, valName) => {
    setSelectedOptions((prev) => {
      const updated = { ...prev, [optionKey]: valName };
      if (options && options[optionKey]) {
        const optionObj = options[optionKey].find((o) => o.name === valName);
        if (optionObj && optionObj.image) {
          const imgIndex = productImages.findIndex((img) => img === optionObj.image);
          if (imgIndex !== -1) {
            setActiveImage(imgIndex);
          }
        }
      }
      return updated;
    });
  };

  const handleToggleFav = () => {
    setAnimateHeart(true);
    if (onToggleFavorite) onToggleFavorite(product.id);
  };

  const handleShare = async () => {
    const text = `¡Mira esto!: ${name} - $${activePrice.toFixed(2)}`;
    const url = `${window.location.origin}/product/${encodeURIComponent(product.id)}`;
    try { await navigator.clipboard.writeText(url); } catch (e) {}
    if (navigator.share) {
      await navigator.share({ title: name, text, url }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
    }
  };

  const handleDirectBuy = () => {
    onQuickBuy({ ...product, selectedOptions, quantity: productQty });
  };

  return (
    <>
      <div className="cart-overlay open" onClick={onClose} style={{ zIndex: 205 }} />
      <div className="product-modal-container" ref={modalRef}>
        <div className="product-modal-card">
          <div className="product-modal-header-bar">
            <button className="product-modal-back-btn" onClick={onClose} aria-label="Atrás">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div className="product-modal-header-actions">
              <button className="btn-header-share" onClick={handleShare} aria-label="Compartir">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              </button>
              <button className={`btn-header-heart${animateHeart ? " heart-pop" : ""}`} onClick={handleToggleFav} aria-label={isFavorited ? "Quitar de favoritos" : "Añadir a favoritos"}>
                {isFavorited ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#e74c3c" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="product-modal-scroll-content">
            <div className="product-modal-content">
              <div className="product-modal-image-col">
                <div className="product-modal-image-wrapper">
                  <SafeImage
                    src={productImages[activeImage]}
                    alt={name}
                    fill
                    className="product-modal-image-element"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
                {productImages.length > 1 && (
                  <div className="product-modal-image-nav">
                    <button
                      className="product-modal-image-arrow"
                      onClick={() => setActiveImage((prev) => (prev === 0 ? productImages.length - 1 : prev - 1))}
                      aria-label="Imagen anterior"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                    <span className="product-modal-image-counter">{activeImage + 1} / {productImages.length}</span>
                    <button
                      className="product-modal-image-arrow"
                      onClick={() => setActiveImage((prev) => (prev === productImages.length - 1 ? 0 : prev + 1))}
                      aria-label="Imagen siguiente"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              <div className="product-modal-info-col">
                <span className="product-card-category">{category}</span>
                <h2 className="product-modal-title">{name}</h2>

                <div className="product-modal-prices">
                  {hasDiscount && (
                    <div className="price-original-row">
                      <span className="product-modal-badge">OFERTA</span>
                      <span className="price-original">${activeOriginalPrice.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="price-current-row">
                    <span className="price-primary">${(activePrice * productQty).toFixed(2)}</span>
                    {productQty > 1 && <span className="price-mult">${activePrice.toFixed(2)} × {productQty}</span>}
                  </div>
                  {isComingSoon && <div className="product-status-badge coming-soon">Próximamente</div>}
                  {isOutOfStock && <div className="product-status-badge out-of-stock">Agotado</div>}
                  {isLowStock && <div className="product-status-badge low-stock">Solo quedan {stock} en stock</div>}
                </div>

                {options && Object.keys(options).length > 0 && (
                  <div className="product-modal-options">
                    {Object.entries(options).map(([optionKey, values]) => (
                      <div className="product-modal-option-group" key={optionKey}>
                        <span className="product-modal-option-label">{optionKey}</span>
                        <div className="product-modal-option-values">
                          {values.map((val) => {
                            const isSelected = selectedOptions[optionKey] === val.name;
                            const hasPriceOverride = val.priceUSD !== undefined;
                            return (
                              <button
                                key={val.name}
                                className={`product-modal-option-pill${isSelected ? " active" : ""}`}
                                onClick={() => handleOptionSelect(optionKey, val.name)}
                              >
                                {val.name}
                                {hasPriceOverride && (
                                  <span className="product-modal-option-price-badge">
                                    (${val.priceUSD.toFixed(2)})
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {hasAttributes && (
                  <div className="product-modal-attributes">
                    {Object.entries(attributes).map(([key, val]) => (
                      <div className="product-modal-attr-row" key={key}>
                        <span className="product-modal-attr-label">{key}</span>
                        <span className="product-modal-attr-value">{val}</span>
                      </div>
                    ))}
                  </div>
                )}

                {description && <p className="product-modal-brief">{description}</p>}

                <div className="product-modal-details-html" dangerouslySetInnerHTML={{ __html: contentHtml }} />
              </div>
            </div>
          </div>

          <div className="product-modal-footer">
            <div className="product-modal-footer-row">
              <div className={`btn-add-cart-wrap${addingToCart ? ' added' : ''}`}>
                <div className="btn-add-cart-stepper">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleQtyChange(Math.max(1, productQty - 1)); }}
                    aria-label="Disminuir cantidad"
                    disabled={productQty <= 1 || !canInteract}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                  <span>{productQty}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleQtyChange(Math.min(maxQty, productQty + 1)); }}
                    aria-label="Aumentar cantidad"
                    disabled={productQty >= maxQty || !canInteract}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>
                <button
                  className="btn-add-cart"
                  onClick={() => {
                    const qty = productQty;
                    onAddToCart(product, selectedOptions, qty);
                    setLastAddedQty(qty);
                    setAddingToCart(true);
                    setShowPlusBadge(true);
                    setTimeout(() => setAddingToCart(false), 2000);
                    setTimeout(() => setShowPlusBadge(false), 900);
                  }}
                  aria-label="Añadir al carrito"
                  disabled={!canInteract}
                >
                  {addingToCart ? (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span className="btn-lbl">Añadido</span><span className="btn-lbl-short">Hecho</span>
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                      </svg>
                      <span className="btn-lbl">Añadir al carrito</span><span className="btn-lbl-short">Añadir</span>
                    </>
                  )}
                  {showPlusBadge && <span className="cart-plus-badge">+{lastAddedQty}</span>}
                </button>
              </div>
              <button className="btn-direct-buy" onClick={handleDirectBuy} aria-label="Comprar ahora" disabled={!canInteract}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                <span className="btn-lbl">Comprar ahora</span><span className="btn-lbl-short">Comprar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
