"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import SafeImage from "@/components/SafeImage";
import { lockBodyScroll } from "@/lib/scroll-lock";
import { useHistoryPopup } from "@/lib/use-history-popup";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { getChannelUrl, getDefaultChannel, getEnabledChannels, buildOrderMessage, getDeliveryMode } from "@/lib/messaging";
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

export default function Cart({ cartItems, onUpdateQty, onRemoveItem, onClearCart, storeConfig, onOrderComplete, isFooterVisible, scrollToTop, onEditItem }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [showSummary, setShowSummary] = useState(false);
  const [customer, setCustomer] = useState(() => defaultCustomer(storeConfig));
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedItems, setConfirmedItems] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({});
  const [selectedChannel, setSelectedChannel] = useState(
    () => typeof window !== "undefined" ? (localStorage.getItem("elbisne_channel") || getDefaultChannel(storeConfig)) : getDefaultChannel(storeConfig)
  );
  const enabledChannels = useMemo(() => getEnabledChannels(storeConfig), [storeConfig]);
  const prevOpen = useRef(isOpen);

  useEffect(() => {
    if (isOpen && !prevOpen.current) {
      setStep(1);
      setConfirmed(false);
      setConfirmedItems(null);
      setSubmitted(false);
      setTouched({});
    }
    prevOpen.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      return lockBodyScroll();
    }
  }, [isOpen]);

  useHistoryPopup(isOpen, () => setIsOpen(false));
  const cartRef = useFocusTrap(isOpen);

  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalUSD = cartItems.reduce((acc, item) => acc + item.priceUSD * item.quantity, 0);

  const update = (field, value) => setCustomer((prev) => ({ ...prev, [field]: value }));
  const blur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));

  const errors = {};
  if (!customer.name) errors.name = "¿Cómo te llamas?";
  if (!customer.phone) errors.phone = "Necesitamos tu teléfono para contactarte";
  if (customer.delivery === "delivery" && !customer.address) errors.address = "¿A dónde hacemos la entrega?";
  if (!customer.payment) errors.payment = "Selecciona un método de pago";
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

  const getOrderUrl = () => {
    const orderData = { customer, cartItems, totalUSD };
    const message = buildOrderMessage(orderData, storeConfig);
    return getChannelUrl(selectedChannel, storeConfig, message);
  };

  const channelLabel = ({ whatsapp: "WhatsApp", telegram: "Telegram", email: "Email" })[selectedChannel] || "WhatsApp";

  const handleConfirmOrder = () => {
    setSubmitted(true);
    if (hasErrors) return;
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
    setConfirmedItems(cartItems.map((item) => ({ ...item })));
    setConfirmed(true);
    if (onOrderComplete) onOrderComplete();
    setTimeout(() => onClearCart(), 300);
    window.open(getOrderUrl(), "_blank");
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const showingConfirm = confirmed && confirmedItems;
  const itemsToShow = showingConfirm ? confirmedItems : [];

  return (
    <>
      <button
        className={`floating-cart-btn${isFooterVisible ? " scroll-top" : ""}`}
        onClick={isFooterVisible ? scrollToTop : () => setIsOpen(true)}
      >
        <span className="cart-btn-icon">
          {isFooterVisible ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          )}
        </span>
        <span className="cart-btn-text">Mi carrito</span>
        {totalItems > 0 && <span className="cart-count-badge">{totalItems}</span>}
      </button>

      <div className={`cart-overlay ${isOpen ? "open" : ""}`} onClick={handleClose} />

      <div className={`cart-drawer ${isOpen ? "open" : ""}`} ref={cartRef}>
        <div className="cart-header">
          <h2>{confirmed ? "¡Pedido confirmado!" : "Tu Carrito"}</h2>
          {!confirmed && cartItems.length > 0 && (
            <div className="cart-step-pill">
              <button className={`pill-btn${step === 1 ? " active" : ""}`} onClick={() => setStep(1)}>Carrito</button>
              <button className={`pill-btn${step === 2 ? " active" : ""}`} onClick={() => setStep(2)}>Detalles</button>
            </div>
          )}
          <button className="modal-close" onClick={handleClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="cart-items-container">
          {showingConfirm ? (
            <>
              <div className="cart-confirmed">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <h3>¡Pedido Enviado!</h3>
                <p>Tu pedido fue enviado por {channelLabel}.<br />Te confirmaremos pronto.</p>

                <div className="cart-confirmed-details">
                  <div className="cart-confirmed-section">
                    <strong>Cliente</strong>
                    <span>{customer.name} — {customer.phone}</span>
                    <span>{customer.delivery === "delivery" ? `Entrega: ${customer.address}` : "Recogida en tienda"}</span>
                    <span>Pago: {customer.payment}{customer.paymentOther ? ` (${customer.paymentOther})` : ""}</span>
                  </div>

                  <div className="cart-confirmed-section">
                    <strong>Productos</strong>
                    {itemsToShow.map((item) => (
                      <div className="cart-confirmed-product" key={item.id}>
                        <div className="cart-confirmed-product-image-wrapper">
                          <SafeImage src={item.image} alt={item.name} width={60} height={60} className="cart-confirmed-product-image" />
                        </div>
                        <div className="cart-confirmed-product-info">
                          {item.category && <span className="cart-confirmed-product-category">{item.category}</span>}
                          <strong className="cart-confirmed-product-name">{item.quantity}x {item.name}</strong>
                          {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                            <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", display: "block", marginTop: "0.1rem" }}>
                              {Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(" | ")}
                            </span>
                          )}
                          <span className="cart-confirmed-product-price">${item.priceUSD.toFixed(2)}</span>
                        </div>
                        <span className="cart-confirmed-product-total">${(item.priceUSD * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="cart-confirmed-total">
                    <strong>Total</strong>
                    <span>${itemsToShow.reduce((s, i) => s + i.priceUSD * i.quantity, 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="cart-footer">
                <button className="btn-back-store" onClick={handleClose}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                  Volver a la tienda
                </button>
              </div>
            </>
          ) : cartItems.length === 0 ? (
            <>
              <div className="cart-empty-message">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                <p>Tu carrito está vacío.</p>
              </div>
              <div className="cart-footer">
                <button className="btn-back-store" onClick={handleClose}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                  Volver a la tienda
                </button>
              </div>
            </>
          ) : (
          <div className="cart-step-animated" key={step}>
          {step === 1 ? (
            <>
              {cartItems.map((item) => (
                <div className="cart-item" key={item.id}>
                  <div className="cart-item-image-wrapper" onClick={() => onEditItem?.(item)} style={{ cursor: "pointer" }}>
                    <SafeImage src={item.image} alt={item.name} width={80} height={80} className="cart-item-image" />
                  </div>
                  <div className="cart-item-details">
                    {item.category && <span className="cart-item-category">{item.category}</span>}
                    <span className="cart-item-title" onClick={() => onEditItem?.(item)} style={{ cursor: "pointer" }}>{item.name}</span>
                    {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>
                        {Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(" | ")}
                      </span>
                    )}
                    <span className="cart-item-price">${item.priceUSD.toFixed(2)}</span>
                    <div className="cart-item-actions">
                      <div className="cart-item-qty-controls">
                        <button className="qty-btn" onClick={() => onUpdateQty(item.id, item.quantity - 1)} title="Disminuir cantidad">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                        </button>
                        <span className="qty-value">{item.quantity}</span>
                        <button className="qty-btn" onClick={() => onUpdateQty(item.id, item.quantity + 1)} title="Aumentar cantidad">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                        </button>
                      </div>
                      <button className="btn-remove-item" onClick={() => onRemoveItem(item.id)} title="Quitar producto">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="cart-order-summary">
                <button className="cart-summary-toggle" onClick={() => setShowSummary(!showSummary)}>
                  <span>Tus productos ({cartItems.length})</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`summary-chevron${showSummary ? " open" : ""}`}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {showSummary && (
                  <div className="cart-summary-items">
                    {cartItems.map((item) => (
                      <div className="cart-summary-item" key={item.id}>
                        <div className="cart-summary-item-img">
                          <SafeImage src={item.image} alt={item.name} width={44} height={44} />
                        </div>
                        <div className="cart-summary-item-info">
                          <span className="cart-summary-item-name">{item.name}</span>
                          <span className="cart-summary-item-qty">{item.quantity}x ${item.priceUSD.toFixed(2)}</span>
                        </div>
                        <span className="cart-summary-item-total">${(item.priceUSD * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="cart-summary-total">
                      <span>Total</span>
                      <span>${totalUSD.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="cart-checkout-form">
                <div className="checkout-field">
                  <label className="checkout-label">Nombre *</label>
                  <input className={`checkout-input${submitted && errors.name ? " error" : ""}`} type="text" placeholder="Escribe tu nombre completo" value={customer.name} onChange={(e) => update("name", e.target.value)} onBlur={() => blur("name")} />
                  {submitted && errors.name && <span className="cerror">{errors.name}</span>}
                </div>
                <div className="checkout-field">
                  <label className="checkout-label">Teléfono *</label>
                  <input className={`checkout-input${submitted && errors.phone ? " error" : ""}`} type="tel" placeholder="Ej. +57 300 123 4567" value={customer.phone} onChange={(e) => update("phone", e.target.value)} onBlur={() => blur("phone")} />
                  {submitted && errors.phone && <span className="cerror">{errors.phone}</span>}
                </div>
                {(() => {
                  const mode = getDeliveryMode(storeConfig);
                  if (mode === "none") return null;
                  const isDelivery = customer.delivery === "delivery";
                  return (
                    <div className="checkout-field">
                      <label className="checkout-label">
                        {mode === "both" ? "Recogida / Entrega *" : mode === "delivery" ? "Dirección de entrega *" : "Lugar de recogida"}
                      </label>
                      {mode === "both" ? (
                        <>
                          <div className="checkout-radio-group">
                            <label className={`checkout-radio ${customer.delivery === "pickup" ? "active" : ""}`}>
                              <input type="radio" name="delivery" value="pickup" checked={customer.delivery === "pickup"} onChange={(e) => update("delivery", e.target.value)} />
                              Recoger en tienda
                            </label>
                            <label className={`checkout-radio ${customer.delivery === "delivery" ? "active" : ""}`}>
                              <input type="radio" name="delivery" value="delivery" checked={customer.delivery === "delivery"} onChange={(e) => update("delivery", e.target.value)} />
                              Entrega a domicilio
                            </label>
                          </div>
                          {isDelivery ? (
                            <>
                              <input className={`checkout-input${submitted && errors.address ? " error" : ""}`} type="text" placeholder="Dirección, ciudad, código postal" value={customer.address} onChange={(e) => update("address", e.target.value)} onBlur={() => blur("address")} />
                              {submitted && errors.address && <span className="cerror">{errors.address}</span>}
                            </>
                          ) : (
                            <p className="checkout-store-address">
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
                          <input className={`checkout-input${submitted && errors.address ? " error" : ""}`} type="text" placeholder="Dirección, ciudad, código postal" value={customer.address} onChange={(e) => update("address", e.target.value)} onBlur={() => blur("address")} />
                          {submitted && errors.address && <span className="cerror">{errors.address}</span>}
                        </>
                      ) : (
                        <p className="checkout-store-address">
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
                <div className="checkout-field">
                  <label className="checkout-label">Método de pago *</label>
                  <div className="checkout-payment-grid">
                    {PAYMENT_OPTIONS.map((opt) => (
                      <label key={opt} className={`checkout-payment-chip ${customer.payment === opt ? "active" : ""}`}>
                        <input type="radio" name="payment" value={opt} checked={customer.payment === opt} onChange={(e) => { update("payment", e.target.value); blur("payment"); }} />
                        {opt}
                      </label>
                    ))}
                  </div>
                  {submitted && errors.payment && <span className="cerror">{errors.payment}</span>}
                  {customer.payment === "Otro" && (
                    <>
                      <input className={`checkout-input${submitted && errors.paymentOther ? " error" : ""}`} type="text" placeholder="Describe tu método de pago" value={customer.paymentOther} onChange={(e) => update("paymentOther", e.target.value)} onBlur={() => blur("paymentOther")} style={{ marginTop: "0.5rem" }} />
                      {submitted && errors.paymentOther && <span className="cerror">{errors.paymentOther}</span>}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
          </div>
          )}
        </div>

        {!confirmed && cartItems.length > 0 && step === 2 && (
          <div className="cart-footer">
            <ChannelSplitButton
              enabledChannels={enabledChannels}
              selected={selectedChannel}
              onChange={(ch) => {
                setSelectedChannel(ch);
                try { localStorage.setItem("elbisne_channel", ch); } catch (e) {}
              }}
              onClick={handleConfirmOrder}
            />
          </div>
        )}

        {!confirmed && cartItems.length > 0 && step === 1 && (
          <div className="cart-footer">
            <button className="btn-checkout" onClick={() => setStep(2)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span>Continuar</span>
              <span className="btn-checkout-total">${totalUSD.toFixed(2)}</span>
            </button>
          </div>
        )}
      </div>

    </>
  );
}
