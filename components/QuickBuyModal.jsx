"use client";

import { useState, useEffect } from "react";
import SafeImage from "@/components/SafeImage";
import { lockBodyScroll } from "@/lib/scroll-lock";
import { useHistoryPopup } from "@/lib/use-history-popup";
import { getChannelUrl, getDefaultChannel, getEnabledChannels, buildOrderMessage, getDeliveryMode } from "@/lib/messaging";
import { loadBisneIndex, buildBisneStoreConfig, createOrder } from "@/lib/orders";
import ChannelSplitButton from "@/components/ChannelSplitButton";
import Icon from "@/components/Icon";

const CUSTOMER_KEY = "elbisne_customer";

const defaultCustomer = (storeConfig) => {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(CUSTOMER_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
  }
  const mode = getDeliveryMode(storeConfig);
  const d = mode === "delivery" ? "delivery" : mode !== "none" ? "pickup" : "";
  return { name: "", phone: "", delivery: d, address: "", payment: "", paymentOther: "" };
};

export default function QuickBuyModal({ product, onClose, onOrderComplete, storeConfig, onQtyChange }) {
  const [customer, setCustomer] = useState(() => defaultCustomer(storeConfig));
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedItem, setConfirmedItem] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [qty, setQty] = useState(product?.quantity || 1);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({});
  const [selectedChannel, setSelectedChannel] = useState(
    () => typeof window !== "undefined" ? (localStorage.getItem("elbisne_channel") || getDefaultChannel(storeConfig)) : getDefaultChannel(storeConfig)
  );
  const [orderStatus, setOrderStatus] = useState("idle"); // idle | saving | saved | error
  const [orderError, setOrderError] = useState(null);
  const [bisneInfo, setBisneInfo] = useState(null);
  const enabledChannels = getEnabledChannels(storeConfig);

  // WhatsApp real del vendedor (si el producto pertenece a un bisne)
  useEffect(() => {
    if (!product?.bisneId) return;
    let active = true;
    loadBisneIndex().then((map) => {
      if (active && map.has(product.bisneId)) setBisneInfo(map.get(product.bisneId));
    });
    return () => {
      active = false;
    };
  }, [product?.bisneId]);

  const [lastProduct, setLastProduct] = useState(product);

  // Reset derivado en render cuando cambia el producto (patrón oficial React)
  if (product !== lastProduct) {
    setLastProduct(product);
    if (product) {
      setSelectedOptions(product.selectedOptions || (() => {
        const defaults = {};
        if (product.options) {
          Object.entries(product.options).forEach(([k, v]) => {
            if (v && v.length > 0) defaults[k] = v[0].name;
          });
        }
        return defaults;
      })());
    }
  }

  useEffect(() => {
    if (product) {
      const unlock = lockBodyScroll();
      const handler = (e) => { if (e.key === "Escape") onClose(); };
      document.addEventListener("keydown", handler);
      return () => {
        document.removeEventListener("keydown", handler);
        unlock();
      };
    }
    return undefined;
  }, [product, onClose]);

  useHistoryPopup(!!product, onClose);

  if (!product) return null;

  const { name, priceUSD, originalPrice, category, images, description, options } = product;

  const update = (field, value) => setCustomer((prev) => ({ ...prev, [field]: value }));
  const blur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));

  const errors = {};
  if (!customer.name) errors.name = "¿Cómo te llamas?";
  if (!customer.phone) errors.phone = "Necesitamos tu teléfono para contactarte";
  if (customer.delivery === "delivery" && !customer.address) errors.address = "¿Dónde realizamos la entrega?";
  if (!customer.payment) errors.payment = "Elige un método de pago";
  if (customer.payment === "Otro" && !customer.paymentOther) errors.paymentOther = "Cuéntanos tu método de pago";

  const hasErrors = Object.keys(errors).length > 0;

  const PAYMENT_OPTIONS = [
    "Efectivo USD",
    "Tarjeta de Crédito",
    "Tarjeta de Débito",
    "Zelle",
    "PayPal",
    "Venmo",
    "Otro",
  ];

  // Compute dynamic price and active image
  let activePrice = priceUSD;
  let activeOriginalPrice = originalPrice;
  let activeImage = product.image;

  if (options && Object.keys(selectedOptions).length > 0) {
    Object.entries(selectedOptions).forEach(([optionKey, selectedValName]) => {
      const optGroup = options[optionKey];
      if (optGroup) {
        const matchedVal = optGroup.find((o) => o.name === selectedValName);
        if (matchedVal) {
          if (matchedVal.priceUSD !== undefined) {
            activePrice = matchedVal.priceUSD;
            activeOriginalPrice = matchedVal.originalPrice !== undefined ? matchedVal.originalPrice : null;
          }
          if (matchedVal.image) {
            activeImage = matchedVal.image;
          }
        }
      }
    });
  }

  const handleConfirm = async () => {
    setSubmitted(true);
    if (hasErrors) return;
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
    setConfirmedItem({ ...product, priceUSD: activePrice, originalPrice: activeOriginalPrice, image: activeImage, selectedOptions, quantity: qty });

    const items = [{ ...product, priceUSD: activePrice, selectedOptions, quantity: qty }];
    const totalUSD = activePrice * qty;

    // storeConfig con el WhatsApp real del Bisne (si el producto lo tiene)
    const bisneStoreConfig = buildBisneStoreConfig(storeConfig, product.bisneId ? bisneInfo : null);

    const orderData = { customer, cartItems: items, totalUSD };
    const message = buildOrderMessage(orderData, bisneStoreConfig);
    const url = getChannelUrl(selectedChannel, bisneStoreConfig, message);
    if (url) window.open(url, "_blank", "noopener");

    setConfirmed(true);
    if (onOrderComplete) onOrderComplete();

    // Registrar el pedido en DB (orders + decremento de stock vía RPC)
    setOrderStatus("saving");
    const result = await createOrder({
      bisneId: product.bisneId || null,
      items,
      customer,
      totalUSD,
      channel: selectedChannel,
    });
    if (result.ok) {
      setOrderStatus("saved");
    } else {
      setOrderStatus("error");
      setOrderError(result.error);
    }
  };

  const channelLabel = ({ whatsapp: "WhatsApp", telegram: "Telegram", email: "Email" })[selectedChannel] || "WhatsApp";

  return (
    <>
      <div className="quickbuy-overlay" onClick={onClose} />
      <div className="quickbuy-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="quickbuy-scroll">
          {confirmed && confirmedItem ? (
            <>
              <div className="quickbuy-header" style={{ textAlign: "center" }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 0.5rem", display: "block" }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <h2 className="quickbuy-title">¡Pedido Enviado!</h2>
                <p className="quickbuy-subtitle">
                  Tu pedido fue enviado por {channelLabel}.
                  {orderStatus === "saved" && " Quedó registrado en la tienda."}
                </p>
                {orderStatus === "error" && (
                  <div className="quickbuy-order-warning">
                    <Icon name="warning" size={13} />
                    No pudimos registrarlo en línea ({orderError}), pero el vendedor lo recibió por {channelLabel}.
                  </div>
                )}
              </div>

              <div className="quickbuy-body">
                <div className="quickbuy-summary">
                  <div className="quickbuy-section">
                    <strong>Cliente</strong>
                    <span>{customer.name} &mdash; {customer.phone}</span>
                    <span>{customer.delivery === "delivery" ? `Entrega: ${customer.address}` : "Recogida en tienda"}</span>
                    <span>Pago: {customer.payment}{customer.paymentOther ? ` (${customer.paymentOther})` : ""}</span>
                  </div>
                  <div className="quickbuy-section">
                    <strong>Producto</strong>
                    <div className="quickbuy-confirmed-product">
                      <div className="quickbuy-product-image-wrapper">
                        <SafeImage src={confirmedItem.image} alt={confirmedItem.name} width={60} height={60} className="quickbuy-product-image" />
                      </div>
                      <div className="quickbuy-product-info">
                        <strong className="quickbuy-product-name">{confirmedItem.name}</strong>
                        {confirmedItem.selectedOptions && Object.keys(confirmedItem.selectedOptions).length > 0 && (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginTop: "0.15rem" }}>
                            {Object.entries(confirmedItem.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(" | ")}
                          </span>
                        )}
                        <span className="quickbuy-product-price">${confirmedItem.priceUSD.toFixed(2)} <span className="quickbuy-qty-x">× {confirmedItem.quantity}</span></span>
                      </div>
                      <span style={{ fontWeight: 600, whiteSpace: "nowrap", color: "var(--text-primary)" }}>${(confirmedItem.priceUSD * confirmedItem.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="quickbuy-total">
                    <strong>Total</strong>
                    <span>${(confirmedItem.priceUSD * confirmedItem.quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="quickbuy-header">
                <h2 className="quickbuy-title">Compra Rápida</h2>
              </div>

              <div className="quickbuy-product-preview">
                <div className="quickbuy-product-image-wrapper">
                  <SafeImage src={activeImage} alt={name} width={80} height={80} className="quickbuy-product-image" />
                </div>
                <div className="quickbuy-product-info">
                  <span className="quickbuy-product-category">{category}</span>
                  <strong className="quickbuy-product-name">{name}</strong>
                  <span className="quickbuy-product-price">${activePrice.toFixed(2)}</span>
                  <div className="quickbuy-inline-qty">
                    <button onClick={() => { const v = Math.max(1, qty - 1); setQty(v); if (onQtyChange) onQtyChange(v); }} aria-label="Disminuir" disabled={qty <= 1}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                    <span>{qty}</span>
                    <button onClick={() => { const v = Math.min(99, qty + 1); setQty(v); if (onQtyChange) onQtyChange(v); }} aria-label="Aumentar" disabled={qty >= Math.min(99, product?.stock != null && isFinite(product.stock) ? product.stock : 99)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {options && Object.keys(options).length > 0 && (
                <div className="quickbuy-options" style={{ margin: "0.5rem 1.5rem 1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {Object.entries(options).map(([optionKey, values]) => (
                    <div className="quickbuy-option-group" key={optionKey} style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <span className="quickbuy-option-label" style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-secondary)" }}>{optionKey}</span>
                      <div className="quickbuy-option-values" style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                        {values.map((val) => {
                          const isSelected = selectedOptions[optionKey] === val.name;
                          const hasPriceOverride = val.priceUSD !== undefined;
                          return (
                            <button
                              key={val.name}
                              className={`qchip${isSelected ? " active" : ""}`}
                              style={{ margin: 0, outline: "none", border: "1px solid var(--border-color)", padding: "0.35rem 0.75rem", borderRadius: "15px", fontSize: "0.78rem", cursor: "pointer", transition: "all 0.2s" }}
                              onClick={() => setSelectedOptions(prev => ({ ...prev, [optionKey]: val.name }))}
                            >
                              {val.name}
                              {hasPriceOverride && ` ($${val.priceUSD.toFixed(2)})`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="quickbuy-body">
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem", lineHeight: 1.5 }}>
                  Completa tus datos para enviar el pedido directamente por {channelLabel}.
                </p>

                <div className="quickbuy-form">
                  <div className="qfield">
                    <label className="qlabel">Nombre *</label>
                    <input className={`qinput${submitted && errors.name ? " error" : ""}`} type="text" placeholder="Escribe tu nombre completo" value={customer.name} onChange={(e) => update("name", e.target.value)} onBlur={() => blur("name")} />
                    {submitted && errors.name && <span className="qerror">{errors.name}</span>}
                  </div>
                  <div className="qfield">
                    <label className="qlabel">Teléfono *</label>
                    <input className={`qinput${submitted && errors.phone ? " error" : ""}`} type="tel" placeholder="Ej. +53 5 123 4567" value={customer.phone} onChange={(e) => update("phone", e.target.value)} onBlur={() => blur("phone")} />
                    {submitted && errors.phone && <span className="qerror">{errors.phone}</span>}
                  </div>
                  {(() => {
                    const mode = getDeliveryMode(storeConfig);
                    if (mode === "none") return null;
                    const isDelivery = customer.delivery === "delivery";
                    return (
                      <div className="qfield">
                        <label className="qlabel">
                          {mode === "both" ? "Recogida / Entrega *" : mode === "delivery" ? "Dirección de entrega *" : "Lugar de recogida"}
                        </label>
                        {mode === "both" ? (
                          <>
                            <div className="qradio-group">
                              <label className={`qradio ${customer.delivery === "pickup" ? "active" : ""}`}>
                                <input type="radio" name="qdelivery" value="pickup" checked={customer.delivery === "pickup"} onChange={(e) => update("delivery", e.target.value)} />
                                Recoger en tienda
                              </label>
                              <label className={`qradio ${customer.delivery === "delivery" ? "active" : ""}`}>
                                <input type="radio" name="qdelivery" value="delivery" checked={customer.delivery === "delivery"} onChange={(e) => update("delivery", e.target.value)} />
                                Entrega a domicilio
                              </label>
                            </div>
                            {isDelivery ? (
                              <>
                                <input className={`qinput${submitted && errors.address ? " error" : ""}`} type="text" placeholder="Dirección, ciudad, código postal" value={customer.address} onChange={(e) => update("address", e.target.value)} onBlur={() => blur("address")} />
                                {submitted && errors.address && <span className="qerror">{errors.address}</span>}
                              </>
                            ) : (
                              <p className="qstore-address">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "0.3rem", verticalAlign: "middle" }}>
                                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                  <circle cx="12" cy="10" r="3" />
                                </svg>
                                {storeConfig.location}
                              </p>
                            )}
                          </>
                        ) : mode === "delivery" ? (
                          <>
                            <input className={`qinput${submitted && errors.address ? " error" : ""}`} type="text" placeholder="Dirección, ciudad, código postal" value={customer.address} onChange={(e) => update("address", e.target.value)} onBlur={() => blur("address")} />
                            {submitted && errors.address && <span className="qerror">{errors.address}</span>}
                          </>
                        ) : (
                          <p className="qstore-address">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "0.3rem", verticalAlign: "middle" }}>
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            {storeConfig.location}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                  <div className="qfield">
                    <label className="qlabel">Método de pago *</label>
                    <div className="qchip-grid">
                      {PAYMENT_OPTIONS.map((opt) => (
                        <label key={opt} className={`qchip ${customer.payment === opt ? "active" : ""}`}>
                          <input type="radio" name="qpayment" value={opt} checked={customer.payment === opt} onChange={(e) => { update("payment", e.target.value); blur("payment"); }} />
                          {opt}
                        </label>
                      ))}
                    </div>
                    {submitted && errors.payment && <span className="qerror">{errors.payment}</span>}
                    {customer.payment === "Otro" && (
                      <>
                        <input className={`qinput${submitted && errors.paymentOther ? " error" : ""}`} type="text" placeholder="Describe tu método de pago" value={customer.paymentOther} onChange={(e) => update("paymentOther", e.target.value)} onBlur={() => blur("paymentOther")} style={{ marginTop: "0.5rem" }} />
                        {submitted && errors.paymentOther && <span className="qerror">{errors.paymentOther}</span>}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {confirmed && confirmedItem ? (
          <div className="quickbuy-footer">
            <button className="quickbuy-btn-secondary" onClick={onClose}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Volver a la tienda
            </button>
          </div>
        ) : (
          <div className="quickbuy-footer">
            <ChannelSplitButton
              enabledChannels={enabledChannels}
              selected={selectedChannel}
              onChange={(ch) => {
                setSelectedChannel(ch);
                try { localStorage.setItem("elbisne_channel", ch); } catch (e) {}
              }}
              onClick={handleConfirm}
            />
          </div>
        )}
      </div>

      <style jsx global>{`
        .quickbuy-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(6px);
          z-index: 300;
        }

        .quickbuy-modal {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 310;
          background: var(--bg-primary);
          max-width: 500px;
          max-height: 95dvh;
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          animation: slide-up 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        @media (min-width: 1024px) {
          .quickbuy-modal {
            left: auto;
            right: 1.5rem;
            max-width: 420px;
            width: min(32vw, 420px);
          }
        }

        .quickbuy-scroll {
          overflow-y: auto;
          flex: 1;
          min-height: 0;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding-bottom: 80px;
        }

        .quickbuy-scroll::-webkit-scrollbar {
          display: none;
        }

        .quickbuy-header {
          padding: 2rem 1.5rem 0.5rem;
        }

        .quickbuy-title {
          font-family: var(--font-serif);
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .quickbuy-subtitle {
          font-size: 0.82rem;
          color: var(--text-secondary);
          margin: 0.25rem 0 0;
        }

        .quickbuy-product-preview {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          margin: 0.5rem 1.5rem 0.5rem;
          padding: 0.75rem;
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
        }

        .quickbuy-product-image-wrapper {
          width: 60px;
          height: 60px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          flex-shrink: 0;
          background: var(--bg-primary);
        }

        .quickbuy-product-image {
          object-fit: cover;
          width: 100%;
          height: 100%;
        }

        .quickbuy-product-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          min-width: 0;
        }

        .quickbuy-product-category {
          font-size: 0.7rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .quickbuy-product-name {
          font-size: 0.85rem;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .quickbuy-product-price {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--accent-green);
        }

        .quickbuy-inline-qty {
          display: flex;
          align-items: center;
          margin-top: 0.4rem;
          width: fit-content;
          border: 1px solid var(--border-color);
          border-radius: 20px;
          overflow: hidden;
          background: var(--bg-secondary);
        }

        .quickbuy-inline-qty button {
          background: transparent;
          border: none;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-primary);
          transition: background 0.15s;
        }

        .quickbuy-inline-qty button:hover:not(:disabled) {
          background: var(--border-color);
        }

        .quickbuy-inline-qty button:disabled {
          opacity: 0.25;
          cursor: default;
        }

        .quickbuy-inline-qty span {
          padding: 0 0.5rem;
          font-size: 0.85rem;
          font-weight: 600;
          min-width: 20px;
          text-align: center;
        }

        .quickbuy-qty-x {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .quickbuy-body {
          padding: 0.5rem 1.5rem 1rem;
        }

        .quickbuy-footer {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 0.5rem 1.5rem 2rem;
          background: transparent;
          box-shadow: 0 -4px 12px rgba(0,0,0,0.04);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }

        .quickbuy-btn-secondary {
          width: 100%;
          padding: 0.75rem 1.5rem;
          border-radius: 30px;
          border: 1.5px solid var(--border-color);
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          transition: background 0.2s;
        }

        .quickbuy-btn-secondary:hover {
          background: var(--border-color);
        }

        .quickbuy-summary {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          font-size: 0.85rem;
        }

        .quickbuy-section {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          color: var(--text-secondary);
        }

        .quickbuy-section strong {
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-primary);
        }

        .quickbuy-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.4rem 0;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-primary);
        }

        .quickbuy-confirmed-product {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.4rem 0;
        }

        .quickbuy-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 0.5rem;
          border-top: 2px solid var(--text-primary);
          font-size: 0.9rem;
          color: var(--text-primary);
        }

        .quickbuy-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .qfield {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .qlabel {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .qinput {
          padding: 0.6rem 0.85rem;
          border-radius: 10px;
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-family: var(--font-sans);
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;
        }

        .qinput.error {
          border-color: #e74c3c;
        }

        .qerror {
          font-size: 0.72rem;
          color: #e74c3c;
          font-weight: 500;
          line-height: 1.3;
        }

        .qradio-group {
          display: flex;
          gap: 0.5rem;
        }

        .qradio {
          flex: 1;
          padding: 0.6rem 0.85rem;
          border-radius: 12px;
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          text-align: center;
          transition: all 0.2s;
        }

        .qradio input { display: none; }

        .qradio.active {
          background: var(--text-primary);
          color: var(--accent-light);
          border-color: var(--text-primary);
        }

        .qstore-address {
          font-size: 0.85rem;
          color: var(--text-secondary);
          padding: 0.4rem 0;
        }

        .qchip-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }

        .qchip {
          padding: 0.4rem 0.75rem;
          border-radius: 18px;
          border: 1.5px solid var(--border-color);
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }

        .qchip input { display: none; }

        .qchip:hover {
          border-color: var(--text-secondary);
          background: var(--border-color);
        }

        .qchip.active {
          background: var(--text-primary) !important;
          color: var(--bg-primary) !important;
          border-color: var(--text-primary) !important;
        }

        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
