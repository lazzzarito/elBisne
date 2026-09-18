import Link from "next/link";
import { fetchOrderById } from "@/lib/orders";
import OrderTrackingClient from "./OrderTrackingClient";

export const revalidate = 0;

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: `Pedido #${String(id).slice(0, 8)} | elBisne` };
}

export default async function PedidoPage({ params }) {
  const { id } = await params;
  const order = await fetchOrderById(id);

  if (!order) {
    return (
      <main className="order-tracking-page" id="main-content">
        <div className="order-tracking-card">
          <h1>Pedido no encontrado</h1>
          <p>Este enlace no corresponde a ningún pedido, o fue eliminado.</p>
          <Link href="/" className="perfil-guest-cta">Volver al inicio</Link>
        </div>
      </main>
    );
  }

  const bisne = order.bisnes || null;

  return (
    <OrderTrackingClient
      order={{
        id: order.id,
        status: order.status,
        customerName: order.customer_name,
        items: Array.isArray(order.items) ? order.items : [],
        total: Number(order.total),
        paymentMethod: order.payment_method,
        deliveryMode: order.delivery_mode,
        address: order.address,
        createdAt: order.created_at,
        userId: order.user_id,
        bisneId: order.bisne_id,
      }}
      bisne={
        bisne
          ? { handle: bisne.handle, name: bisne.business_name, logoUrl: bisne.logo_url }
          : null
      }
    />
  );
}
