"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchProductSales } from "@/lib/orders";

const AppContext = createContext(null);

export function useApp() {
  return useContext(AppContext);
}

export function AppProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [salesMap, setSalesMap] = useState({}); // productId público → ventas (DB)
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
  // Modo tienda activo (perfil de bisne): el layout global oculta su chrome
  // (TopNav y FAB del carrito) y delega en la cabecera/footer de la tienda.
  const [storeChrome, setStoreChrome] = useState({ active: false, bisneId: null, isOwner: false });

  useEffect(() => {
    if (!isClient) return;
    const timer = window.setTimeout(() => {
      try {
        const cart = localStorage.getItem("elbisne_cart");
        if (cart) setCartItems(JSON.parse(cart));
        const favs = localStorage.getItem("elbisne_favorites");
        if (favs) setFavoriteIds(JSON.parse(favs));
      } catch (e) {
        console.error("Error reading localStorage:", e);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isClient]);

  // Ventas desde la DB (Tendencias) — se refresca tras cada pedido
  const refreshSales = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const sales = await fetchProductSales();
      if (sales) setSalesMap(sales);
    } catch (e) {
      console.error("Error refrescando ventas:", e);
    }
  }, []);

  useEffect(() => {
    if (!isClient || !isSupabaseConfigured()) return;
    let cancelled = false;
    (async () => {
      const sales = await fetchProductSales();
      if (!cancelled && sales) setSalesMap(sales);
    })();
    return () => {
      cancelled = true;
    };
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

  // Sincronización de favoritos con Supabase
  // Se ejecuta como callback de la suscripción de auth (patrón externo): al
  // iniciar sesión fusiona remotos con locales (merge bidireccional); al
  // cerrar sesión vuelve a los favoritos solo locales.
  const syncFavoritesFromRemote = useCallback(async (userId) => {
    if (!isSupabaseConfigured()) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("favorites")
        .select("product_id")
        .eq("user_id", userId);
      if (error) throw error;
      const remoteIds = (data || []).map((r) => r.product_id);
      setFavoriteIds((prev) => {
        const merged = Array.from(new Set([...prev, ...remoteIds]));
        // Empuja al remote lo que existía solo en local (merge bidireccional)
        const missing = prev.filter((id) => !remoteIds.includes(id));
        if (missing.length > 0) {
          supabase
            .from("favorites")
            .upsert(missing.map((pid) => ({ user_id: userId, product_id: pid })), {
              onConflict: "user_id,product_id",
              ignoreDuplicates: true,
            })
            .then(() => {})
            .catch(() => {});
        }
        try { localStorage.setItem("elbisne_favorites", JSON.stringify(merged)); } catch (e) {}
        return merged;
      });
    } catch (e) {
      console.error("Error sincronizando favoritos:", e);
    }
  }, []);

  const restoreLocalFavorites = useCallback(() => {
    try {
      const favs = localStorage.getItem("elbisne_favorites");
      setFavoriteIds(favs ? JSON.parse(favs) : []);
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (!isClient || !isSupabaseConfigured()) return;
    let active = true;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data?.session?.user) {
        setUser(data.session.user);
        syncFavoritesFromRemote(data.session.user.id);
      } else {
        restoreLocalFavorites();
      }
      setAuthLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (session?.user) {
        syncFavoritesFromRemote(session.user.id);
      } else {
        restoreLocalFavorites();
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [isClient, syncFavoritesFromRemote, restoreLocalFavorites]);

  // Stock solo-DB: los productos del carrito traen stock congelado;
  // withStock() lo refresca con el valor actual de la DB tras cada pedido.
  const stockMapRef = useRef(new Map());
  const [stockVersion, setStockVersion] = useState(0);

  // El comment de abajo es intencional: stockVersion solo dispara re-render
  const withStock = useCallback((product) => {
    if (!product) return product;
    if (stockMapRef.current.size === 0) return product;
    const current = stockMapRef.current.get(product.id);
    if (current === undefined) return product;
    return { ...product, stock: current };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockVersion]);

  const refreshStock = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("products").select("slug, id, stock");
      if (error) throw error;
      const map = new Map();
      (data || []).forEach((p) => {
        map.set(p.slug || p.id, p.stock);
      });
      stockMapRef.current = map;
      setStockVersion((v) => v + 1); // re-render con el stock fresco
    } catch (e) {
      console.error("Error refrescando stock:", e);
    }
  }, []);

  useEffect(() => {
    if (!isClient || !isSupabaseConfigured()) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from("products").select("slug, id, stock");
        if (error) throw error;
        const map = new Map();
        (data || []).forEach((p) => {
          map.set(p.slug || p.id, p.stock);
        });
        stockMapRef.current = map;
        if (!cancelled) setStockVersion((v) => v + 1); // re-render con stock fresco
      } catch (e) {
        console.error("Error refrescando stock:", e);
      }
    })();
    return () => {
      cancelled = true;
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

  const removeItems = useCallback((ids) => {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    setCartItems((prev) => {
      const next = prev.filter((item) => !idSet.has(item.id));
      persistCart(next);
      return next;
    });
  }, [persistCart]);

  const clearCart = useCallback(() => {
    setCartItems([]);
    try { localStorage.removeItem("elbisne_cart"); } catch (e) {}
  }, []);

  const addToCart = useCallback((product, selectedOptions = null, qty = 1) => {
    // selectedOptions={} (sin opciones) y null deben colisionar en el mismo item
    const hasOptions = selectedOptions && Object.keys(selectedOptions).length > 0;
    let cartItemId = product.id;
    let finalPrice = product.priceUSD;
    let finalOriginalPrice = product.originalPrice;

    if (hasOptions) {
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
            selectedOptions: hasOptions ? selectedOptions : null,
            quantity: qty,
          },
        ];
      }
      persistCart(next);
      return next;
    });
    showToast(`Añadido: ${product.name}`);
  }, [persistCart, showToast]);

  // userId se mantiene en un ref para no reconstruir toggleFavorite en cada login/logout
  const userIdRef = useRef(null);
  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);

  const toggleFavorite = useCallback((productId) => {
    setFavoriteIds((prev) => {
      const isCurrentlyFav = prev.includes(productId);
      const next = isCurrentlyFav
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      try { localStorage.setItem("elbisne_favorites", JSON.stringify(next)); } catch (e) {}
      showToast(isCurrentlyFav ? "Eliminado de favoritos" : "Añadido a favoritos", isCurrentlyFav ? "warning" : "success");
      // Persistir en Supabase si hay sesión (fire & forget, no bloquea la UI)
      const currentUserId = userIdRef.current;
      if (currentUserId && isSupabaseConfigured()) {
        const supabase = createClient();
        if (isCurrentlyFav) {
          supabase
            .from("favorites")
            .delete()
            .match({ user_id: currentUserId, product_id: productId })
            .then(({ error }) => { if (error) console.error("Error al quitar favorito:", error.message); })
            .catch(() => {});
        } else {
          supabase
            .from("favorites")
            .upsert({ user_id: currentUserId, product_id: productId }, { onConflict: "user_id,product_id" })
            .then(({ error }) => { if (error) console.error("Error al guardar favorito:", error.message); })
            .catch(() => {});
        }
      }
      return next;
    });
  }, [showToast]);

  // Tras un pedido exitoso: refresca stock y ventas desde la DB
  const handleOrderComplete = useCallback(async () => {
    await Promise.all([refreshStock(), refreshSales()]);
  }, [refreshStock, refreshSales]);

  const value = {
    isClient,
    cartItems,
    addToCart,
    updateQty,
    removeItem,
    removeItems,
    undoItem,
    undoRemove,
    clearCart,
    favoriteIds,
    toggleFavorite,
    salesMap,
    refreshSales,
    withStock,
    refreshStock,
    handleOrderComplete,
    toast,
    toastType,
    showToast,
    user,
    isLoggedIn: Boolean(user),
    authLoading,
    signOut,
    storeChrome,
    setStoreChrome,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}