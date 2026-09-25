-- ════════════════════════════════════════════════════════════════════
-- 012: Categorías unificadas del sitio
-- ─ Un solo listado global de categorías (grupo + ítem), ver requisitos.
-- ─ products ahora admite 1..3 categorías vía product_categories (m2m).
-- ════════════════════════════════════════════════════════════════════

alter table public.categories add column if not exists group_name text not null default '';

-- Desvincular categorías antiguas antes de reemplazarlas
update public.products set category_id = null where category_id is not null;
update public.bisnes set category_id = null where category_id is not null;
delete from public.categories;

insert into public.categories (name, slug, group_name, icon) values
  ('Motos Eléctricas y Triciclos','motos-electricas-y-triciclos','Vehículos',null),
  ('Motos de Combustión','motos-de-combustion','Vehículos',null),
  ('Repuestos y Accesorios de Motos','repuestos-y-accesorios-de-motos','Vehículos',null),
  ('Carros','carros','Vehículos',null),
  ('Repuestos y Accesorios de Carros','repuestos-y-accesorios-de-carros','Vehículos',null),
  ('Bicicletas','bicicletas','Vehículos',null),
  ('Alquiler de Carros','alquiler-de-carros','Vehículos',null),
  ('Otros - Vehículos','otros-vehiculos','Vehículos',null),
  ('Casas','casas','Inmobiliaria',null),
  ('Alquiler a Cubanos','alquiler-a-cubanos','Inmobiliaria',null),
  ('Alquiler a Extranjeros','alquiler-a-extranjeros','Inmobiliaria',null),
  ('Alquiler Vacacional','alquiler-vacacional','Inmobiliaria',null),
  ('Permutas','permutas','Inmobiliaria',null),
  ('Otros - Inmobiliaria','otros-inmobiliaria','Inmobiliaria',null),
  ('Celulares y Accesorios','celulares-y-accesorios','Tecnología',null),
  ('Televisores e Imagen','televisores-e-imagen','Tecnología',null),
  ('Computadoras y Tablets','computadoras-y-tablets','Tecnología',null),
  ('Accesorios de Computadoras','accesorios-de-computadoras','Tecnología',null),
  ('Consolas y Videojuegos','consolas-y-videojuegos','Tecnología',null),
  ('Audífonos, Bocinas y Sonido','audifonos-bocinas-y-sonido','Tecnología',null),
  ('Cámaras y Fotografía','camaras-y-fotografia','Tecnología',null),
  ('Otros - Tecnología','otros-tecnologia','Tecnología',null),
  ('Ofertas de Empleo','ofertas-de-empleo','Empleos',null),
  ('Busco Empleo','busco-empleo','Empleos',null),
  ('Ropa de Mujer','ropa-de-mujer','Ropa y Accesorios',null),
  ('Zapatos de Mujer','zapatos-de-mujer','Ropa y Accesorios',null),
  ('Ropa de Hombre','ropa-de-hombre','Ropa y Accesorios',null),
  ('Zapatos de Hombre','zapatos-de-hombre','Ropa y Accesorios',null),
  ('Relojes, Joyas y Accesorios','relojes-joyas-y-accesorios','Ropa y Accesorios',null),
  ('Belleza, Maquillaje y Perfumes','belleza-maquillaje-y-perfumes','Ropa y Accesorios',null),
  ('Otros - Ropa y Accesorios','otros-ropa-y-accesorios','Ropa y Accesorios',null),
  ('Construcción y Mantenimiento','construccion-y-mantenimiento','Servicios',null),
  ('Catering y Comida a Domicilio','catering-y-comida-a-domicilio','Servicios',null),
  ('Belleza, Salud y Cuidado Personal','belleza-salud-y-cuidado-personal','Servicios',null),
  ('Talleres y Reparaciones','talleres-y-reparaciones','Servicios',null),
  ('Eventos y Entretenimiento','eventos-y-entretenimiento','Servicios',null),
  ('Limpieza y Cuidado','limpieza-y-cuidado','Servicios',null),
  ('Clases y Cursos','clases-y-cursos','Servicios',null),
  ('Informática, Creatividad y Marketing','informatica-creatividad-y-marketing','Servicios',null),
  ('Transporte y Logística','transporte-y-logistica','Servicios',null),
  ('Otros - Servicios','otros-servicios','Servicios',null),
  ('Refrigeradores y Neveras','refrigeradores-y-neveras','Electrodomésticos',null),
  ('Lavadoras y Secadoras','lavadoras-y-secadoras','Electrodomésticos',null),
  ('Cocinas y Hornos','cocinas-y-hornos','Electrodomésticos',null),
  ('Ventiladores','ventiladores','Electrodomésticos',null),
  ('Aire Acondicionado','aire-acondicionado','Electrodomésticos',null),
  ('Pequeño Electrodoméstico','pequeno-electrodomestico','Electrodomésticos',null),
  ('Otros - Electrodomésticos','otros-electrodomesticos','Electrodomésticos',null),
  ('Muebles','muebles','Hogar',null),
  ('Arte, Antigüedades y Colección','arte-antiguedades-y-coleccion','Hogar',null),
  ('Plantas y Estaciones de Energía','plantas-y-estaciones-de-energia','Hogar',null),
  ('Materiales de Construcción','materiales-de-construccion','Hogar',null),
  ('Ferretería y Herramientas','ferreteria-y-herramientas','Hogar',null),
  ('Artículos del Hogar','articulos-del-hogar','Hogar',null),
  ('Otros - Hogar','otros-hogar','Hogar',null),
  ('Salud y Bienestar','salud-y-bienestar','Familia',null),
  ('Alimentos y Bebidas','alimentos-y-bebidas','Familia',null),
  ('Ropa y Zapatos de Niños','ropa-y-zapatos-de-ninos','Familia',null),
  ('Artículos de Bebé','articulos-de-bebe','Familia',null),
  ('Juguetes','juguetes','Familia',null),
  ('Útiles Escolares y Mochilas','utiles-escolares-y-mochilas','Familia',null),
  ('Otros - Familia','otros-familia','Familia',null),
  ('Productos para Mascotas','productos-para-mascotas','General',null),
  ('Instrumentos Musicales','instrumentos-musicales','General',null),
  ('Artículos Deportivos','articulos-deportivos','General',null),
  ('Suplementos y Nutrición Deportiva','suplementos-y-nutricion-deportiva','General',null),
  ('Películas, Música y Libros','peliculas-musica-y-libros','General',null),
  ('Otros - General','otros-general','General',null);

