-- ════════════════════════════════════════════════════════════════════
-- elBisne · 006_tracking_fixes.sql
-- Correcciones Fases 6-9:
-- 1. place_order: idempotencia en columna propia (no ensucia `channel`)
-- 2. RPC get_order_tracking: tracking público del pedido (anon puede leer
--    una fila puntual por uuid; el uuid actúa como token de acceso)
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Columna de idempotencia ────────────────────────────────────────
alter table public.orders add column if not exists client_order_key text;
create unique index if not exists orders_client_order_key_uidx
  on public.orders (client_order_key)
  where client_order_key is not null;

-- place_order v2: usa client_order_key y guarda el canal real
create or replace function public.place_order(
  p_bisne_id uuid,
  p_items jsonb,
  p_customer_name text,
  p_customer_phone text default null,
  p_total numeric default 0,
  p_payment_method text default null,
  p_delivery_mode text default null,
  p_address text default null,
  p_channel text default null,
  p_client_order_key text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id    uuid := auth.uid();
  v_order      public.orders;
  v_item       jsonb;
  v_product    public.products;
  v_qty        integer;
  v_stock_ok   boolean := true;
  v_missing    text[] := '{}';
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido no tiene productos';
  end if;
  if coalesce(p_customer_name, '') = '' then
    raise exception 'El nombre del cliente es requerido';
  end if;

  -- Idempotencia: si la clave ya existe, devolver el pedido original
  if p_client_order_key is not null then
    select o.* into v_order
    from public.orders o
    where o.client_order_key = p_client_order_key
    limit 1;
    if v_order.id is not null then
      return v_order;
    end if;
  end if;

  -- Validar stock de todos los productos antes de escribir
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := coalesce((v_item->>'quantity')::int, 1);

    select pr.* into v_product
    from public.products pr
    where pr.id = (v_item->>'product_id')::uuid;

    if v_product.id is null then
      v_stock_ok := false;
      v_missing := array_append(v_missing, coalesce(v_item->>'name', (v_item->>'product_id')::text));
    elsif v_product.stock is not null and v_product.stock < v_qty then
      v_stock_ok := false;
      v_missing := array_append(v_missing, v_product.name);
    end if;
  end loop;

  if not v_stock_ok then
    raise exception 'Stock insuficiente para: %', array_to_string(v_missing, ', ');
  end if;

  insert into public.orders (
    bisne_id, user_id, customer_name, customer_phone, items,
    total, payment_method, delivery_mode, address, status, channel, client_order_key
  ) values (
    p_bisne_id,
    v_user_id,
    p_customer_name,
    p_customer_phone,
    p_items,
    p_total,
    p_payment_method,
    p_delivery_mode,
    p_address,
    'pending',
    p_channel,
    p_client_order_key
  )
  returning * into v_order;

  -- Decrementar stock (solo productos con stock controlado)
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := coalesce((v_item->>'quantity')::int, 1);

    update public.products
    set stock = greatest(stock - v_qty, 0)
    where id = (v_item->>'product_id')::uuid
      and stock is not null;
  end loop;

  return v_order;
end;
$$;

-- ── 2. Tracking público del pedido ────────────────────────────────────
-- El uuid del pedido actúa como token: quien tenga el enlace puede ver el
-- estado. Devuelve solo campos públicos + bisne_id (para la reseña).
create or replace function public.get_order_tracking(p_order_id uuid)
returns table (
  id uuid,
  status text,
  customer_name text,
  items jsonb,
  total numeric,
  payment_method text,
  delivery_mode text,
  address text,
  created_at timestamptz,
  user_id uuid,
  bisne_id uuid,
  bisne_handle text,
  bisne_name text,
  bisne_logo text
)
language sql
security definer
set search_path = public
as $$
  select
    o.id, o.status, o.customer_name, o.items, o.total,
    o.payment_method, o.delivery_mode, o.address, o.created_at, o.user_id,
    b.id, b.handle, b.business_name, b.logo_url
  from public.orders o
  join public.bisnes b on b.id = o.bisne_id
  where o.id = p_order_id;
$$;

grant execute on function public.get_order_tracking(uuid) to anon, authenticated;
