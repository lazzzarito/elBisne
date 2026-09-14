-- ════════════════════════════════════════════════════════════════════
-- elBisne · 002_catalog.sql
-- Catálogo: columnas para productos procedentes del contenido Markdown.
-- El volcado de los 26 productos MD se hace con scripts/migrate-products.mjs.
-- ════════════════════════════════════════════════════════════════════

-- Slug público del producto (= id del .md, usado en /product/[id])
alter table public.products add column if not exists slug text;
create unique index if not exists products_slug_key on public.products (slug) where slug is not null;

-- HTML de la descripción larga (body Markdown renderizado con `marked`)
alter table public.products add column if not exists content_html text;

-- SEO
alter table public.products add column if not exists seo_title text;
alter table public.products add column if not exists seo_description text;

-- Grupo de promoción (target de promoLinks en store-config.json)
alter table public.products add column if not exists promo text;

-- Ampliar status para admitir el valor histórico "coming-soon" del template MD
alter table public.products drop constraint if exists products_status_check;
alter table public.products add constraint products_status_check
  check (status in ('available','coming_soon','coming-soon','out_of_stock'));