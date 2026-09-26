"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { lockBodyScroll } from "@/lib/scroll-lock";
import { useHistoryPopup } from "@/lib/use-history-popup";
import Icon from "@/components/Icon";
import { useApp } from "@/context/AppContext";

const DISMISS_KEY = "elbisne_account_suggestion_dismissed";

// Sugerencia opcional de cuenta: pide crear una cuenta en elBisne sin limitar
// ni obligar al visitante no registrado. Se muestra una sola vez, se cierra con
// Escape/click fuera/"Ahora no"/atrás, y el sitio es 100% navegable y comprable
// sin cuenta.
export default function CustomerInfoModal({ storeConfig }) {
  const { isLoggedIn } = useApp();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      // Solo visitantes no registrados y que no la hayan descartado antes
      if (!dismissed && !isLoggedIn) {
        const ref = new URLSearchParams(window.location.search).get("ref");
        const isSharedVisit = ref === "shared";
        const isDirectVisit = !document.referrer && window.history.length <= 2;
        if (isSharedVisit || isDirectVisit) {
          const t = setTimeout(() => setVisible(true), 1200); // no interrumpe la primera carga
          return () => clearTimeout(t);
        }
      }
    } catch (e) { /* noop */ }
  }, [isLoggedIn]);

  const handleClose = useCallback(() => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch (e) { /* noop */ }
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const unlock = lockBodyScroll();
    const handler = (e) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      unlock();
    };
  }, [visible, handleClose]);

  useHistoryPopup(visible, handleClose);

  if (!visible) return null;

  return (
    <div className="store-info-overlay" onClick={handleClose}>
      <div className="store-info-modal account-suggestion" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Crea tu cuenta en elBisne">
        <button className="modal-close" onClick={handleClose} aria-label="Cerrar">
          <Icon name="close" size={20} />
        </button>

        <div className="account-suggestion-body">
          {storeConfig.logoUrl && (
            <Image
              src={storeConfig.logoUrl}
              alt=""
              width={52}
              height={52}
              style={{ borderRadius: "50%", objectFit: "cover", margin: "0 auto 0.75rem", display: "block" }}
            />
          )}
          <h2 className="account-suggestion-title">Crea tu cuenta en elBisne</h2>
          <p className="account-suggestion-text">
            Guarda tus productos favoritos, sigue tus bisnes preferidos y haz pedidos más rápido.
            <strong> Es opcional:</strong> puedes seguir explorando y comprando sin cuenta.
          </p>

          <div className="account-suggestion-perks">
            <span><Icon name="heart-outline" size={14} /> Favoritos sincronizados</span>
            <span><Icon name="heart-donate" size={14} /> Seguir bisnes</span>
            <span><Icon name="shopping-bag" size={14} /> Historial de pedidos</span>
          </div>

          <Link href="/perfil" className="account-suggestion-cta" onClick={handleClose}>
            Crear cuenta gratis
          </Link>
          <button type="button" className="account-suggestion-later" onClick={handleClose}>
            Ahora no, seguir explorando
          </button>
        </div>
      </div>
    </div>
  );
}
