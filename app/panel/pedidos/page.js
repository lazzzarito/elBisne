"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PanelLayout, { useMyBisne } from "../PanelLayout";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchBisneOrders } from "@/lib/orders";
import Icon from "@/components/Icon";

const STATUS_FLOW = {
  pending: "confirmed",
  confirmed: "shipped",
  shipped: "delivered",
};

const STATUS_LABELS = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const NEXT_ACTION = {
  pending: "Confirmar",
  confirmed: "Marcar enviado",
  shipped: "Marcar entregado",
};

export default function PanelPedidosPage() {
  const bisne = useMyBisne();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(async () => {
    if (!bisne) return;
    const data = await fetchBisneOrders(bisne.id);
    setOrders(data);
    setLoading(false);
  }, [bisne]);

  useEffect(() => {
    if (!bisne) return;
    let cancelled = false;
    (async () => {
      const data = await fetchBisneOrders(bisne.id);
      if (!cancelled) {
        setOrders(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bisne]);

  const advance = useCallback(async (order) => {
    const next = STATUS_FLOW[order.status];
    if (!next || !isSupabaseConfigured()) return;
    setUpdatingId(order.id);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("update_order_status", {
        p_order_id: order.id,
        p_status: next,
      });
      if (error) throw error;
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: next } : o)));
    } catch (e) {
      console.error("Error actualizando pedido:", e);
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  if (bisne === undefined || bisne === null) {
    return <PanelLayout title="Pedidos"><div className="panel-skeleton" aria-busy="true" /></PanelLayout>;
  }

  return (
    <PanelLayout title="Pedidos" subtitle={`${orders.length} pedidos recibidos`}>
      <div className="panel-filters">
        {["all", "pending", "confirmed", "shipped", "delivered", "cancelled"].map((f) => (
          <button
            key={f}
            className={`panel-filter-chip${filter === f ? " active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Todos" : STATUS_LABELS[f]}
            {f !== "all" && (
              <span className="panel-filter-count">{orders.filter((o) => o.status === f).length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="panel-skeleton" aria-busy="true">
          <div className="perfil-skeleton-line" style={{ width: "80%" }} />
          <div className="perfil-skeleton-line" style={{ width: "65%" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel-empty">
          <p>No hay pedidos {filter === "all" ? "todavía" : `en estado "${STATUS_LABELS[filter]}"`}.</p>
        </div>
      ) : (
        <div className="panel-orders-list">
          {filtered.map((order) => {
            const items = Array.isArray(order.items) ? order.items : [];
            const expanded = expandedId === order.id;
            return (
              <div key={order.id} className={`panel-order-card${expanded ? " expanded" : ""}`}>
                <button
                  type="button"
                  className="panel-order-row"
                  onClick={() => setExpandedId(expanded ? null : order.id)}
                >
                  <div className="panel-order-main">
                    <strong>{order.customer_name}</strong>
                    <span>
                      {new Date(order.created_at).toLocaleDateString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {" · "}
                      {items.length} {items.length === 1 ? "producto" : "productos"}
                      {order.channel ? ` · por ${order.channel.replace("rpc:", "")}` : ""}
                    </span>
                  </div>
                  <div className="panel-order-side">
                    <span className="panel-order-total">${Number(order.total).toFixed(2)}</span>
                    <span className={`panel-order-status s-${order.status}`}>{STATUS_LABELS[order.status] || order.status}</span>
                  </div>
                </button>

                {expanded && (
                  <div className="panel-order-detail">
                    <div className="panel-order-items">
                      {items.map((item, i) => (
                        <div key={`${order.id}-${i}`} className="panel-order-item">
                          <span className="panel-order-item-qty">{item.quantity}×</span>
                          <span className="panel-order-item-name">{item.name}</span>
                          <span className="panel-order-item-price">${(Number(item.price) * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="panel-order-meta">
                      {order.customer_phone && <span><Icon name="whatsapp" size={12} /> {order.customer_phone}</span>}
                      {order.delivery_mode && (
                        <span><Icon name="truck" size={12} /> {order.delivery_mode === "delivery" ? `Entrega: ${order.address || "—"}` : "Recogida en tienda"}</span>
                      )}
                      {order.payment_method && <span><Icon name="banknote" size={12} /> {order.payment_method}</span>}
                    </div>
                    <div className="panel-order-actions">
                      <Link href={`/pedido/${order.id}`} className="panel-btn-secondary">
                        <Icon name="explore" size={12} /> Vista comprador
                      </Link>
                      {NEXT_ACTION[order.status] && (
                        <button
                          type="button"
                          className="panel-btn-primary"
                          onClick={() => advance(order)}
                          disabled={updatingId === order.id}
                        >
                          {updatingId === order.id ? "Actualizando…" : NEXT_ACTION[order.status]}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PanelLayout>
  );
}
