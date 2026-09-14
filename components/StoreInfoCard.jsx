"use client";

import { useState, useRef, useEffect } from "react";
import Icon from "@/components/Icon";
import { getChannelUrl, getDefaultChannel, getEnabledChannels, getDeliveryMode } from "@/lib/messaging";

export function StoreInfoItem({ icon, strong, children, href, onClick }) {
  const content = (
    <>
      <Icon name={icon} />
      <div>
        <strong>{strong}</strong>
        <p>{children}</p>
      </div>
    </>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="store-info-item" style={{ cursor: "pointer", textDecoration: "none", color: "inherit", display: "flex" }}>
        {content}
      </a>
    );
  }

  return (
    <div className="store-info-item" style={{ cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      {content}
    </div>
  );
}

export default function StoreInfoCard({ storeConfig, showHowToBuy = false, onOpenLegal }) {
  const [selectedChannel, setSelectedChannel] = useState(
    () => typeof window !== "undefined" ? (localStorage.getItem("elbisne_channel") || getDefaultChannel(storeConfig)) : getDefaultChannel(storeConfig)
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const contactRef = useRef(null);
  const enabledChannels = getEnabledChannels(storeConfig);
  const deliveryMode = getDeliveryMode(storeConfig);
  const locationHref = storeConfig.googleMapsUrl || `https://www.google.com/maps/search/${encodeURIComponent(storeConfig.location || "")}`;

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      if (contactRef.current && !contactRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  const channelContact = (presetMsg) => {
    return getChannelUrl(selectedChannel, storeConfig, presetMsg);
  };

  const channelLabel = ({ whatsapp: "WhatsApp", telegram: "Telegram", email: "Email" })[selectedChannel] || "WhatsApp";

  const channelValue = () => {
    const msg = storeConfig.messaging || {};
    const ch = msg.channels?.[selectedChannel] || {};
    if (selectedChannel === "telegram") return `@${ch.username || "username"}`;
    if (selectedChannel === "email") return ch.address || "email@example.com";
    const num = ch.number || storeConfig.whatsappNumber || "+15551234567";
    return num;
  };

  const handleChannelChange = (ch) => {
    setSelectedChannel(ch);
    try { localStorage.setItem("elbisne_channel", ch); } catch (e) {}
    setDropdownOpen(false);
  };

  return (
    <>
      {deliveryMode !== "none" && (
        <StoreInfoItem icon="map-pin" strong="Ubicación" href={locationHref}>
          {storeConfig.location}
        </StoreInfoItem>
      )}

      <div className="store-info-item channel-contact-item" ref={contactRef}>
        <a href={channelContact("Hola, tengo una pregunta sobre sus productos")} target="_blank" rel="noopener noreferrer" className="store-info-item-link">
          <Icon name={selectedChannel} />
          <div>
            <strong>{channelLabel}</strong>
            <p>{channelValue()}</p>
          </div>
        </a>
        {enabledChannels.length > 1 && (
          <button className="channel-contact-toggle" onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }} aria-label="Cambiar canal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}
        {dropdownOpen && (
          <div className="channel-split-dropdown">
            {enabledChannels.map((ch) => (
              <button key={ch.id} className={`channel-split-option${selectedChannel === ch.id ? " active" : ""}`} onClick={() => handleChannelChange(ch.id)}>
                <Icon name={ch.icon} />
                {ch.label}
                {selectedChannel === ch.id && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto" }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <StoreInfoItem icon="clock" strong="Horario" href={channelContact("Hola, me gustaría saber su horario de atención")}>
        {storeConfig.businessHours || "Lunes - Sábado, 9:00 AM — 6:00 PM"}
      </StoreInfoItem>

      {deliveryMode !== "none" && (
        <StoreInfoItem icon="truck" strong="Entregas" href={channelContact("Hola, necesito información sobre los envíos")}>
          {storeConfig.deliveriesInfo || "Envíos coordinados en la zona"}
        </StoreInfoItem>
      )}

      {onOpenLegal && (
        <StoreInfoItem icon="info" strong="Información legal" onClick={onOpenLegal}>
          Cookies, Privacidad y Términos
        </StoreInfoItem>
      )}

      {storeConfig.donationUrl && (
        <a href={storeConfig.donationUrl} target="_blank" rel="noopener noreferrer" className="store-info-item" style={{ cursor: "pointer", textDecoration: "none", color: "inherit", display: "flex" }}>
          <Icon name="heart-donate" />
          <div>
            <strong style={{ color: "#e74c3c" }}>Apoya el proyecto</strong>
            <p>Invítanos un café ❤️</p>
          </div>
        </a>
      )}

      {showHowToBuy && (
        <div className="store-info-howto">
          <h3>¿Cómo comprar?</h3>
          <ol>
            <li>Explora el catálogo y toca + para añadir productos.</li>
            <li>Ábre el carrito (botón flotante abajo).</li>
            <li>Toca Confirmar para enviarnos tu pedido.</li>
          </ol>
        </div>
      )}
    </>
  );
}
