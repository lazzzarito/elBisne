"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PanelLayout, { useMyBisne } from "./PanelLayout";
import { useApp } from "@/context/AppContext";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import Icon from "@/components/Icon";

const STATUS_LABELS = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

function StatCard({ icon, label, value, accent }) {
  return (
    <div className="panel-stat-card">
      <span className="panel-stat-icon" style={accent ? { background: accent } : undefined}>
        <Icon name={icon} size={16} />
      </span>
      <div className="panel-stat-info">
        <span className="panel-stat-value">{value}</span>
        <span className="panel-stat-label">{label}</span>
      </div>
    </div>
  );
}

export default function PanelPage() {
  const bisne = useMyBisne();
  const { user } = useApp();
  const [stats, setStats] = useState({ products: 0, orders: 0, pending: 0, revenue: 0, followers: 0, rating: null });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bisne?.id || !isSupabaseConfigured()) return;
    let active = true;
    const supabase = createClient();

    Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }).eq("bisne_id", bisne.id),
      supabase.from("orders").select("*").eq("bisne_id", bisne.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("follows").select("user_id", { count: "exact", head: true }).eq("bisne_id", bisne.id),
      supabase.from("reviews").select("rating").eq("bisne_id", bisne.id),
    ])
      .then(([productsRes, ordersRes, followsRes, reviewsRes]) => {
        if (!active) return;
        const orders = ordersRes.data || [];
        const reviews = reviewsRes.data || [];
        setStats({
          products: productsRes.count || 0,
          orders: orders.length,
          pending: orders.filter((o) => o.status === "pending").length,
          revenue: orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + Number(o.total || 0), 0),
          followers: followsRes.count || 0,
          rating: reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null,
        });
        setRecentOrders(orders.slice(0, 5));
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [bisne?.id]);

  if (bisne === undefined || bisne === null || loading) {
    return (
      <PanelLayout title="Mi Panel">
        <div className="panel-skeleton" aria-busy="true">
          <div className="perfil-skeleton-line" style={{ width: "40%" }} />
          <div className="perfil-skeleton-line" style={{ width: "70%" }} />
        </div>
      </PanelLayout>
    );
  }

  return (
    <PanelLayout
      title="Mi Panel"
      subtitle={`${bisne.business_name} · ${bisne.handle ? `/${bisne.handle}` : "Sin handle"}`}
      actions={
        <Link href={`/${bisne.handle}`} className="panel-view-store">
          Ver tienda <Icon name="arrow-up" size={12} style={{ transform: "rotate(45deg)" }} />
        </Link>
      }
    >
      <section className="panel-stats-grid" aria-label="Resumen">
        <StatCard icon="shopping-bag" label="Productos" value={stats.products} />
        <StatCard icon="cart" label="Pedidos" value={stats.orders} />
        <StatCard icon="clock" label="Pendientes" value={stats.pending} accent="rgba(230,162,60,.2)" />
        <StatCard icon="banknote" label="Vendido" value={`$${stats.revenue.toFixed(2)}`} accent="rgba(0,168,132,.15)" />
        <StatCard icon="user" label="Seguidores" value={stats.followers} />
        <StatCard
          icon="star"
          label="Rating"
          value={stats.rating ? stats.rating.toFixed(1) : "—"}
          accent="rgba(255,193,7,.15)"
        />
      </section>

      <section className="panel-section" aria-label="Últimos pedidos">
        <div className="panel-section-head">
          <h2 className="panel-section-title">Últimos pedidos</h2>
          <Link href="/panel/pedidos" className="panel-link">Ver todos</Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="panel-empty">
            <p>Aún no tienes pedidos. Comparte tu tienda para recibir el primero 🎉</p>
          </div>
        ) : (
          <div className="panel-orders-list">
            {recentOrders.map((order) => (
              <Link key={order.id} href={`/pedido/${order.id}`} className="panel-order-row">
                <div className="panel-order-main">
                  <strong>{order.customer_name}</strong>
                  <span>
                    {new Date(order.created_at).toLocaleDateString("es", { day: "numeric", month: "short" })}
                    {" · "}
                    {Array.isArray(order.items) ? order.items.length : 0} productos
                  </span>
                </div>
                <div className="panel-order-side">
                  <span className="panel-order-total">${Number(order.total).toFixed(2)}</span>
                  <span className={`panel-order-status s-${order.status}`}>{STATUS_LABELS[order.status] || order.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="panel-section" aria-label="Acciones rápidas">
        <div className="panel-section-head">
          <h2 className="panel-section-title">Acciones rápidas</h2>
        </div>
        <div className="panel-quick-actions">
          <Link href="/panel/productos?nuevo=1" className="panel-quick-action">
            <Icon name="plus" size={16} />
            <span>Añadir producto</span>
          </Link>
          <Link href="/panel/apariencia" className="panel-quick-action">
            <Icon name="sparkles" size={16} />
            <span>Personalizar apariencia</span>
          </Link>
          <Link href="/panel/verificacion" className="panel-quick-action">
            <Icon name="shield" size={16} />
            <span>Solicitar verificación</span>
          </Link>
        </div>
      </section>
    </PanelLayout>
  );
}
