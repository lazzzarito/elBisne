-- ════════════════════════════════════════════════════════════════════
-- elBisne · 010_collections_banners.sql
--   · bisnes.banners   (JSON: slider de banners del perfil, máx. 5)
--   · collections      (colecciones/combos con precio fijo)
--   · collection_items (N productos por colección — un producto puede
--                       pertenecer a varias colecciones)
--   · place_order     (acepta líneas de colección y descuenta el stock
--                       de cada producto incluido en el combo)
-- Idempotente. No destructiva.
-- ════════════════════════════════════════════════════════════════════

-- ── bisnes.banners ───────────────────────────────────────────────────
alter table public.bisnes add column if not exists banners jsonb default '[]'::jsonb;
comment on column public.bisnes.banners is
  'Slider de banners del perfil: [{ id, image_url, title, link_type: "product"|"collection", target_id }]';

-- ── collections ──────────────────────────────────────────────────────
create table if not exists public.collections (
  id          uuid primary key default gen_random_uuid(),
  bisne_id    uuid not null references public.bisnes(id) on delete cascade,
  title       text not null,
  bio         text,
  image_url   text,
  price       numeric(10,2) not null default 0,
  pinned      boolean default false,
  position    integer default 0,
  active      boolean default true,
  created_at  timestamptz default now()
);
create index if not exists collections_bisne_idx on public.collections (bisne_id, active, position);

alter table public.collections enable row level security;

drop policy if exists "collections_select_public" on public.collections;
create policy "collections_select_public" on public.collections for select using (true);

drop policy if exists "collections_insert_owner" on public.collections;
create policy "collections_insert_owner" on public.collections for insert
  with check (auth.uid() in (select owner_id from public.bisnes where id = collections.bisne_id));

drop policy if exists "collections_update_owner" on public.collections;
create policy "collections_update_owner" on public.collections for update
  using (auth.uid() in (select owner_id from public.bisnes where id = collections.bisne_id));

drop policy if exists "collections_delete_owner" on public.collections;
create policy "collections_delete_owner" on public.collections for delete
  using (auth.uid() in (select owner_id from public.bisnes where id = collections.bisne_id));

-- ── collection_items ─────────────────────────────────────────────────
create table if not exists public.collection_items (
  collection_id uuid not null references public.collections(id) on delete cascade,
  product_id    uuid not null references public.products(id) on delete cascade,
  position      integer default 0,
  primary key (collection_id, product_id)
);
create index if not exists collection_items_collection_idx on public.collection_items (collection_id, position);
create index if not exists collection_items_product_idx on public.collection_items (product_id);

alter table public.collection_items enable row level security;

drop policy if exists "collection_items_select_public" on public.collection_items;
create policy "collection_items_select_public" on public.collection_items for select using (true);

drop policy if exists "collection_items_write_owner" on public.collection_items;
create policy "collection_items_write_owner" on public.collection_items for all
  using (
    exists (
      select 1 from public.collections c
      join public.bisnes b on b.id = c.bisne_id
      where c.id = collection_items.collection_id and b.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.collections c
      join public.bisnes b on b.id = c.bisne_id
      where c.id = collection_items.collection_id and b.owner_id = auth.uid()
    )
  );

-- ── place_order: soporta líneas de colección (descuenta stock) ───────
-- Se mantiene la misma firma para no re-grantar nada.
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

  -- Validar stock de todos los productos (suelto o dentro de un combo)
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(coalesce((v_item->>'quantity')::int, 1), 1);
    v_is_collection := coalesce(v_item->>'item_type', '') = 'collection'
      or (v_item ? 'collection_id');

    if v_is_collection then
      v_collection_id := nullif(v_item->>'collection_id', '')::uuid;
      for v_sub in
        select pr.name, pr.stock
        from public.collection_items ci
        join public.products pr on pr.id = ci.product_id
        where ci.collection_id = v_collection_id
      loop
        if v_sub.stock is not null and v_sub.stock < v_qty then
          v_stock_ok := false;
          v_missing := array_append(v_missing, v_sub.name);
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
