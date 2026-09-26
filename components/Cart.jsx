"use client";

import { useCallback, useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import SafeImage from "@/components/SafeImage";
import { lockBodyScroll } from "@/lib/scroll-lock";
import { useHistoryPopup } from "@/lib/use-history-popup";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { useBisneInfo } from "@/lib/use-bisne-info";
import { getChannelUrl, getDefaultChannel, getEnabledChannels, buildOrderMessage, getDeliveryMode } from "@/lib/messaging";
import { loadBisneIndex, buildBisneStoreConfig, createOrder } from "@/lib/orders";
import { groupByBisne, groupTotalLabel } from "@/lib/bisne-groups";
import ChannelSplitButton from "@/components/ChannelSplitButton";
import FavoritesPanel from "@/components/drawer/FavoritesPanel";
import Icon from "@/components/Icon";

const ProductModal = dynamic(() => import("@/components/ProductModal"), { ssr: false, loading: () => null });

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

const PAYMENT_OPTIONS = [
  "Efectivo USD",
  "Tarjeta de Crédito",
  "Tarjeta de Débito",
  "Zelle",
  "PayPal",
  "Venmo",
  "Otro",
];

export default function Cart({ cartItems, onUpdateQty, onRemoveItem, onRemoveItems, onClearCart, storeConfig, onOrderComplete }) {
  const pathname = usePathname();
  const { storeChrome, addToCart, favoriteIds, toggleFavorite, withStock, handleOrderComplete } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  // "cart" | "favorites". El cajón es una sola superficie con dos pestañas:
  // el carrito y los favoritos se abren desde el mismo sitio y comparten
  // overlay, foco y scroll, así que solo cambia el panel que se pinta.
  const [activeTab, setActiveTab] = useState("cart");
  const [openProduct, setOpenProduct] = useState(null);
  const openProductBisne = useBisneInfo(openProduct?.bisneId);
  const [step, setStep] = useState(1);
  const [showSummary, setShowSummary] = useState(false);
  const [customer, setCustomer] = useState(() => defaultCustomer(storeConfig));
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedGroup, setConfirmedGroup] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({});
  const [selectedChannel, setSelectedChannel] = useState(
    () => typeof window !== "undefined" ? (localStorage.getItem("elbisne_channel") || getDefaultChannel(storeConfig)) : getDefaultChannel(storeConfig)
  );
  const [bisneIndex, setBisneIndex] = useState(new Map());
  const [selectedBisneId, setSelectedBisneId] = useState(null);
  const [orderStatus, setOrderStatus] = useState("idle"); // idle | saving | saved | error
  const [orderError, setOrderError] = useState(null);
  // El FAB muta a "volver arriba" cuando el footer de la página es visible
  // (los catálogos lo reportan vía evento "cart-footer-visibility").
  const [isFooterVisible, setFooterVisible] = useState(false);
  const enabledChannels = useMemo(() => getEnabledChannels(storeConfig), [storeConfig]);
  const prevOpen = useRef(isOpen);

  // Índice de bisnes (público) para agrupar y contactar al vendedor real
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    loadBisneIndex().then((map) => {
      if (active) setBisneIndex(map);
    });
    return () => { active = false; };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !prevOpen.current) {
      setStep(1);
      setConfirmed(false);
      setConfirmedGroup(null);
      setSubmitted(false);
      setTouched({});
      setOrderStatus("idle");
      setOrderError(null);
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

  const groups = useMemo(() => groupByBisne(cartItems, bisneIndex), [cartItems, bisneIndex]);
  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalUSD = cartItems.reduce((acc, item) => acc + item.priceUSD * item.quantity, 0);

  // ── Checkout secuencial: se confirma un Bisne a la vez ──────────────────
  // activeBisneId deriva de selectedBisneId con fallback automático al primer
  // grupo (sin efecto: si el usuario elige otro, el estado lo cambia igual).
  const activeBisneId = selectedBisneId !== null && groups.some((g) => g.bisneId === selectedBisneId)
    ? selectedBisneId
    : groups.length > 0
      ? groups[0].bisneId
      : null;
  const activeGroup = groups.find((g) => g.bisneId === activeBisneId) || null;

  const activeTotal = activeGroup
    ? activeGroup.items.reduce((acc, item) => acc + item.priceUSD * item.quantity, 0)
    : 0;
  const remainingGroups = groups.filter((g) => g.bisneId !== activeBisneId);

  // storeConfig real del Bisne activo (WhatsApp del vendedor). Se construye
  // en cada render (barato: spread de un objeto pequeño).
  const activeBisneInfo = activeGroup?.bisneId ? bisneIndex.get(activeGroup.bisneId) || null : null;
  const activeStoreConfig = activeGroup ? buildBisneStoreConfig(storeConfig, activeBisneInfo) : storeConfig;

  const update = (field, value) => setCustomer((prev) => ({ ...prev, [field]: value }));
  const blur = (field) => setTouched((prev) => ({ ...prev, [field]: true }));

  const errors = {};
  if (!customer.name) errors.name = "¿Cómo te llamas?";
  if (!customer.phone) errors.phone = "Necesitamos tu teléfono para contactarte";
  if (customer.delivery === "delivery" && !customer.address) errors.address = "¿A dónde hacemos la entrega?";
  if (!customer.payment) errors.payment = "Selecciona un método de pago";
  if (customer.payment === "Otro" && !customer.paymentOther) errors.paymentOther = "Cuéntanos tu método de pago";

  const hasErrors = Object.keys(errors).length > 0;

  const getOrderUrl = (items, config, total) => {
    const orderData = { customer, cartItems: items, totalUSD: total };
    const message = buildOrderMessage(orderData, config);
    return getChannelUrl(selectedChannel, config, message);
  };

  const channelLabel = ({ whatsapp: "WhatsApp", telegram: "Telegram", email: "Email" })[selectedChannel] || "WhatsApp";

  const handleConfirmOrder = async () => {
    setSubmitted(true);
    if (hasErrors || !activeGroup) return;

    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));

    // 1) Mensaje por el canal elegido (experiencia principal, no bloqueante)
    const url = getOrderUrl(activeGroup.items, activeStoreConfig, activeTotal);
    if (url) window.open(url, "_blank", "noopener");

    // 2) Registrar el pedido en la DB (orders + decremento de stock vía RPC)
    setOrderStatus("saving");
    const result = await createOrder({
      bisneId: activeGroup.bisneId,
      items: activeGroup.items,
      customer,
      totalUSD: activeTotal,
      channel: selectedChannel,
    });

    if (result.ok) {
      setOrderStatus("saved");
    } else {
      setOrderStatus("error");
      setOrderError(result.error);
    }

    // 3) UI de confirmación + vaciar solo los items de este Bisne
    setConfirmedGroup(activeGroup);
    setConfirmed(true);
    if (onOrderComplete) onOrderComplete(activeGroup.items);
    onRemoveItems?.(activeGroup.items.map((item) => item.id));

    // El pedido del siguiente Bisne (si existe) se confirmará al reabrir el paso 2
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // El producto se abre siempre sobre el cajón, así que volver de él devuelve
  // al usuario donde estaba (carrito o favoritos) en vez de cerrar todo.
  const handleOpenProduct = (product) => {
    // La línea del carrito lleva id = producto + firma de opciones; el modal
    // conoce el producto por su id real (favoritos, índice de bisnes, reset).
    setOpenProduct({ ...product, id: product.productId || product.id });
  };

  // Apertura externa: el botón flotante y el corazón de la barra de navegación
  // abren el mismo cajón, cada uno en su pestaña. Por eso ya no hace falta
  // que el header ni el catálogo monten un modal de favoritos propio.
  //
  // Cada punto de entrada fija la pestaña, y el FAB usa openCart() en lugar de
  // un setIsOpen(true) suelto: si no, reabrir el cajón después de haber pasado
  // por favoritos lo devolvía a esa pestaña, y el botón del carrito tenía que
  // llevar siempre al carrito.
  const openCart = useCallback(() => { setActiveTab("cart"); setIsOpen(true); }, []);

  // "open-cart" lo emite el menú de gestión del dueño: en su propia tienda el
  // FAB se sustituye por el de publicar producto y la cabecera no lleva
  // carrito, así que sin esto no habría forma de abrir el cajón desde ahí.
  useEffect(() => {
    window.addEventListener("open-cart", openCart);
    return () => window.removeEventListener("open-cart", openCart);
  }, [openCart]);

  // Visibilidad del footer (catálogos con footer largo): FAB → scroll-top
  useEffect(() => {
    const onFooterVisibility = (e) => setFooterVisible(Boolean(e.detail?.visible));
    window.addEventListener("cart-footer-visibility", onFooterVisibility);
    return () => window.removeEventListener("cart-footer-visibility", onFooterVisibility);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const showingConfirm = confirmed && confirmedGroup;
  const itemsToShow = showingConfirm ? confirmedGroup.items : [];

  // Las pestañas son el modo de navegación. En el paso 2 (detalles) y tras
  // confirmar ceden su sitio al botón de volver y al título, porque ahí el
  // usuario está en un flujo comprometido y no debería saltar de panel.
  const isStepTwo = !confirmed && cartItems.length > 0 && step === 2;
  // Sin condicionar a cartItems: con el carrito vacío las pills tienen que
  // seguir visibles o no habría forma de llegar a Favoritos desde el FAB.
  const showTabs = !confirmed && step === 1;
  const cartCount = useMemo(
    () => cartItems.reduce((acc, item) => acc + (item.quantity || 0), 0),
    [cartItems]
  );

  const onTabKeyDown = (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = activeTab === "cart" ? "favorites" : "cart";
    setActiveTab(next);
    const id = next === "cart" ? "cart-tab-cart" : "cart-tab-favorites";
    document.getElementById(id)?.focus();
  };

  // El carrito es global (layout) y el FAB es su único punto de acceso.
  // Solo se oculta en páginas inmersivas ajenas a la compra. En el perfil del
  // dueño el FAB pasa a ser "Publicar producto"; para el visitante se mantiene.
  const FAB_HIDDEN_PREFIXES = ["/auth", "/pedido/", "/panel", "/admin", "/notificaciones"];
  const isStoreOwner = Boolean(storeChrome?.active) && Boolean(storeChrome?.isOwner);
  const showFab = !FAB_HIDDEN_PREFIXES.some((p) => pathname.startsWith(p)) && !isStoreOwner;
  const showPublishFab = isStoreOwner && !FAB_HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));

  return (
    <>
      {showPublishFab && (
        <button
          className="floating-cart-btn owner-publish-fab"
          onClick={() => window.dispatchEvent(new CustomEvent("open-publish-product"))}
          title="Publicar producto"
        >
          <span className="cart-btn-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </span>
          <span className="cart-btn-text">Publicar producto</span>
        </button>
      )}

      {showFab && (
        <button
          className={`floating-cart-btn${isFooterVisible ? " scroll-top" : ""}`}
          onClick={isFooterVisible ? scrollToTop : openCart}
        >
          <span className="cart-btn-icon">
            {isFooterVisible ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            )}
          </span>
          <span className="cart-btn-text">Mi carrito</span>
          {totalItems > 0 && <span key={totalItems} className="cart-count-badge">{totalItems}</span>}
        </button>
      )}

      <div className={`cart-overlay ${isOpen ? "open" : ""}`} onClick={handleClose} />

      <div className={`cart-drawer ${isOpen ? "open" : ""}`} ref={cartRef}>
        <div className="cart-header">
          {isStepTwo && (
            <button className="cart-header-back" onClick={() => setStep(1)} aria-label="Volver al carrito">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
          )}
          {showTabs ? (
            <div className="cart-tabs" role="tablist" aria-label="Carrito y favoritos">
              <button
                type="button"
                role="tab"
                id="cart-tab-cart"
                aria-selected={activeTab === "cart"}
                aria-controls="cart-panel-cart"
                tabIndex={activeTab === "cart" ? 0 : -1}
                className={`cart-tab${activeTab === "cart" ? " active" : ""}`}
                onClick={() => setActiveTab("cart")}
                onKeyDown={onTabKeyDown}
              >
                <Icon name="shopping-bag" size={14} />
                <span>Carrito</span>
                {cartCount > 0 && <span className="cart-tab-count">{cartCount}</span>}
              </button>
              <button
                type="button"
                role="tab"
                id="cart-tab-favorites"
                aria-selected={activeTab === "favorites"}
                aria-controls="cart-panel-favorites"
                tabIndex={activeTab === "favorites" ? 0 : -1}
                className={`cart-tab${activeTab === "favorites" ? " active" : ""}`}
                onClick={() => setActiveTab("favorites")}
                onKeyDown={onTabKeyDown}
              >
                <Icon name="heart-donate" size={14} />
                <span>Favoritos</span>
                {favoriteIds.length > 0 && <span className="cart-tab-count">{favoriteIds.length}</span>}
              </button>
            </div>
          ) : (
            <h2>{confirmed ? "¡Pedido confirmado!" : isStepTwo ? "Detalles" : "Tu Carrito"}</h2>
          )}
          {showTabs && <h2 className="sr-only">{activeTab === "favorites" ? "Tus favoritos" : "Tu Carrito"}</h2>}
          <button className="modal-close" onClick={handleClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div
          className="cart-items-container"
          id={activeTab === "favorites" ? "cart-panel-favorites" : "cart-panel-cart"}
          role="tabpanel"
          aria-labelledby={activeTab === "favorites" ? "cart-tab-favorites" : "cart-tab-cart"}
        >
          {activeTab === "favorites" ? (
            <FavoritesPanel onOpenProduct={handleOpenProduct} bisneIndex={bisneIndex} />
          ) : showingConfirm ? (
            <>
              <div className="cart-confirmed">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <h3>¡Pedido Enviado!</h3>
                <p>
                  {confirmedGroup.name ? `Tu pedido a ${confirmedGroup.name}` : "Tu pedido"} fue enviado por {channelLabel}.
                  {orderStatus === "saved" && " Quedó registrado en la tienda."}
                  <br />Te confirmaremos pronto.
                </p>

                {orderStatus === "error" && (
                  <div className="cart-order-warning">
                    <Icon name="warning" size={14} />
                    No pudimos registrar tu pedido en línea ({orderError}). El vendedor lo recibió por {channelLabel}.
                  </div>
                )}

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
                {remainingGroups.length > 0 ? (
                  <button
                    className="btn-checkout"
                    onClick={() => {
                      // Continuar con el siguiente Bisne
                      setConfirmed(false);
                      setConfirmedGroup(null);
                      setSubmitted(false);
                      setOrderStatus("idle");
                      setOrderError(null);
                      setSelectedBisneId(remainingGroups[0].bisneId);
                      setStep(2);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    <span>Siguiente pedido ({remainingGroups.length} {remainingGroups.length === 1 ? "tienda" : "tiendas"})</span>
                    <span className="btn-checkout-total">
                      ${remainingGroups.reduce((s, g) => s + g.items.reduce((a, i) => a + i.priceUSD * i.quantity, 0), 0).toFixed(2)}
                    </span>
                  </button>
                ) : (
                  <button className="btn-back-store" onClick={handleClose}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="19" y1="12" x2="5" y2="12"></line>
                      <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    Volver a la tienda
                  </button>
                )}
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
          /* El fundido solo se aplica al cambiar de paso. Este div vive únicamente
             en la rama del carrito, así que al ir a Favoritos y volver se
             remonta y la animación se repetía sola, con un parpadeo al cambiar
             de pestaña. Como las pills solo existen en el paso 1, ahí el
             fundido no aporta nada. */
          <div className={`cart-step-animated${step === 1 ? "" : " is-animated"}`} key={step}>
          {step === 1 ? (
            <>
              {groups.map((group) => {
                return (
                  <div className="cart-bisne-group" key={group.bisneId || "sin-bisne"}>
                    <div className="cart-bisne-header">
                      {group.handle ? (
                        <a href={`/${group.handle}`} className="cart-bisne-name" onClick={(e) => { e.preventDefault(); window.location.href = `/${group.handle}`; }}>
                          <Icon name="shopping-bag" size={13} />
                          {group.name || "Tienda"}
                        </a>
                      ) : (
                        <span className="cart-bisne-name">
                          <Icon name="shopping-bag" size={13} />
                          {group.name || "Productos del catálogo"}
                        </span>
                      )}
                      <span className="cart-bisne-total">{groupTotalLabel(group, true)}</span>
                    </div>

                    {group.items.map((item) => (
                      <div className="cart-item" key={item.id}>
                        <div className="cart-item-image-wrapper cart-item-open" onClick={() => handleOpenProduct(item)}>
                          <SafeImage src={item.image} alt={item.name} width={80} height={80} className="cart-item-image" />
                        </div>
                        <div className="cart-item-details">
                          {item.category && <span className="cart-item-category">{item.category}</span>}
                          <span className="cart-item-title cart-item-open" onClick={() => handleOpenProduct(item)}>{item.name}</span>
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
                              <button
                                className="qty-btn"
                                onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                                title="Aumentar cantidad"
                                disabled={item.stock != null && isFinite(item.stock) && item.quantity >= item.stock}
                              >
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
                  </div>
                );
              })}
            </>
          ) : (
            <>
              {/* ── Selector multi-tienda (solo si hay varios Bisnes) ── */}
              {groups.length > 1 && (
                <div className="cart-multistore-picker">
                  <p className="cart-multistore-label">
                    Tienes productos de {groups.length} tiendas. Cada pedido se envía por separado a su tienda.
                  </p>
                  <div className="cart-multistore-options">
                    {groups.map((group) => {
                      const groupTotal = group.items.reduce((acc, item) => acc + item.priceUSD * item.quantity, 0);
                      const isActive = group.bisneId === activeBisneId;
                      return (
                        <button
                          key={group.bisneId || "sin-bisne"}
                          type="button"
                          className={`cart-multistore-option${isActive ? " active" : ""}`}
                          onClick={() => setSelectedBisneId(group.bisneId)}
                        >
                          <span className="cart-multistore-name">
                            <Icon name="shopping-bag" size={13} />
                            {group.name || "Productos del catálogo"}
                          </span>
                          <span className="cart-multistore-meta">
                            {group.items.reduce((a, i) => a + i.quantity, 0)} {group.items.reduce((a, i) => a + i.quantity, 0) === 1 ? "artículo" : "artículos"} · ${groupTotal.toFixed(2)}
                          </span>
                          {isActive && <span className="cart-multistore-check"><Icon name="check" size={12} /></span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="cart-order-summary">
                <button className="cart-summary-toggle" onClick={() => setShowSummary(!showSummary)}>
                  <span>Tus productos ({activeGroup ? activeGroup.items.length : cartItems.length})</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`summary-chevron${showSummary ? " open" : ""}`}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {showSummary && (
                  <div className="cart-summary-items">
                    {(activeGroup ? activeGroup.items : cartItems).map((item) => (
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
                      <span>${(activeGroup ? activeTotal : totalUSD).toFixed(2)}</span>
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
                  <input className={`checkout-input${submitted && errors.phone ? " error" : ""}`} type="tel" placeholder="Ej. +53 5 123 4567" value={customer.phone} onChange={(e) => update("phone", e.target.value)} onBlur={() => blur("phone")} />
                  {submitted && errors.phone && <span className="cerror">{errors.phone}</span>}
                </div>
                {(() => {
                  const mode = getDeliveryMode(activeStoreConfig);
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
                              {activeStoreConfig.location}
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
                          {activeStoreConfig.location}
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

        {activeTab === "cart" && isStepTwo && (
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

        {activeTab === "cart" && !confirmed && cartItems.length > 0 && step === 1 && (
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

      {/* Un solo ProductModal para toda la superficie: lo usan tanto las líneas
          del carrito como las de favoritos. Va después del cajón para montarse
          por encima de él. */}
      <ProductModal
        product={withStock(openProduct)}
        onClose={() => setOpenProduct(null)}
        onAddToCart={addToCart}
        storeConfig={storeConfig}
        onOrderComplete={handleOrderComplete}
        isFavorited={openProduct ? favoriteIds.includes(openProduct.id) : false}
        onToggleFavorite={toggleFavorite}
        bisneInfo={openProductBisne}
      />

    </>
  );
}
