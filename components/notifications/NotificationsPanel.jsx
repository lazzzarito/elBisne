"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import Icon from "@/components/Icon";

export const NOTIF_META = {
  new_order: { icon: "cart", label: "Nuevo pedido", href: (p) => (p?.order_id ? `/pedido/${p.order_id}` : "/panel/pedidos") },
  new_follower: { icon: "user", label: "Nuevo seguidor", href: () => "/panel" },
  new_review: { icon: "star", label: "Nueva reseña", href: () => "/panel" },
  status_update: { icon: "truck", label: "Pedido actualizado", href: (p) => (p?.order_id ? `/pedido/${p.order_id}` : "/") },
};

export default function NotificationsPanel() {
  const { user, isLoggedIn, authLoading, showToast } = useApp();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const markAllRead = useCallback(async (ids) => {
    if (!user || !isSupabaseConfigured() || ids.length === 0) return;
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).in("id", ids).eq("user_id", user.id);
  }, [user]);

  useEffect(() => {
    if (!isLoggedIn || !user || !isSupabaseConfigured()) return;
    let active = true;
    const supabase = createClient();

    // Suscripción inicial al sistema externo: setState solo en callbacks async
    let channel;
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!active) return;
        setNotifications(data || []);
        setLoading(false);
        const unread = (data || []).filter((n) => !n.read).map((n) => n.id);
        if (unread.length > 0) {
          setTimeout(() => markAllRead(unread), 2500);
        }
        // Realtime: nuevas notificaciones en vivo (se arma tras la carga inicial)
        channel = supabase
          .channel("notifications-realtime")
          .on(
            "postgres_changes",
            { event: "INSERT", filter: `user_id=eq.${user.id}`, schema: "public", table: "notifications" },
            (payload) => {
              setNotifications((prev) => [payload.new, ...prev]);
              const meta = NOTIF_META[payload.new.type];
              showToast(meta ? `🔔 ${meta.label}` : "🔔 Nueva notificación");
            }
          )
          .subscribe();
      });

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [isLoggedIn, user, showToast, markAllRead]);

  if (authLoading || loading) {
    return (
      <main className="notif-page" id="main-content">
        <div className="panel-skeleton" aria-busy="true">
          <div className="perfil-skeleton-line" style={{ width: "50%" }} />
          <div className="perfil-skeleton-line" style={{ width: "80%" }} />
        </div>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="notif-page" id="main-content">
        <div className="perfil-guest-card">
          <div className="perfil-guest-icon"><Icon name="user" size={28} /></div>
          <h1>Notificaciones</h1>
          <p>Inicia sesión para ver la actividad de tus pedidos y tu tienda.</p>
          <Link href="/auth" className="perfil-guest-cta">Iniciar sesión</Link>
        </div>
      </main>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <main className="notif-page" id="main-content">
      <header className="notif-header">
        <h1>Notificaciones</h1>
        {unreadCount > 0 && <span className="notif-unread-chip">{unreadCount} nuevas</span>}
      </header>

      {notifications.length === 0 ? (
        <div className="panel-empty">
          <p>No tienes notificaciones todavía.</p>
        </div>
      ) : (
        <div className="notif-list">
          {notifications.map((n) => {
            const meta = NOTIF_META[n.type] || { icon: "info", label: "Aviso", href: () => "/" };
            const payload = n.payload || {};
            return (
              <Link key={n.id} href={meta.href(payload)} className={`notif-item${!n.read ? " unread" : ""}`}>
                <span className="notif-icon">
                  <Icon name={meta.icon} size={15} />
                </span>
                <span className="notif-body">
                  <strong>{meta.label}</strong>
                  <span className="notif-detail">
                    {n.type === "new_order" &&
                      `${payload.customer_name || "Cliente"} · ${payload.items_count || 0} productos · $${Number(payload.total || 0).toFixed(2)}`}
                    {n.type !== "new_order" && "Toca para ver más"}
                  </span>
                  <time>
                    {new Date(n.created_at).toLocaleDateString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </time>
                </span>
                {!n.read && <span className="notif-dot" />}
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
