"use client";

import Image from "next/image";
import { useRef, useState, useEffect } from "react";
import StoreInfoCard from "@/components/StoreInfoCard";
import Icon from "@/components/Icon";

// Footer global del sitio (UI_UX.md §4.8): idéntico al de la plantilla de los
// bisnes (legal, contacto, redes) — es información global, vive solo en
// Home/Explorar. La plantilla de tienda no lo duplica.
export default function SiteFooter({ storeConfig }) {
  const footerRef = useRef(null);

  const socialLinks = [
    { key: "instagram", label: "Instagram", href: storeConfig.socialLinks?.instagram },
    { key: "facebook", label: "Facebook", href: storeConfig.socialLinks?.facebook },
    { key: "whatsapp", label: "WhatsApp", href: `https://wa.me/${(storeConfig.whatsappNumber || "").replace(/[^\d]/g, "")}` },
  ].filter((s) => s.href);

  return (
    <footer className="app-footer-minimal site-footer" ref={footerRef}>
      <div className="footer-store-card">
        <div className="footer-store-header">
          {storeConfig.logoUrl && (
            <div className="footer-store-logo">
              <Image src={storeConfig.logoUrl} alt={storeConfig.name} width={36} height={36} style={{ borderRadius: "50%", objectFit: "cover" }} />
            </div>
          )}
          <div className="footer-store-header-left">
            <h3 className="footer-store-name">{storeConfig.name}</h3>
            <span className="store-info-badge">Catálogo en línea</span>
          </div>
          <div className="social-links">
            {socialLinks.map((s) => (
              <a
                key={s.key}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="social-icon-btn"
                title={s.label}
                aria-label={s.label}
              >
                <Icon name={s.key === "whatsapp" ? "whatsapp" : s.key} size={16} />
              </a>
            ))}
          </div>
        </div>

        <div className="footer-store-grid">
          <StoreInfoCard storeConfig={storeConfig} onOpenLegal={() => window.dispatchEvent(new CustomEvent("open-legal-modal"))} />
        </div>
      </div>

      <div className="footer-bottom-row">
        <div className="app-footer-copyright">
          &copy; {new Date().getFullYear()} elBisne. Todos los derechos reservados.
          <span className="footer-credits-text">
            {" "}Hecho con <span style={{ color: "#e74c3c" }}>❤️‍🔥</span> por{" "}
            <a
              href="https://github.com/lazzzarito/elBisne"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent-green)", fontWeight: 600, textDecoration: "none" }}
            >
              1azarito
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
