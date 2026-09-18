"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import Icon from "@/components/Icon";

export default function NotificationsBadge() {
  const { user } = useApp();
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return;
    try {
      const supabase = createClient();
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setUnread(count || 0);
    } catch {
      setUnread(0);
    }
  }, [user]);

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("read", false);
        if (!cancelled) setUnread(count || 0);
      } catch {
        if (!cancelled) setUnread(0);
      }
    })();
    const supabase = createClient();
    const channel = supabase
      .channel("notifications-badge")
      .on(
        "postgres_changes",
        { event: "*", filter: `user_id=eq.${user.id}`, schema: "public", table: "notifications" },
        () => refresh()
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  if (!user) return null;

  return (
    <Link href="/notificaciones" className="notif-badge-link" aria-label={`Notificaciones (${unread} sin leer)`}>
      <Icon name="sparkles" size={18} />
      {unread > 0 && <span className="notif-badge-count">{unread > 9 ? "9+" : unread}</span>}
    </Link>
  );
}
