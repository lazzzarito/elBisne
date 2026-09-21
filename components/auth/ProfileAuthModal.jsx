"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { lockBodyScroll } from "@/lib/scroll-lock";
import { useHistoryPopup } from "@/lib/use-history-popup";
import { useFocusTrap } from "@/lib/use-focus-trap";
import AuthSteps from "@/components/auth/AuthSteps";
import Icon from "@/components/Icon";

// ── Popup de perfil sin sesión (mismo drawer que el carrito) ─────────────
// El icono de perfil del TopNav abre este bottom-sheet con el registro en
// pasos (el mismo contenido que tenía /perfil sin sesión). Si ya hay sesión,
// el icono navega directo a /perfil y este popup ni se abre.
export default function ProfileAuthModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // Apertura externa desde el icono de perfil del TopNav
  useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener("open-profile-auth", open);
    return () => window.removeEventListener("open-profile-auth", open);
  }, []);

  useEffect(() => {
    if (isOpen) {
      return lockBodyScroll();
    }
  }, [isOpen]);

  const close = () => setIsOpen(false);

  useHistoryPopup(isOpen, close);
  const drawerRef = useFocusTrap(isOpen);

  // Cuenta creada / sesión iniciada: cerrar y refrescar (el AppContext ya
  // actualizó el usuario vía onAuthStateChange).
  const handleDone = () => {
    setIsOpen(false);
    router.refresh();
  };

  return (
    <>
      <div className={`cart-overlay ${isOpen ? "open" : ""}`} onClick={close} />

      <div className={`cart-drawer ${isOpen ? "open" : ""}`} ref={drawerRef} role="dialog" aria-modal="true" aria-label="Iniciar sesión o crear cuenta">
        <div className="cart-header">
          <h2>Tu cuenta</h2>
          <button className="modal-close" onClick={close} aria-label="Cerrar">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="cart-items-container auth-drawer-body">
          <AuthSteps onDone={handleDone} />
        </div>
      </div>
    </>
  );
}
