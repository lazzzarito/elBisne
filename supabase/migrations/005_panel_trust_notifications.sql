-- ════════════════════════════════════════════════════════════════════
-- elBisne · 005_panel_trust_notifications.sql
-- Fases 7-10: chat (messages), policies de pedidos/reseñas, suspensiones,
-- triggers de notificaciones y RPC update_order_status.
-- ════════════════════════════════════════════════════════════════════

-- ── bisnes: suspensión (Fase 10 · admin) ──────────────────────────────
alter table public.bisnes add column if not exists suspended boolean default false;

-- ── messages (Fase 9 · chat comprador ↔ vendedor) ─────────────────────
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  bisne_id    uuid not null references public.bisnes(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  sender      text not null check (sender in ('buyer','seller')),
  body        text not null,
  created_at  timestamptz default now()
);
create index if not exists messages_thread_idx on public.messages (bisne_id, user_id, created_at);

alter table public.messages enable row level security;

drop policy if exists "messages_select_thread" on public.messages;
create policy "messages_select_thread" on public.messages for select
  using (
    auth.uid() = user_id
    or auth.uid() in (select owner_id from public.bisnes where id = messages.bisne_id)
  );

drop policy if exists "messages_insert_buyer" on public.messages;
create policy "messages_insert_buyer" on public.messages for insert
  with check (auth.uid() = user_id and sender = 'buyer');

drop policy if exists "messages_insert_seller" on public.messages;
create policy "messages_insert_seller" on public.messages for insert
  with check (
    sender = 'seller'
    and auth.uid() in (select owner_id from public.bisnes where id = messages.bisne_id)
  );

-- El comprador ve "sus conversaciones" (distintos bisnes donde escribió)
drop policy if exists "profiles_self_update" on public.profiles;

-- ── orders: el comprador autenticado puede ver SUS pedidos (Fase 8 tracking) ─
drop policy if exists "orders_select_buyer" on public.orders;
create policy "orders_select_buyer" on public.orders for select
  using (auth.uid() = user_id);

-- El dueño del bisne puede actualizar el estado de sus pedidos
drop policy if exists "orders_update_owner" on public.orders;
create policy "orders_update_owner" on public.orders for update
  using (auth.uid() in (select owner_id from public.bisnes where id = orders.bisne_id));

-- ── reviews: escribir solo si el pedido está confirmado y es del comprador ──
-- (reemplaza la policy 001 que comprobaba status='confirmed' exacto; ahora
--  acepta cualquier estado post-confirmación: confirmed, shipped, delivered)
create or replace function public.order_is_reviewable(p_order_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id
      and o.status in ('confirmed','shipped','delivered')
  );
$$;

drop policy if exists "reviews_insert_buyer" on public.reviews;
create policy "reviews_insert_buyer" on public.reviews for insert
  with check (
    auth.uid() = (select user_id from public.orders where id = reviews.order_id)
    and public.order_is_reviewable(reviews.order_id)
  );

-- ── coupons: eliminar cupones propios (faltaba en 001) ────────────────
drop policy if exists "coupons_delete_owner" on public.coupons;
create policy "coupons_delete_owner" on public.coupons for delete
  using (auth.uid() in (select owner_id from public.bisnes where id = coupons.bisne_id));

-- ── notificaciones (Fase 9): INSERT con service_role; SELECT/UPDATE propias ──
drop policy if exists "notifications_insert_system" on public.notifications;
create policy "notifications_insert_system" on public.notifications for insert
  with check (auth.role() = 'service_role');

-- ════════════════════════════════════════════════════════════════════
-- TRIGGERS DE NOTIFICACIONES (se ejecutan como service_role vía security definer)
-- ════════════════════════════════════════════════════════════════════

create or replace function public.notify_order_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner from public.bisnes where id = new.bisne_id;
  if v_owner is not null then
    insert into public.notifications (user_id, type, payload)
    values (
      v_owner,
      'new_order',
      jsonb_build_object(
        'order_id', new.id,
        'total', new.total,
        'customer_name', new.customer_name,
        'items_count', coalesce(jsonb_array_length(new.items), 0)
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_order_created on public.orders;
create trigger on_order_created
  after insert on public.orders
  for each row execute function public.notify_order_created();

create or replace function public.notify_new_follower()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner from public.bisnes where id = new.bisne_id;
  if v_owner is not null and v_owner <> new.user_id then
    insert into public.notifications (user_id, type, payload)
    values (v_owner, 'new_follower', jsonb_build_object('user_id', new.user_id));
  end if;
  return new;
end;
$$;

drop trigger if exists on_new_follower on public.follows;
create trigger on_new_follower
  after insert on public.follows
  for each row execute function public.notify_new_follower();

create or replace function public.notify_new_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner from public.bisnes where id = new.bisne_id;
  if v_owner is not null then
    insert into public.notifications (user_id, type, payload)
    values (v_owner, 'new_review', jsonb_build_object('review_id', new.id, 'rating', new.rating));
  end if;
  return new;
end;
$$;

drop trigger if exists on_new_review on public.reviews;
create trigger on_new_review
  after insert on public.reviews
  for each row execute function public.notify_new_review();

-- ════════════════════════════════════════════════════════════════════
-- RPC: actualizar estado de pedido (solo el dueño del bisne)
-- Estados: pending → confirmed → shipped → delivered (+ cancelled)
-- ════════════════════════════════════════════════════════════════════
create or replace function public.update_order_status(p_order_id uuid, p_status text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  if p_status not in ('pending','confirmed','shipped','delivered','cancelled') then
    raise exception 'Estado inválido: %', p_status;
  end if;

  update public.orders o
  set status = p_status
  where o.id = p_order_id
    and o.bisne_id in (select id from public.bisnes where owner_id = auth.uid())
  returning * into v_order;

  if v_order.id is null then
    raise exception 'Pedido no encontrado o sin permisos';
  end if;

  return v_order;
end;
$$;

grant execute on function public.update_order_status(uuid, text) to authenticated;

-- ── Suspender bisne: solo service_role (RLS no permite admin anónimo) ──
-- La moderación se hace desde el dashboard de Supabase o con la service key.
