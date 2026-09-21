"use client";

import dynamic from "next/dynamic";
import { useApp } from "@/context/AppContext";

const Cart = dynamic(() => import("@/components/Cart"), { ssr: false, loading: () => null });
const SearchModal = dynamic(() => import("@/components/search/SearchModal"), { ssr: false, loading: () => null });
const ProfileAuthModal = dynamic(() => import("@/components/auth/ProfileAuthModal"), { ssr: false, loading: () => null });

// ── Popups globales del layout ───────────────────────────────────────────
//  · Carrito: botón flotante (FAB) + evento "open-cart"
//  · Búsqueda: icono de buscador del TopNav → evento "open-search"
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
