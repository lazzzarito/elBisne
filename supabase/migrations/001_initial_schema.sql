-- ════════════════════════════════════════════════════════════════════
-- elBisne · 001_initial_schema.sql
-- Esquema completo + RLS + categorías base.
-- Idempotente: puede re-ejecutarse sin romper (IF NOT EXISTS + drop guards).
-- Los datos demo (bisnes, productos, usuarios propietarios) se siembran
-- con `node scripts/seed.mjs` (usa el SUPABASE_SERVICE_ROLE_KEY).
-- ════════════════════════════════════════════════════════════════════

-- ── Extensiones ──────────────────────────────────────────────────────
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ── Helper: set_updated_at ────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Helper: handle_new_user (crea profile al registrarse) ──────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1) || '-' || substr(new.id::text, 1, 8)),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ════════════════════════════════════════════════════════════════════
-- TABLAS
-- ════════════════════════════════════════════════════════════════════

-- Perfil de usuario (siempre existe; un usuario puede además tener tienda)
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null,
  display_name text,
  avatar_url   text,
  bio          text,
  created_at   timestamptz default now()
);

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Categorías globales del marketplace
create table if not exists public.categories (
  id   uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  icon text
);

-- Tienda del Bisne (1:1 con profiles, solo si el usuario activa su tienda)
create table if not exists public.bisnes (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid unique not null references public.profiles(id) on delete cascade,
  handle                text unique not null,
  business_name         text not null,
  slogan                text,
  logo_url              text,
  cover_url             text,
  phone_whatsapp        text not null,
  description           text,
  address               text,
  hours                 text,
  category_id           uuid references public.categories(id),
  delivery_mode         text check (delivery_mode in ('pickup','delivery','both','none')) default 'both',
  social_links          jsonb default '{}',
  map_embed_url         text,
  theme                 jsonb default '{}',
  layout                jsonb default '{}',
  verified              boolean default false,
  verification_requested boolean default false,
  created_at            timestamptz default now()
);

-- Productos (cada uno pertenece a un Bisne)
create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  bisne_id        uuid not null references public.bisnes(id) on delete cascade,
  name            text not null,
  description     text,
  price           numeric(10,2) not null,
  original_price  numeric(10,2),
  stock           integer default 0,
  status          text check (status in ('available','coming_soon','out_of_stock')) default 'available',
  featured        boolean default false,
  offer           boolean default false,
  category_id     uuid references public.categories(id),
  images          jsonb default '[]',
  attributes      jsonb default '{}',
  options         jsonb default '{}',
  ratio           text check (ratio in ('tall','square','wide')),
  sort_order      integer default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- Pedidos (checkout; un pedido por Bisne; user_id opcional para reseñas/notificaciones)
create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  bisne_id       uuid not null references public.bisnes(id),
  user_id        uuid references public.profiles(id) on delete set null,
  customer_name  text not null,
  customer_phone text,
  items          jsonb not null,
  total          numeric(10,2) not null,
  payment_method text,
  delivery_mode  text,
  address        text,
  status         text default 'pending',
  channel        text,
  created_at     timestamptz default now()
);

-- Favoritos de productos (sincronizados por usuario)
create table if not exists public.favorites (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, product_id)
);

-- Seguimiento de Bisnes
create table if not exists public.follows (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  bisne_id   uuid not null references public.bisnes(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, bisne_id)
);

-- Solicitudes de verificación
create table if not exists public.verification_requests (
  id           uuid primary key default gen_random_uuid(),
  bisne_id     uuid not null references public.bisnes(id) on delete cascade,
  status       text check (status in ('pending','approved','rejected')) default 'pending',
  submitted_at timestamptz default now(),
  reviewed_at  timestamptz
);

-- Reseñas (Fase 8: solo compradores de pedidos confirmados)
create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  bisne_id   uuid not null references public.bisnes(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  rating     integer not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz default now()
);

-- Cupones por Bisne (Fase 8)
create table if not exists public.coupons (
  id            uuid primary key default gen_random_uuid(),
  bisne_id      uuid not null references public.bisnes(id) on delete cascade,
  code          text not null,
  discount_type text check (discount_type in ('percent','fixed')) default 'percent',
  amount        numeric(10,2) not null,
  starts_at     timestamptz default now(),
  expires_at    timestamptz,
  usage_limit   integer default 0,
  times_used    integer default 0,
  active        boolean default true,
  created_at    timestamptz default now(),
  unique (bisne_id, code)
);

-- Notificaciones (Fase 9)
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,
  payload    jsonb default '{}',
  read       boolean default false,
  created_at timestamptz default now()
);

-- ════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════════

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.bisnes enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.favorites enable row level security;
alter table public.follows enable row level security;
alter table public.verification_requests enable row level security;
alter table public.reviews enable row level security;
alter table public.coupons enable row level security;
alter table public.notifications enable row level security;

-- profiles: lectura pública, escritura solo propia
drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public" on public.profiles for select using (true);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

-- categories: lectura pública (escritura solo service_role)
drop policy if exists "categories_select_public" on public.categories;
create policy "categories_select_public" on public.categories for select using (true);

