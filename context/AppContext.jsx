"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const AppContext = createContext(null);

export function useApp() {
  return useContext(AppContext);
}

export function AppProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [soldMap, setSoldMap] = useState({});
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState("success");
  const [undoItem, setUndoItem] = useState(null);
  const undoTimeoutRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const persistTimerRef = useRef(null);
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (!isClient) return;
    const timer = window.setTimeout(() => {
      try {
        const cart = localStorage.getItem("elbisne_cart");
        if (cart) setCartItems(JSON.parse(cart));
        const sold = localStorage.getItem("elbisne_sold");
        if (sold) setSoldMap(JSON.parse(sold));
        const favs = localStorage.getItem("elbisne_favorites");
        if (favs) setFavoriteIds(JSON.parse(favs));
      } catch (e) {
        console.error("Error reading localStorage:", e);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isClient]);

  const showToast = useCallback((message, type = "success") => {
    setToast(message);
    setToastType(type);
    window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
      setUndoItem(null);
    }, 3000);
  }, []);

  useEffect(() => {
    if (!isClient || !isSupabaseConfigured()) return;
    let active = true;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data?.session) setUser(data.session.user);
      setAuthLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [isClient]);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch (e) {
        console.error("Error al cerrar sesión:", e);
      }
    }
    setUser(null);
    setAuthLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      window.clearTimeout(toastTimeoutRef.current);
      window.clearTimeout(undoTimeoutRef.current);
    };
  }, []);

  const persistCart = useCallback((items) => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      try { localStorage.setItem("elbisne_cart", JSON.stringify(items)); } catch (e) {}
      persistTimerRef.current = null;
    }, 300);
  }, []);

  const recordSale = useCallback((productId, qty) => {
    setSoldMap((prev) => {
      const next = { ...prev };
      next[productId] = (next[productId] || 0) + qty;
      try { localStorage.setItem("elbisne_sold", JSON.stringify(next)); } catch (e) {}
      return next;
    });
  }, []);

  const toEffectiveProduct = useCallback((product) => {
    if (!product) return product;
    const sold = soldMap[product.id] || 0;
    const baseStock = product.stock === undefined || product.stock === null ? Infinity : product.stock;
    const effectiveStock = Math.max(0, baseStock - sold);
    return { ...product, stock: effectiveStock };
  }, [soldMap]);

  const undoRemove = useCallback(() => {
    if (!undoItem) return;
    window.clearTimeout(undoTimeoutRef.current);
    setUndoItem(null);
    setCartItems((prev) => {
      const next = [...prev, undoItem];
      persistCart(next);
      return next;
    });
    showToast(`Restaurado: ${undoItem.name}`);
  }, [undoItem, persistCart, showToast]);

  const removeItem = useCallback((id) => {
    setCartItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) {
        setUndoItem(item);
        window.clearTimeout(undoTimeoutRef.current);
        undoTimeoutRef.current = window.setTimeout(() => setUndoItem(null), 4000);
        showToast(`Eliminado: ${item.name}`, "warning");
      }
      const next = prev.filter((item) => item.id !== id);
      persistCart(next);
      return next;
    });
  }, [persistCart, showToast]);

  const updateQty = useCallback((id, qty) => {
    if (qty <= 0) {
      removeItem(id);
      return;
    }
    setCartItems((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, quantity: qty } : item
      );
      persistCart(next);
      return next;
    });
    showToast("Cantidad actualizada");
  }, [removeItem, persistCart, showToast]);

  const clearCart = useCallback(() => {
    setCartItems([]);
    try { localStorage.removeItem("elbisne_cart"); } catch (e) {}
  }, []);

  const addToCart = useCallback((product, selectedOptions = null, qty = 1) => {
    let cartItemId = product.id;
    let finalPrice = product.priceUSD;
    let finalOriginalPrice = product.originalPrice;

    if (selectedOptions && Object.keys(selectedOptions).length > 0) {
      const optionParts = Object.entries(selectedOptions)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${v}`)
        .join("-");
      cartItemId = `${product.id}-${optionParts}`;

      if (product.options) {
        Object.entries(selectedOptions).forEach(([optionKey, selectedValName]) => {
          const optGroup = product.options[optionKey];
          if (optGroup) {
            const matchedVal = optGroup.find((o) => o.name === selectedValName);
            if (matchedVal && matchedVal.priceUSD !== undefined) {
              finalPrice = matchedVal.priceUSD;
              finalOriginalPrice = matchedVal.originalPrice !== undefined ? matchedVal.originalPrice : null;
            }
          }
        });
      }
    }

    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === cartItemId);
      let next;
      if (existing) {
        next = prev.map((item) =>
          item.id === cartItemId ? { ...item, quantity: item.quantity + qty } : item
        );
      } else {
        next = [
          ...prev,
          {
            ...product,
            id: cartItemId,
            productId: product.id,
            priceUSD: finalPrice,
            originalPrice: finalOriginalPrice,
            selectedOptions,
            quantity: qty,
          },
        ];
      }
      persistCart(next);
      return next;
    });
    showToast(`Añadido: ${product.name}`);
  }, [persistCart, showToast]);

  const toggleFavorite = useCallback((productId) => {
    setFavoriteIds((prev) => {
      const isCurrentlyFav = prev.includes(productId);
      const next = isCurrentlyFav
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      try { localStorage.setItem("elbisne_favorites", JSON.stringify(next)); } catch (e) {}
      showToast(isCurrentlyFav ? "Eliminado de favoritos" : "Añadido a favoritos", isCurrentlyFav ? "warning" : "success");
      return next;
    });
  }, [showToast]);

  const value = {
    isClient,
    cartItems,
    addToCart,
    updateQty,
    removeItem,
    undoItem,
    undoRemove,
    clearCart,
    favoriteIds,
    toggleFavorite,
    soldMap,
    recordSale,
    toEffectiveProduct,
    toast,
    toastType,
    showToast,
    user,
    isLoggedIn: Boolean(user),
    authLoading,
    signOut,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}