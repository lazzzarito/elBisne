-- ════════════════════════════════════════════════════════════════════
-- elBisne · 011_personal_profiles.sql
--   · bisnes.type          'business' (tienda completa: ofertas, reseñas,
--                           verificación, banners...) | 'personal' (perfil
--                           común: solo productos, caducan a los 30 días)
--   · products.expires_at  caducidad del producto. nulo = sin caducar
--                           (solo aplica a perfiles personales)
--   · place_order          rechaza productos caducados (sueltos o en combos)
-- Idempotente. No destructiva.
-- ════════════════════════════════════════════════════════════════════

-- ── bisnes.type ─────────────────────────────────────────────────────
alter table public.bisnes add column if not exists type text not null default 'business';
alter table public.bisnes add constraint bisnes_type_check check (type in ('business', 'personal'));
create index if not exists bisnes_type_idx on public.bisnes (type);

comment on column public.bisnes.type is
  '"business" = tienda completa · "personal" = perfil común (solo productos con caducidad de 30 días)';

-- ── products.expires_at ─────────────────────────────────────────────
alter table public.products add column if not exists expires_at timestamptz;
create index if not exists products_expires_at_idx on public.products (expires_at);

comment on column public.products.expires_at is
  'Perfiles personales: el producto caduca a los 30 días. null = sin caducidad (tiendas).';

-- ── place_order: bloquea ítems caducados ────────────────────────────
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
  v_user_id       uuid := auth.uid();
  v_order         public.orders;
  v_item          jsonb;
  v_product       public.products;
  v_qty           integer;
  v_stock_ok      boolean := true;
  v_missing       text[] := '{}';
  v_is_collection boolean;
  v_collection_id uuid;
  v_sub           record;
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

  -- Validar stock/caducidad de todos los productos (suelto o dentro de un combo)
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(coalesce((v_item->>'quantity')::int, 1), 1);
    v_is_collection := coalesce(v_item->>'item_type', '') = 'collection'
      or (v_item ? 'collection_id');

    if v_is_collection then
      v_collection_id := nullif(v_item->>'collection_id', '')::uuid;
      for v_sub in
        select pr.name, pr.stock, pr.expires_at
        from public.collection_items ci
        join public.products pr on pr.id = ci.product_id
        where ci.collection_id = v_collection_id
      loop
        if v_sub.stock is not null and v_sub.stock < v_qty then
          v_stock_ok := false;
          v_missing := array_append(v_missing, v_sub.name);
        elsif v_sub.expires_at is not null and v_sub.expires_at <= now() then
          v_stock_ok := false;
          v_missing := array_append(v_missing, v_sub.name || ' (caducado)');
        end if;
      end loop;
    else
      select pr.* into v_product
      from public.products pr
      where pr.id = (v_item->>'product_id')::uuid;

      if v_product.id is null then
        v_stock_ok := false;
        v_missing := array_append(v_missing, coalesce(v_item->>'name', (v_item->>'product_id')::text));
      elsif v_product.stock is not null and v_product.stock < v_qty then
        v_stock_ok := false;
        v_missing := array_append(v_missing, v_product.name);
      elsif v_product.expires_at is not null and v_product.expires_at <= now() then
        v_stock_ok := false;
        v_missing := array_append(v_missing, v_product.name || ' (caducado)');
      end if;
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

  -- Descontar stock (solo productos con stock controlado)
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(coalesce((v_item->>'quantity')::int, 1), 1);
    v_is_collection := coalesce(v_item->>'item_type', '') = 'collection'
      or (v_item ? 'collection_id');

    if v_is_collection then
      update public.products pr
      set stock = greatest(pr.stock - v_qty, 0)
      from public.collection_items ci
      where ci.collection_id = nullif(v_item->>'collection_id', '')::uuid
        and pr.id = ci.product_id
        and pr.stock is not null;
    else
      update public.products
      set stock = greatest(stock - v_qty, 0)
      where id = (v_item->>'product_id')::uuid
        and stock is not null;
    end if;
  end loop;

  return v_order;
end;
$$;

grant execute on function public.place_order(uuid, jsonb, text, text, numeric, text, text, text, text, text) to anon, authenticated;