-- bisnes: lectura pública, escritura solo el dueño
drop policy if exists "bisnes_select_public" on public.bisnes;
create policy "bisnes_select_public" on public.bisnes for select using (true);
drop policy if exists "bisnes_insert_owner" on public.bisnes;
create policy "bisnes_insert_owner" on public.bisnes for insert with check (auth.uid() = owner_id);
drop policy if exists "bisnes_update_owner" on public.bisnes;
create policy "bisnes_update_owner" on public.bisnes for update using (auth.uid() = owner_id);
drop policy if exists "bisnes_delete_owner" on public.bisnes;
create policy "bisnes_delete_owner" on public.bisnes for delete using (auth.uid() = owner_id);

-- products: lectura pública, escritura solo el dueño del bisne
drop policy if exists "products_select_public" on public.products;
create policy "products_select_public" on public.products for select using (true);
drop policy if exists "products_insert_owner" on public.products;
create policy "products_insert_owner" on public.products for insert
  with check (auth.uid() in (select owner_id from public.bisnes where id = products.bisne_id));
drop policy if exists "products_update_owner" on public.products;
create policy "products_update_owner" on public.products for update
  using (auth.uid() in (select owner_id from public.bisnes where id = products.bisne_id));
drop policy if exists "products_delete_owner" on public.products;
create policy "products_delete_owner" on public.products for delete
  using (auth.uid() in (select owner_id from public.bisnes where id = products.bisne_id));

-- orders: insertable por cualquiera, lectura solo el dueño del bisne
drop policy if exists "orders_insert_public" on public.orders;
create policy "orders_insert_public" on public.orders for insert with check (true);
drop policy if exists "orders_select_owner" on public.orders;
create policy "orders_select_owner" on public.orders for select
  using (auth.uid() in (select owner_id from public.bisnes where id = orders.bisne_id));

-- favorites: CRUD propio
drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own" on public.favorites for select using (auth.uid() = user_id);
drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own" on public.favorites for insert with check (auth.uid() = user_id);
drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own" on public.favorites for delete using (auth.uid() = user_id);

-- follows: CRUD propio
drop policy if exists "follows_select_own" on public.follows;
create policy "follows_select_own" on public.follows for select using (auth.uid() = user_id);
drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own" on public.follows for insert with check (auth.uid() = user_id);
drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own" on public.follows for delete using (auth.uid() = user_id);

-- verification_requests: propia + (admin siempre via service_role)
drop policy if exists "verification_select_own" on public.verification_requests;
create policy "verification_select_own" on public.verification_requests for select
  using (auth.uid() in (select owner_id from public.bisnes where id = verification_requests.bisne_id));
drop policy if exists "verification_insert_own" on public.verification_requests;
create policy "verification_insert_own" on public.verification_requests for insert
  with check (auth.uid() in (select owner_id from public.bisnes where id = verification_requests.bisne_id));
drop policy if exists "verification_update_own" on public.verification_requests;
create policy "verification_update_own" on public.verification_requests for update
  using (auth.uid() in (select owner_id from public.bisnes where id = verification_requests.bisne_id));

-- reviews: lectura pública, escritura por comprador autenticado del pedido
drop policy if exists "reviews_select_public" on public.reviews;
create policy "reviews_select_public" on public.reviews for select using (true);
drop policy if exists "reviews_insert_buyer" on public.reviews;
create policy "reviews_insert_buyer" on public.reviews for insert
  with check (
    auth.uid() = (select user_id from public.orders where id = reviews.order_id)
    and (select status from public.orders where id = reviews.order_id) = 'confirmed'
  );

-- coupons: lectura pública, escritura dueño del bisne
drop policy if exists "coupons_select_public" on public.coupons;
create policy "coupons_select_public" on public.coupons for select using (true);
drop policy if exists "coupons_insert_owner" on public.coupons;
create policy "coupons_insert_owner" on public.coupons for insert
  with check (auth.uid() in (select owner_id from public.bisnes where id = coupons.bisne_id));
drop policy if exists "coupons_update_owner" on public.coupons;
create policy "coupons_update_owner" on public.coupons for update
  using (auth.uid() in (select owner_id from public.bisnes where id = coupons.bisne_id));

-- notifications: solo propias
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications for select using (auth.uid() = user_id);
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications for update using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════════
-- SEED: categorías base (los datos demo viven en scripts/seed.mjs)
-- ════════════════════════════════════════════════════════════════════

insert into public.categories (name, slug, icon) values
  ('Accesorios',    'accesorios',    'watch'),
  ('Electrónica',   'electronica',   'speaker'),
  ('Cosméticos',    'cosmeticos',    'droplet'),
  ('Ropa',          'ropa',          'tshirt'),
  ('Hogar',         'hogar',         'home'),
  ('Hogar y Cocina','hogar-cocina',  'coffee'),
  ('Joyería',       'joyeria',       'gem'),
  ('Calzado',       'calzado',       'footprints'),
  ('Perfumería',    'perfumeria',    'sparkles'),
  ('Deportes',      'deportes',      'activity'),
  ('General',       'general',       'shopping-bag')
on conflict (slug) do nothing;