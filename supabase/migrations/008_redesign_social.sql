-- ════════════════════════════════════════════════════════════════════
-- elBisne · 008_redesign_social.sql
-- Rediseño social v2.0 (UI_UX.md):
--   · bisnes.pinned_banner (JSON: offer | map | image) — Fase A
--   · site_promos (slider global de promos + fallback publicitario) — Fase C/E
-- Idempotente. No destructiva: columna nullable y tabla nueva.
-- ════════════════════════════════════════════════════════════════════

-- ── bisnes.pinned_banner (Fase A · banner fijable del perfil) ─────────
alter table public.bisnes add column if not exists pinned_banner jsonb default null;
comment on column public.bisnes.pinned_banner is
  'Banner fijable del perfil: { type: "offer"|"map"|"image", ref }';

-- ── site_promos (Fase C · slider de promos global del sitio) ──────────
create table if not exists public.site_promos (
  id          uuid primary key default gen_random_uuid(),
  title       text not null default '',
  subtitle    text,
  image_url   text not null,
  link_url    text not null default '',
  link_type   text not null default 'url' check (link_type in ('url','bisne')),
  bisne_handle text,
  position    integer default 0,
  active      boolean default true,
  created_at  timestamptz default now()
);
create index if not exists site_promos_active_idx on public.site_promos (active, position);

alter table public.site_promos enable row level security;

drop policy if exists "site_promos_select_public" on public.site_promos;
create policy "site_promos_select_public" on public.site_promos for select
  using (active = true);

drop policy if exists "site_promos_write_admin" on public.site_promos;
create policy "site_promos_write_admin" on public.site_promos for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ── ad_slots (Fase E · slots publicitarios con fallback a site_promos) ─
create table if not exists public.ad_slots (
  id          uuid primary key default gen_random_uuid(),
  slot        text not null unique, -- 'home-top' | 'home-mid' | 'explorar'
  image_url   text not null,
  link_url    text not null default '',
  title       text not null default 'Publicidad',
  active      boolean default true,
  created_at  timestamptz default now()
);
create index if not exists ad_slots_active_idx on public.ad_slots (active, slot);

alter table public.ad_slots enable row level security;

drop policy if exists "ad_slots_select_public" on public.ad_slots;
create policy "ad_slots_select_public" on public.ad_slots for select
  using (active = true);

-- Escritura solo vía service_role (dashboard / admin)
drop policy if exists "ad_slots_write_admin" on public.ad_slots;
create policy "ad_slots_write_admin" on public.ad_slots for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ── Contador público de seguidores (Fase A · contadores del header) ────
-- follows tiene RLS privada (solo ves tus follows); esta RPC security definer
-- expone SOLO el conteo por bisne para los contadores del perfil.
create or replace function public.get_bisne_followers(p_bisne_id uuid)
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*) from public.follows where bisne_id = p_bisne_id;
$$;

grant execute on function public.get_bisne_followers(uuid) to anon, authenticated;
