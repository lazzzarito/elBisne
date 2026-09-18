-- ════════════════════════════════════════════════════════════════════
-- elBisne · 007_server_side_total.sql
-- place_order v3:
--   1. Resuelve productos por slug O uuid (los items del carrito viajan
--      con el id público; la v2 fallaba el cast ::uuid con slugs).
--   2. Recalcula el total server-side desde products.price (con overrides
--      de opciones) — ignora el total del cliente.
--   3. Valida ownership (todos los productos deben ser del bisne) y status.
--   4. Normaliza items guardados a { product_id: uuid, name, quantity, price }.
-- get_product_sales: ventas acumuladas por producto (para Tendencias).
-- ════════════════════════════════════════════════════════════════════

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
  v_user_id        uuid := auth.uid();
  v_order          public.orders;
  v_item           jsonb;
  v_item_out       jsonb;
  v_product        public.products;
  v_qty            integer;
  v_unit_price     numeric;
  v_price_override numeric;
  v_opt_val        text;
  v_opt_key        text;
  v_el             jsonb;
  v_stock_ok       boolean := true;
  v_missing        text[] := '{}';
  v_total          numeric := 0;
  v_items_out      jsonb := '[]'::jsonb;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido no tiene productos';
  end if;
  if coalesce(p_customer_name, '') = '' then
    raise exception 'El nombre del cliente es requerido';
  end if;
  if not exists (select 1 from public.bisnes b where b.id = p_bisne_id) then
    raise exception 'Tienda no encontrada';
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

  -- ── Validar y recalcular cada item (fuente de verdad: products) ──
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(coalesce((v_item->>'quantity')::int, 1), 1);

    -- El carrito envía el id público: slug (preferente) o uuid
    select pr.* into v_product
    from public.products pr
    where pr.slug = (v_item->>'product_id')
       or pr.id::text = (v_item->>'product_id')
    limit 1;

    -- Ownership: el producto debe pertenecer al bisne del pedido
    if v_product.id is null or v_product.bisne_id <> p_bisne_id then
      v_stock_ok := false;
      v_missing := array_append(v_missing, coalesce(v_item->>'name', v_item->>'product_id'));
      continue;
    end if;

    -- Status no comprable
    if v_product.status in ('out_of_stock', 'coming_soon', 'coming-soon') then
      v_stock_ok := false;
      v_missing := array_append(v_missing, v_product.name);
      continue;
    end if;

    -- Stock controlado
    if v_product.stock is not null and v_product.stock < v_qty then
      v_stock_ok := false;
      v_missing := array_append(v_missing, v_product.name);
      continue;
    end if;

    -- ── Precio server-side (base + overrides de opciones) ──
    v_unit_price := v_product.price;
    if jsonb_typeof(coalesce(v_item->'options', 'null'::jsonb)) = 'object' then
      for v_opt_key in select jsonb_object_keys(v_item->'options') loop
        v_opt_val := v_item->'options'->>v_opt_key;
        v_price_override := null;
        for v_el in select * from jsonb_array_elements(coalesce(v_product.options->v_opt_key, '[]'::jsonb)) loop
          if v_el->>'name' = v_opt_val and v_el ? 'priceUSD' then
            v_price_override := (v_el->>'priceUSD')::numeric;
          end if;
        end loop;
        if v_price_override is not null then
          v_unit_price := v_price_override;
        end if;
      end loop;
    end if;

    v_total := v_total + (v_unit_price * v_qty);

    -- Item normalizado (uuid real + precio validado por el servidor)
    v_item_out := jsonb_build_object(
      'product_id', v_product.id,
      'name', v_product.name,
      'quantity', v_qty,
      'price', v_unit_price
    );
    if jsonb_typeof(coalesce(v_item->'options', 'null'::jsonb)) = 'object' then
      v_item_out := jsonb_set(v_item_out, '{options}', v_item->'options');
    end if;
    v_items_out := v_items_out || v_item_out;
  end loop;

  if not v_stock_ok then
    raise exception 'Stock insuficiente o productos inválidos: %', array_to_string(v_missing, ', ');
  end if;

  insert into public.orders (
    bisne_id, user_id, customer_name, customer_phone, items,
    total, payment_method, delivery_mode, address, status, channel, client_order_key
  ) values (
    p_bisne_id,
    v_user_id,
    p_customer_name,
    p_customer_phone,
    v_items_out,
    v_total,
    p_payment_method,
    p_delivery_mode,
    p_address,
    'pending',
    p_channel,
    p_client_order_key
  )
  returning * into v_order;

  -- Decrementar stock (solo productos con stock controlado)
  for v_item in select * from jsonb_array_elements(v_items_out) loop
    update public.products
    set stock = greatest(stock - (v_item->>'quantity')::int, 0)
    where id = (v_item->>'product_id')::uuid
      and stock is not null;
  end loop;

  return v_order;
end;
$$;

-- ── Ventas acumuladas por producto (Tendencias en Explorar) ──────────
-- Suma cantidades de pedidos no cancelados; resuelve slug o uuid.
create or replace function public.get_product_sales()
returns table (product_id uuid, public_id text, sales bigint)
language sql
security definer
set search_path = public
as $$
  with expanded as (
    select it->>'product_id' as raw_pid, (it->>'quantity')::int as qty
    from public.orders o,
         jsonb_array_elements(o.items) as it
    where o.status <> 'cancelled'
  )
  select p.id, coalesce(p.slug, p.id::text), sum(e.qty)::bigint
  from expanded e
  join public.products p on p.slug = e.raw_pid or p.id::text = e.raw_pid
  group by p.id, p.slug;
$$;

grant execute on function public.get_product_sales() to anon, authenticated;
