-- ════════════════════════════════════════════════════════════════════
-- 013: Reseñas de tienda (sin pedido previo) + restricciones
-- ─ reviews.order_id / product_id pasan a opcionales (reseñas de la tienda).
-- ─ Una reseña por usuario y por bisne (upsert desde el prototipo).
-- ════════════════════════════════════════════════════════════════════

alter table public.reviews
  alter column order_id drop not null,
  alter column product_id drop not null;

-- Permitir reseñar una tienda equiparándose al dueño (ya hay una reseña).
alter table public.reviews
  add constraint reviews_user_bisne_unique unique (user_id, bisne_id);

drop policy if exists "reviews_insert_buyer" on public.reviews;
drop policy if exists "reviews_insert" on public.reviews;
create policy "reviews_insert" on public.reviews
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and (
      (order_id is null
        and not exists (select 1 from public.bisnes b where b.id = bisne_id and b.owner_id = auth.uid()))
      or
      (order_id is not null
        and order_is_reviewable(order_id)
        and auth.uid() = (select o.user_id from public.orders o where o.id = order_id))
    )
  );