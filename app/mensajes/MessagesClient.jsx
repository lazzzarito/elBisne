"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import Icon from "@/components/Icon";

// ── Conversaciones ──────────────────────────────────────────────────────
// Comprador: bisnes donde el usuario escribió. Vendedor: usuarios que
// escribieron a su bisne.
function useConversations(user) {
  const [convos, setConvos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;
    let active = true;
    const supabase = createClient();

    Promise.all([
      // Como comprador
      supabase
        .from("messages")
        .select("bisne_id, bisnes(handle, business_name, logo_url, owner_id)")
        .eq("user_id", user.id),
      // Como vendedor (si tiene bisne): hilos distintos buyer_user_id × bisne
      supabase
        .from("bisnes")
        .select("id, handle, business_name, logo_url")
        .eq("owner_id", user.id)
        .then(async ({ data: myBisnes }) => {
          if (!myBisnes?.length) return { data: [], myBisnes: [] };
          const ids = myBisnes.map((b) => b.id);
          const { data } = await supabase
            .from("messages")
            .select("bisne_id, user_id")
            .in("bisne_id", ids)
            .neq("user_id", user.id);
          return { data: data || [], myBisnes };
        }),
    ])
      .then(([buyerRes, sellerRes]) => {
        if (!active) return;
        const map = new Map();

        (buyerRes.data || []).forEach((m) => {
          if (m.bisnes && !map.has(`b:${m.bisne_id}`)) {
            map.set(`b:${m.bisne_id}`, {
              key: `b:${m.bisne_id}`,
              bisneId: m.bisne_id,
              bisne: m.bisnes,
              userId: user.id,
              role: "buyer",
            });
          }
        });

        // El bisne vendedor real (para saber qué tienda contesta)
        const myBisnes = sellerRes.myBisnes || [];
        (sellerRes.data || []).forEach((m) => {
          if (m.user_id && !map.has(`s:${m.bisne_id}:${m.user_id}`)) {
            const myBisne = myBisnes.find((b) => b.id === m.bisne_id);
            map.set(`s:${m.bisne_id}:${m.user_id}`, {
              key: `s:${m.bisne_id}:${m.user_id}`,
              bisneId: m.bisne_id,
              bisne: myBisne || null,
              userId: m.user_id,
              role: "seller",
            });
          }
        });

        setConvos(Array.from(map.values()));
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  return { convos, loading };
}

function ChatBox({ user, bisneId, bisneName, role, threadUserId }) {
  const { showToast } = useApp();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  // Cargar hilo + Realtime
  useEffect(() => {
    if (!user?.id || !bisneId || !isSupabaseConfigured()) return;
    const supabase = createClient();
    let active = true;

    supabase
      .from("messages")
      .select("*")
      .eq("bisne_id", bisneId)
      .eq("user_id", threadUserId)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (active) setMessages(data || []);
      });

    const channel = supabase
      .channel(`chat-${bisneId}-${threadUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `bisne_id=eq.${bisneId}` },
        (payload) => {
          const msg = payload.new;
          // Solo mensajes del propio hilo
          if (msg.user_id !== threadUserId) return;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user, bisneId, role, threadUserId]);

  // Autoscroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("messages").insert({
        bisne_id: bisneId,
        user_id: user.id,
        sender: role,
        body,
      });
      if (error) throw error;
      setInput("");
    } catch (e) {
      console.error("Error enviando mensaje:", e);
      showToast("No se pudo enviar el mensaje", "warning");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-box">
      <div className="chat-messages" ref={scrollRef}>
        {messages.length === 0 ? (
          <p className="chat-empty">Escribe el primer mensaje{role === "buyer" ? ` a ${bisneName}` : ""}.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`chat-msg ${m.sender === role ? "mine" : "theirs"}`}>
              <p>{m.body}</p>
              <time>{new Date(m.created_at).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}</time>
            </div>
          ))
        )}
      </div>
      <div className="chat-input-row">
        <input
          className="chat-input"
          type="text"
          placeholder="Escribe un mensaje…"
          value={input}
          maxLength={500}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button type="button" className="chat-send" onClick={send} disabled={sending || !input.trim()} aria-label="Enviar">
          <Icon name="telegram" size={16} />
        </button>
      </div>
    </div>
  );
}

export default function MessagesClient() {
  const { user, isLoggedIn, authLoading } = useApp();
  const { convos, loading } = useConversations(user);
  const [activeKey, setActiveKey] = useState(null);

  if (authLoading || (isLoggedIn && loading)) {
    return (
      <main className="chat-page" id="main-content">
        <div className="panel-skeleton" aria-busy="true">
          <div className="perfil-skeleton-line" style={{ width: "45%" }} />
          <div className="perfil-skeleton-line" style={{ width: "70%" }} />
        </div>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="chat-page" id="main-content">
        <div className="perfil-guest-card">
          <div className="perfil-guest-icon"><Icon name="user" size={28} /></div>
          <h1>Mensajes</h1>
          <p>Inicia sesión para chatear con tus vendedores o atender a tus compradores.</p>
          <Link href="/auth" className="perfil-guest-cta">Iniciar sesión</Link>
        </div>
      </main>
    );
  }

  const active = convos.find((c) => c.key === activeKey) || convos[0] || null;

  return (
    <main className="chat-page" id="main-content">
      <header className="notif-header">
        <h1>Mensajes</h1>
      </header>

      {convos.length === 0 ? (
        <div className="panel-empty">
          <p>No tienes conversaciones todavía.</p>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
            Escribe a una tienda desde su página o comparte tu tienda para que te escriban.
          </p>
        </div>
      ) : (
        <div className="chat-layout">
          <div className="chat-convos" role="tablist">
            {convos.map((c) => (
              <button
                key={c.key}
                type="button"
                role="tab"
                aria-selected={active?.key === c.key}
                className={`chat-convo${active?.key === c.key ? " active" : ""}`}
                onClick={() => setActiveKey(c.key)}
              >
                <span className="chat-convo-name">
                  {c.role === "buyer" ? (c.bisne?.business_name || "Tienda") : "Comprador"}
                </span>
                <span className="chat-convo-role">{c.role === "buyer" ? "Como comprador" : "Como vendedor"}</span>
              </button>
            ))}
          </div>

          {active && (
            <ChatBox
              user={user}
              bisneId={active.bisneId}
              bisneName={active.bisne?.business_name}
              role={active.role}
              threadUserId={active.userId}
            />
          )}
        </div>
      )}
    </main>
  );
}
