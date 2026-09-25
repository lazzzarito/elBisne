-- ════════════════════════════════════════════════════════════════════
-- 017: Corrección puntual de casos borde de la clasificación 016.
-- ════════════════════════════════════════════════════════════════════

do $cat$
<<corr>>
declare
  r record;
  new_slug text;
  cat_id uuid;
begin
  for r in
    values
      ('Botella de Agua Térmica', 'salud-y-bienestar'),
      ('Vaso Térmico de Acero Inoxidable', 'salud-y-bienestar'),
      ('Set de Banda de Resistencia', 'articulos-deportivos'),
      ('Set de Tazas de Café de Cerámica', 'articulos-del-hogar'),
      ('Trío de Velas de Cera de Soja', 'articulos-del-hogar'),
      ('Hidratante Orgánico de Jazmín', 'belleza-maquillaje-y-perfumes'),
      ('Sérum Iluminador de Vitamina C', 'belleza-maquillaje-y-perfumes')
  loop
    select c.id into cat_id from public.categories c where c.slug = r.column2 limit 1;
    if cat_id is null then
      select c.id into cat_id from public.categories c where c.slug = 'otros-general' limit 1;
    end if;

    delete from public.product_categories
    where product_id in (select id from public.products where name = r.column1);

    update public.products
    set category_id = cat_id
    where name = r.column1;

    insert into public.product_categories (product_id, category_id, position)
    select id, cat_id, 0 from public.products where name = r.column1
    on conflict do nothing;
  end loop;
  raise notice 'Corregidos casos borde';
end $cat$;