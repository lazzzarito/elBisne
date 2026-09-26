"use client";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { isSupabaseConfigured as isDataConfigured, createDataClient } from "@/lib/supabase/data";

// Índice de bisnes (público: handle → { id, name, whatsapp })
// Se carga una vez por sesión para agrupar el carrito y construir el storeConfig
// por Bisne en checkout. La tabla bisnes es de lectura pública (RLS select).
let bisneIndexPromise = null;

// Índice global de bisnes (id → info pública), cacheado por sesión.
// Se usa para agrupar el carrito, contactar al vendedor y mostrar el
// nombre del bisne en modales/cards.
export function loadBisneIndex() {
  if (!isSupabaseConfigured()) return Promise.resolve(new Map());
  if (!bisneIndexPromise) {
    bisneIndexPromise = createClient()
      .from("bisnes")
      .select("id, handle, business_name, phone_whatsapp, address, logo_url, verified")
      .then(({ data, error }) => {
        if (error) throw error;
        const map = new Map();
        (data || []).forEach((b) => {
          map.set(b.id, {
            id: b.id,
            handle: b.handle,
            name: b.business_name,
            whatsapp: b.phone_whatsapp,
            address: b.address,
            logoUrl: b.logo_url || null,
            verified: !!b.verified,
          });
        });
        return map;
      })
      .catch((e) => {
        console.error("Error cargando índice de bisnes:", e);
        bisneIndexPromise = null; // permitir reintento
        return new Map();
      });
  }
  return bisneIndexPromise;
}

// Info de un bisne por id (null si no existe o aún carga)
export async function getBisneInfo(bisneId) {
  if (!bisneId) return null;
  const map = await loadBisneIndex();
  return map.get(bisneId) || null;
}

// storeConfig por Bisne: base del marketplace + datos reales del vendedor
export function buildBisneStoreConfig(baseConfig, bisne) {
  if (!bisne) return baseConfig;
  return {
    ...baseConfig,
    name: bisne.name || baseConfig.name,
    whatsappNumber: bisne.whatsapp || baseConfig.whatsappNumber,
    location: bisne.address || baseConfig.location,
    messaging: {
      defaultChannel: "whatsapp",
      channels: {
        whatsapp: { enabled: true, number: bisne.whatsapp || baseConfig.whatsappNumber },
      },
    },
  };
}

// Índice ligero de pedidos (opcional: para demo sin RPC real)
// El flujo primario es RPC place_order (ver createOrder abajo).
export async function fetchBisneOrders(bisneId) {
  if (!bisneId || !isSupabaseConfigured()) return [];
  try {
    const { data, error } = await createClient()
      .from("orders")
      .select("*")
      .eq("bisne_id", bisneId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("Error cargando pedidos:", e);
    return [];
  }
}// Tracking público: RPC get_order_tracking (seguridad definer, el uuid es
// el token de acceso; no depende de RLS de orders).
export async function fetchOrderById(orderId) {
  if (!orderId || !isDataConfigured()) return null;
  try {
    const client = createDataClient();
    const { data, error } = await client.rpc("get_order_tracking", { p_order_id: orderId });
    if (error) throw error;
    const row = (data || [])[0] || (Array.isArray(data) ? null : data);
    if (!row) return null;
    return {
      id: row.id,
      status: row.status,
      customer_name: row.customer_name,
      items: row.items,
      total: row.total,
      payment_method: row.payment_method,
      delivery_mode: row.delivery_mode,
      address: row.address,
      created_at: row.created_at,
      user_id: row.user_id,
      bisne_id: row.bisne_id,
      bisnes: {
        handle: row.bisne_handle,
        business_name: row.bisne_name,
        logo_url: row.bisne_logo,
      },
    };
  } catch (e) {
    console.error("Error cargando pedido:", e);
    return null;
  }
}

// Ventas acumuladas por producto (RPC get_product_sales)
// Mapa { id público (slug o uuid) → ventas } para Tendencias.
export async function fetchProductSales() {
  if (!isDataConfigured()) return null;
  try {
    const { data, error } = await createDataClient().rpc("get_product_sales");
    if (error) throw error;
    const map = {};
    (data || []).forEach((row) => {
      map[row.public_id] = Number(row.sales) || 0;
    });
    return map;
  } catch (e) {
    console.error("Error cargando ventas:", e);
    return null;
  }
}

// Crear pedido en DB (RPC place_order)
// items: [{ productId, name, quantity, priceUSD, selectedOptions }]
// Retorna { ok, orderId?, error? }
export async function createOrder({ bisneId, items, customer, totalUSD, channel }) {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase no está configurado" };
  }
  if (!bisneId) {
    return { ok: false, error: "Pedido sin tienda asociada" };
  }

  const supabase = createClient();
  const clientKey = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const payload = {
    p_bisne_id: bisneId,
    p_items: items.map((it) => {
      // Combo/colección: una sola línea a precio fijo. El RPC expande sus
      // productos para descontar stock (collection_items).
      if (it.isCollection || it.collectionId) {
        return {
          item_type: "collection",
          collection_id: it.collectionId,
          name: it.name,
          quantity: it.quantity,
          price: it.priceUSD,
        };
      }
      return {
        product_id: it.productId || it.id,
        name: it.name,
        quantity: it.quantity,
        price: it.priceUSD,
        ...(it.selectedOptions ? { options: it.selectedOptions } : {}),
      };
    }),
    p_customer_name: customer.name,
    p_customer_phone: customer.phone || null,
    p_total: Number(totalUSD.toFixed(2)),
    p_payment_method: customer.payment === "Otro" && customer.paymentOther ? `Otro: ${customer.paymentOther}` : customer.payment || null,
    p_delivery_mode: customer.delivery || null,
    p_address: customer.delivery === "delivery" ? customer.address || null : null,
    p_channel: channel || null,
    p_client_order_key: clientKey,
  };

  try {
    const { data, error } = await supabase.rpc("place_order", payload);
    if (error) return { ok: false, error: error.message };
    const created = Array.isArray(data) ? data[0] : data;
    return { ok: true, orderId: created?.id || null };
  } catch (e) {
    // Fallback: si la RPC no existe aún (migración 004 pendiente), INSERT directo.
    // No descuenta stock, pero garantiza el registro del pedido.
    try {
      const { data, error: insErr } = await supabase
        .from("orders")
        .insert({
          bisne_id: bisneId,
          customer_name: customer.name,
          customer_phone: customer.phone || null,
          items: payload.p_items,
          total: payload.p_total,
          payment_method: payload.p_payment_method,
          delivery_mode: payload.p_delivery_mode,
          address: payload.p_address,
          status: "pending",
          channel: channel || null,
        })
        .select("id")
        .single();
      if (insErr) return { ok: false, error: insErr.message };
      return { ok: true, orderId: data?.id || null, degraded: true };
    } catch (e2) {
      return { ok: false, error: e2.message };
    }
  }
}
