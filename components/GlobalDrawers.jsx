"use client";

import dynamic from "next/dynamic";
import { useApp } from "@/context/AppContext";

const Cart = dynamic(() => import("@/components/Cart"), { ssr: false, loading: () => null });
const SearchModal = dynamic(() => import("@/components/search/SearchModal"), { ssr: false, loading: () => null });
const ProfileAuthModal = dynamic(() => import("@/components/auth/ProfileAuthModal"), { ssr: false, loading: () => null });

// ── Popups globales del layout ───────────────────────────────────────────
//  · Carrito + Favoritos: botón flotante (FAB) y, en la página del propio
//    bisne, el item "Mi carrito" del menú de gestión → evento "open-cart".
//    Comparten un único cajón con pestañas, y ese cajón es también quien
//    monta el ProductModal.
//  · Búsqueda: en la home el campo del TopNav transforma la página; en el resto
//    de rutas, Enter → evento "open-search" (este mismo drawer)
//  · Perfil sin sesión: icono de perfil del TopNav → evento "open-profile-auth"
// Se montan una sola vez aquí; los drawers controlan su propia visibilidad.
export default function GlobalDrawers({ storeConfig }) {
  const {
    cartItems,
    updateQty,
    removeItem,
    removeItems,
    clearCart,
    handleOrderComplete,
  } = useApp();

  return (
    <>
      <Cart
        cartItems={cartItems}
        onUpdateQty={updateQty}
        onRemoveItem={removeItem}
        onRemoveItems={removeItems}
        onClearCart={clearCart}
        storeConfig={storeConfig}
        onOrderComplete={handleOrderComplete}
      />
      <SearchModal storeConfig={storeConfig} />
      <ProfileAuthModal />
    </>
  );
}
