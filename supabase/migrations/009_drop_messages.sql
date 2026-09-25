-- ════════════════════════════════════════════════════════════════════
-- elBisne · 009_drop_messages.sql
-- Elimina el chat interno (Fase 9) y su tabla. La mensajería de pedidos
-- sigue vía WhatsApp/Telegram/Email (lib/messaging), fuera del sitio.
-- ════════════════════════════════════════════════════════════════════

drop policy if exists "messages_select_thread" on public.messages;
drop policy if exists "messages_insert_buyer" on public.messages;
drop policy if exists "messages_insert_seller" on public.messages;

drop table if exists public.messages;