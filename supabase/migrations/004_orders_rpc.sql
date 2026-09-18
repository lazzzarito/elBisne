-- ════════════════════════════════════════════════════════════════════
-- elBisne · 004_orders_rpc.sql
-- RPC place_order: inserta el pedido y decrementa stock atómicamente.
-- Idempotente (client_order_key) y segura: valida stock antes de descontar.
-- Ejecutar en el SQL Editor de Supabase.
-- ════════════════════════════════════════════════════════════════════

-- Índices de soporte (búsqueda de pedidos por bisne/usuario)
create index if not exists orders_bisne_id_idx on public.orders (bisne_id, created_at desc);
create index if not exists orders_user_id_idx on public.orders (user_id, created_at desc);

-- ── RPC: crear pedido + decrementar stock (una sola transacción) ──────
-- p_bisne_id        : uuid del Bisne dueño de los productos
-- p_items           : [{ product_id, name, quantity, price, options? }]
-- p_customer_name   : nombre del cliente (requerido)
-- p_customer_phone  : teléfono del cliente
-- p_total           : total del pedido en USD
-- p_payment_method  : método de pago elegido
-- p_delivery_mode   : 'pickup' | 'delivery'
-- p_address         : dirección (si delivery)
-- p_channel         : canal por el que se envió (whatsapp/telegram/email)
-- p_client_order_key: clave de idempotencia generada por el cliente
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
  -- Validaciones básicas
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
    where o.channel = 'rpc:' || p_client_order_key
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

  -- Insertar el pedido (channel guarda la clave de idempotencia con prefijo rpc:)
  insert into public.orders (
    bisne_id, user_id, customer_name, customer_phone, items,
    total, payment_method, delivery_mode, address, status, channel
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
    case when p_client_order_key is not null then 'rpc:' || p_client_order_key else p_channel end
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

-- Ejecutar la RPC requiere sesión válida (usuario autenticado o anónimo con RLS activa).
grant execute on function public.place_order(uuid, jsonb, text, text, numeric, text, text, text, text, text) to anon, authenticated;
