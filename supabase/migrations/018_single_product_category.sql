-- ════════════════════════════════════════════════════════════════════
-- 018: Un producto tiene UNA sola categoría, siempre
--
-- Decisión de producto: un producto no puede tener más de una categoría, en
-- ningún lado y bajo ningún concepto. Eso no se puede garantizar "con datos
-- limpios": hace falta que la base no tenga dónde Representar el estado
-- prohibido. Por eso esta migración no solo limpia, sino que elimina la tabla
-- que lo permitía.
--
-- Historia del problema:
--   · 012SQ introduce product_categories (m2m) y products admite 1..3
--     categorías.
--   · 015/016/017 reclasifican por heurística. Para cascar el árbol de
--     categorías escriben el cubo GENÉRICO como category_id ("Otros -
--     Tecnología") y la categoría ESPECÍFICA como fila extra en
--     product_categories. De ahí salieron los productos con dos categorías.
--   · El front priorizaba product_categories[0] sobre el FK, así que el
--     mismo producto se listaba bajo una categoría u otra según de dónde
--     viniera la query.
--
-- Resultado: products.category_id es la única fuente de verdad, y
-- product_categories deja de existir. Es idempotente.
-- ════════════════════════════════════════════════════════════════════

-- ── 1 · Qué categoría se queda cuando había dos ─────────────────────────
-- El bug de 015/016/017 dejó el cubo genérico como category_id y la
-- categoría buena como fila extra. Si nos quedáramos con category_id tal
-- cual, los audífonos acabarían en "Otros - Tecnología" y se perdería la
-- clasificación de "Audífonos, Bocinas y Sonido".
--
-- Regla: si el producto tiene el cubo genérico ("otros-*") Y además una
-- categoría que no es un cubo, gana la específica. Es una regla general por
-- slug, no una lista de productos, así que también arregla cualquier fila que
-- las migraciones anteriores hayan dejado igual.
update public.products p
set category_id = specific.category_id
from (
  select distinct on (pc.product_id) pc.product_id, pc.category_id
  from public.product_categories pc
  join public.categories c on c.id = pc.category_id
  join public.products p2 on p2.id = pc.product_id
  where c.slug not like 'otros-%'
    and p2.category_id is not null
    and exists (
      select 1
      from public.product_categories pc2
      join public.categories c2 on c2.id = pc2.category_id
      where pc2.product_id = pc.product_id
        and c2.slug like 'otros-%'
    )
  order by pc.product_id, pc.position, pc.category_id
) specific
where p.id = specific.product_id
  and p.category_id is distinct from specific.category_id;

-- ── 2 · Rellenar category_id de productos que vinieran sin él ──────────
update public.products p
set category_id = src.category_id
from (
  select distinct on (pc.product_id) pc.product_id, pc.category_id
  from public.product_categories pc
  order by pc.product_id, pc.position, pc.category_id
) src
where p.category_id is null
  and src.product_id = p.id;

update public.products p
set category_id = (select c.id from public.categories c where c.slug = 'otros-general' limit 1)
where p.category_id is null
  and exists (select 1 from public.categories c where c.slug = 'otros-general');

-- Si todavía queda alguno huérfano, la migración debe loudly fallar en vez
-- de dejar el NOT NULL de más abajo como un error de la app en runtime.
do $blk$
declare
  orphans int;
begin
  select count(*) into orphans from public.products where category_id is null;
  if orphans > 0 then
    raise exception
      '018: quedan % productos sin categoría y no existe "otros-general". '
      'Crea esa categoría y vuelve a correr la migración.', orphans;
  end if;
end $blk$;

-- ── 3 · category_id obligatorio ─────────────────────────────────────────
-- Con esto ya no se puede crear un producto sin categoría. Y como la tabla
-- puente se va en el paso 4, tampoco se puede crear uno con dos.
alter table public.products
  alter column category_id set not null;

-- ── 4 · Eliminar la tabla que permitía tener varias ─────────────────────
-- El orden importa: los pasos 1 y 2 la leen, así que se va al final. No queda
-- ni el esquema ni las policies: la posibilidad de 1..3 categorías deja de
-- existir en la base, no solo en el front.
drop table if exists public.product_categories;
