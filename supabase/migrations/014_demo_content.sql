-- ════════════════════════════════════════════════════════════════════
-- 014: Contenido demo para visualizar el layout
--   · Usuarios + perfiles demo (revisores)
--   · 5 reseñas por bisne
--   · 2 colecciones por bisne (con sus ítems)
--   · Banners (imágenes de productos) en el hero de cada bisne
-- ════════════════════════════════════════════════════════════════════

-- ── Usuarios demo (auth) ──
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'demo2@elbisne.app', crypt('DemoBisne2024!', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'demo3@elbisne.app', crypt('DemoBisne2024!', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'demo4@elbisne.app', crypt('DemoBisne2024!', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'demo5@elbisne.app', crypt('DemoBisne2024!', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'demo6@elbisne.app', crypt('DemoBisne2024!', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000007', 'authenticated', 'authenticated', 'demo7@elbisne.app', crypt('DemoBisne2024!', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000008', 'authenticated', 'authenticated', 'demo8@elbisne.app', crypt('DemoBisne2024!', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000009', 'authenticated', 'authenticated', 'demo9@elbisne.app', crypt('DemoBisne2024!', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000010', 'authenticated', 'authenticated', 'demo10@elbisne.app', crypt('DemoBisne2024!', gen_salt('bf')), now(), now(), now());

-- ── Perfiles demo ──
insert into public.profiles (id, username, display_name) values
  ('10000000-0000-0000-0000-000000000001', 'ana-reyes', 'Ana Reyes'),
  ('10000000-0000-0000-0000-000000000002', 'carlos-medina', 'Carlos Medina'),
  ('10000000-0000-0000-0000-000000000003', 'laura-diaz', 'Laura Díaz'),
  ('10000000-0000-0000-0000-000000000004', 'pedro-nunez', 'Pedro Núñez'),
  ('10000000-0000-0000-0000-000000000005', 'marta-silva', 'Marta Silva'),
  ('10000000-0000-0000-0000-000000000006', 'jose-herrera', 'José Herrera'),
  ('10000000-0000-0000-0000-000000000007', 'carmen-leon', 'Carmen León'),
  ('10000000-0000-0000-0000-000000000008', 'diego-ramos', 'Diego Ramos'),
  ('10000000-0000-0000-0000-000000000009', 'sofia-torres', 'Sofía Torres'),
  ('10000000-0000-0000-0000-000000000010', 'andres-gil', 'Andrés Gil')
on conflict (id) do nothing;

-- ── 5 reseñas por bisne (una por usuario y bisne) ──
insert into public.reviews (bisne_id, user_id, rating, comment, created_at) values
  ('0b14992d-fa1a-47b3-9260-0c22c92ff6a1','10000000-0000-0000-0000-000000000001',5,'Todo en un mismo lugar. Encontré regalos y electrodomésticos sin salir de casa.', now() - interval '30 days'),
  ('0b14992d-fa1a-47b3-9260-0c22c92ff6a1','10000000-0000-0000-0000-000000000002',5,'El envío fue puntual y el producto llegó en perfecto estado.', now() - interval '25 days'),
  ('0b14992d-fa1a-47b3-9260-0c22c92ff6a1','10000000-0000-0000-0000-000000000003',4,'Muy buen catálogo, aunque me faltó más variedad en tallas.', now() - interval '20 days'),
  ('0b14992d-fa1a-47b3-9260-0c22c92ff6a1','10000000-0000-0000-0000-000000000004',5,'Compra fácil y el vendedor respondió rapidísimo por WhatsApp.', now() - interval '12 days'),
  ('0b14992d-fa1a-47b3-9260-0c22c92ff6a1','10000000-0000-0000-0000-000000000005',4,'Me encantó la atención. Volveré a comprar.', now() - interval '6 days'),
  ('58a8e6b1-76fa-46a4-ac0b-906f4202e7a6','10000000-0000-0000-0000-000000000003',5,'Atención de 10. Me asesoraron para elegir el modelo perfecto.', now() - interval '28 days'),
  ('58a8e6b1-76fa-46a4-ac0b-906f4202e7a6','10000000-0000-0000-0000-000000000004',5,'Producto original y a buen precio. Recomendado.', now() - interval '24 days'),
  ('58a8e6b1-76fa-46a4-ac0b-906f4202e7a6','10000000-0000-0000-0000-000000000009',4,'Buenas ofertas, el envío tardó un poco más de lo previsto.', now() - interval '17 days'),
  ('58a8e6b1-76fa-46a4-ac0b-906f4202e7a6','10000000-0000-0000-0000-000000000010',5,'El embalaje impecable. Repetiré sin dudas.', now() - interval '9 days'),
  ('58a8e6b1-76fa-46a4-ac0b-906f4202e7a6','10000000-0000-0000-0000-000000000007',4,'Muy buena tienda, la comunicación es excelente.', now() - interval '3 days'),
  ('1be8ff61-33a3-4b1a-b48f-13ec3d2bfd7d','10000000-0000-0000-0000-000000000005',5,'Café y productos naturales de gran calidad. El olor es increíble.', now() - interval '26 days'),
  ('1be8ff61-33a3-4b1a-b48f-13ec3d2bfd7d','10000000-0000-0000-0000-000000000010',5,'Todo fresco y bien empacado. Gran experiencia.', now() - interval '22 days'),
  ('1be8ff61-33a3-4b1a-b48f-13ec3d2bfd7d','10000000-0000-0000-0000-000000000002',4,'Me gustó mucho, aunque los precios varían con la temporada.', now() - interval '15 days'),
  ('1be8ff61-33a3-4b1a-b48f-13ec3d2bfd7d','10000000-0000-0000-0000-000000000009',5,'El mejor lugar para comprar un regalo saludable.', now() - interval '8 days'),
  ('1be8ff61-33a3-4b1a-b48f-13ec3d2bfd7d','10000000-0000-0000-0000-000000000006',5,'Sin duda mi tienda de confianza.', now() - interval '2 days'),
  ('47806c3d-a50d-4220-9a79-e015cc973498','10000000-0000-0000-0000-000000000007',5,'Los productos de belleza son originales y funcionan.', now() - interval '29 days'),
  ('47806c3d-a50d-4220-9a79-e015cc973498','10000000-0000-0000-0000-000000000009',5,'Me encantó el surtido de perfumes. Atención de lujo.', now() - interval '21 days'),
  ('47806c3d-a50d-4220-9a79-e015cc973498','10000000-0000-0000-0000-000000000006',4,'Buenos precios, me habría gustado más stock de talles.', now() - interval '14 days'),
  ('47806c3d-a50d-4220-9a79-e015cc973498','10000000-0000-0000-0000-000000000001',5,'Compra segura y entrega puntual.', now() - interval '7 days'),
  ('47806c3d-a50d-4220-9a79-e015cc973498','10000000-0000-0000-0000-000000000002',5,'Mi esposa quedó fascinada con el perfume.', now() - interval '1 day')
on conflict (user_id, bisne_id) do update set rating = excluded.rating, comment = excluded.comment;

-- ── Banner hero: 3 banners por bisne (productos destacados) ──
update public.bisnes b
set banners = sub.items
from (
  select pk.bisne_id, jsonb_agg(
    jsonb_build_object(
      'id', gen_random_uuid()::text,
      'image_url', (pk.images ->> 0),
      'title', pk.name,
      'link_type', 'product',
      'target_id', pk.id::text
    ) order by pk.pos
  ) as items
  from (
    select p.id, p.bisne_id, p.name, p.images,
           row_number() over (partition by p.bisne_id order by p.featured desc, p.created_at) as pos
    from public.products p
  ) pk
  where pk.pos <= 3 and coalesce(jsonb_array_length(pk.images),0) > 0
  group by pk.bisne_id
) sub
where b.id = sub.bisne_id
  and coalesce(jsonb_array_length(b.banners), 0) = 0;

-- ── 2 colecciones por bisne con sus productos ──
do $demo$
declare
  b record;
  col uuid;
  i int := 0;
begin
  for b in select id, handle from public.bisnes order by id loop
    insert into public.collections (bisne_id, title, bio, price, pinned, position, active) values
      (b.id, 'Esenciales ' || b.handle, 'Nuestra selección de imprescindibles.', 0, true, 1, true)
      returning id into col;
    insert into public.collection_items (collection_id, product_id, position)
      select col, pk.id, pk.pos - 1
      from (
        select p.id, row_number() over (order by p.featured desc, p.created_at) as pos
        from public.products p where p.bisne_id = b.id
      ) pk
      where pk.pos <= 4;

    insert into public.collections (bisne_id, title, bio, price, pinned, position, active) values
      (b.id, 'Combo ahorro ' || b.handle, 'Un paquete a precio especial.', 19.99, false, 2, true)
      returning id into col;
    insert into public.collection_items (collection_id, product_id, position)
      select col, pk.id, pk.pos - 1
      from (
        select p.id, row_number() over (order by p.price, p.created_at) as pos
        from public.products p where p.bisne_id = b.id
      ) pk
      where pk.pos <= 3;
    i := i + 1;
  end loop;
end $demo$;