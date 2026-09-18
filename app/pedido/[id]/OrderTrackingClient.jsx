"use client";

import Link from "next/link";
import { useApp } from "@/context/AppContext";
import ReviewForm from "@/components/trust/ReviewForm";
import Icon from "@/components/Icon";

const STEPS = [
  { key: "pending", label: "Pendiente", icon: "clock" },
  { key: "confirmed", label: "Confirmado", icon: "check" },
  { key: "shipped", label: "Enviado", icon: "truck" },
  { key: "delivered", label: "Entregado", icon: "shopping-bag" },
];

const STATUS_TEXT = {
  pending: "Esperando confirmación de la tienda",
  confirmed: "La tienda confirmó tu pedido",
  shipped: "Tu pedido va en camino",
  delivered: "Pedido entregado. ¡Que lo disfrutes!",
  cancelled: "Este pedido fue cancelado",
};

export default function OrderTrackingClient({ order, bisne: bisneProp }) {
  const { user } = useApp();

  const statusIndex = STEPS.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === "cancelled";

  const firstProductId = order.items[0]?.product_id || order.items[0]?.productId || null;
  const canReview =
    Boolean(user?.id) && Boolean(order.userId) && user.id === order.userId && ["confirmed", "shipped", "delivered"].includes(order.status);

  const bisne = bisneProp || order.bisnes || null;

  return (
    <main className="order-tracking-page" id="main-content">
      <div className="order-tracking-card">
        <header className="order-tracking-header">
          <p className="order-tracking-label">Pedido</p>
          <h1 className="order-tracking-id">#{order.id.slice(0, 8).toUpperCase()}</h1>
          {bisne && (
            <Link href={`/b/${bisne.handle}`} className="order-tracking-store">
              {bisne.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bisne.logoUrl} alt="" width={20} height={20} style={{ borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <Icon name="shopping-bag" size={14} />
              )}
              {bisne.name}
            </Link>
          )}
        </header>

        <p className={`order-tracking-status-text${isCancelled ? " cancelled" : ""}`}>
          {STATUS_TEXT[order.status] || order.status}
        </p>

        {/* Timeline */}
        {!isCancelled && (
          <div className="order-timeline">
            {STEPS.map((step, i) => {
              const done = i <= statusIndex;
              const isLast = i === STEPS.length - 1;
              return (
                <div key={step.key} className="order-timeline-step">
                  <div className="order-timeline-rail">
                    <span className={`order-timeline-dot${done ? " done" : ""}`}>
                      <Icon name={step.icon} size={12} />
                    </span>
                    {!isLast && <span className={`order-timeline-line${i < statusIndex ? " done" : ""}`} />}
                  </div>
                  <span className={`order-timeline-label${done ? " done" : ""}`}>{step.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Items */}
        <div className="order-tracking-section">
          <strong>Productos</strong>
          {order.items.map((item, i) => (
            <div key={`${order.id}-${i}`} className="order-tracking-item">
              <span className="order-tracking-item-qty">{item.quantity}×</span>
              <span className="order-tracking-item-name">{item.name}</span>
              <span className="order-tracking-item-price">${(Number(item.price) * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="order-tracking-total">
            <span>Total</span>
            <span>${order.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="order-tracking-section">
          <strong>Entrega</strong>
          <p className="order-tracking-meta">
            {order.deliveryMode === "delivery"
              ? `A domicilio: ${order.address || "—"}`
              : "Recogida en tienda"}
          </p>
          {order.paymentMethod && <p className="order-tracking-meta">Pago: {order.paymentMethod}</p>}
          <p className="order-tracking-meta">
            Pedido el {new Date(order.createdAt).toLocaleString("es", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        {/* Reseña (solo comprador autenticado, pedido confirmado) */}
        {canReview && order.bisneId && (
          <div className="order-tracking-section">
            <ReviewForm
              orderId={order.id}
              productId={firstProductId}
              bisneId={order.bisneId}
              onSubmitted={() => {}}
            />
          </div>
        )}

        <Link href="/" className="order-tracking-back">
          <Icon name="arrow-left" size={14} /> Seguir comprando
        </Link>
      </div>
    </main>
  );
}