-- Mapeo de categorías antiguas → nuevas (backfill con lo existente)
create temp table if not exists _cat_map(old_slug text primary key, new_slug text);
insert into _cat_map(old_slug, new_slug) values
  ('electronica','otros-tecnologia'),
  ('cosmeticos','belleza-maquillaje-y-perfumes'),
  ('perfumeria','belleza-maquillaje-y-perfumes'),
  ('hogar','articulos-del-hogar'),
  ('hogar-cocina','articulos-del-hogar'),
  ('joyeria','relojes-joyas-y-accesorios'),
  ('accesorios','relojes-joyas-y-accesorios'),
  ('deportes','articulos-deportivos'),
  ('ropa','otros-ropa-y-accesorios'),
  ('calzado','otros-ropa-y-accesorios'),
  ('general','otros-general');

create table if not exists public.product_categories (
  product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  position int not null default 0,
  primary key (product_id, category_id)
);

alter table public.product_categories enable row level security;

drop policy if exists "product_categories_select_public" on public.product_categories;
create policy "product_categories_select_public" on public.product_categories
  for select using (true);

drop policy if exists "product_categories_insert_owner" on public.product_categories;
create policy "product_categories_insert_owner" on public.product_categories
  for insert to authenticated
  with check (exists (
    select 1 from public.products p
    join public.bisnes b on b.id = p.bisne_id
    where p.id = product_id and b.owner_id = auth.uid()
  ));

drop policy if exists "product_categories_update_owner" on public.product_categories;
create policy "product_categories_update_owner" on public.product_categories
  for update to authenticated
  using (exists (
    select 1 from public.products p
    join public.bisnes b on b.id = p.bisne_id
    where p.id = product_id and b.owner_id = auth.uid()
  ));

drop policy if exists "product_categories_delete_owner" on public.product_categories;
create policy "product_categories_delete_owner" on public.product_categories
  for delete to authenticated
  using (exists (
    select 1 from public.products p
    join public.bisnes b on b.id = p.bisne_id
    where p.id = product_id and b.owner_id = auth.uid()
  ));

grant select on public.product_categories to anon, authenticated;
grant insert, update, delete on public.product_categories to authenticated;