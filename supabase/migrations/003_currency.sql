-- ════════════════════════════════════════════════════════════════════
-- elBisne · 003_currency.sql
-- Moneda de la tienda: el dueño la elige al crear su bisne.
-- Por defecto se mantiene USD ("$"); el front de la tienda muestra
-- el código/símbolo de su propia moneda (USD, CUP, EUR, etc.).
-- ════════════════════════════════════════════════════════════════════

alter table public.bisnes add column if not exists currency_code text not null default 'USD';
alter table public.bisnes add column if not exists currency_symbol text not null default '$';