-- ════════════════════════════════════════════════════════════════════
-- 016: Re-clasificación robusta de los productos existentes.
-- Borra y reasigna: primero moda/accesorios, luego hogar/tecnología,
-- vehículos (solo "aceite de motor"), deportes, alimentos, belleza, etc.
-- ════════════════════════════════════════════════════════════════════

do $cat$
<<blk>>
declare
  p record;
  slug text := 'otros-general';
  second_slug text := null;
  cat_id uuid;
  cat2_id uuid;
  idx int := 0;
begin
  -- Reinicia la clasificación actual de todos los productos
  delete from public.product_categories;
  update public.products set category_id = null;

  for p in
    select id, lower(coalesce(name, '') || ' ' || coalesce(description, '')) as h
    from public.products
  loop
    slug := 'otros-general';
    second_slug := null;

    if p.h ~ 'juguete|juego de|beb[eé]|panal|tetero|mamadera|cuna|corralito' then
      slug := case
        when p.h ~ 'beb[eé]|panal|tetero|mamadera|cuna|corralito' then 'articulos-de-bebe'
        else 'juguetes' end;
    elsif p.h ~ 'cuaderno|l[áa]piz|lapicero|mochila escolar|libreta|cray[óo]n|escolar|uniforme escolar|regla|carpeta' then
      slug := 'utiles-escolares-y-mochilas';

    -- Moda y accesorios primero (evita falsos positivos de "móvil" en descripciones)
    elsif p.h ~ 'zapat|tenis|botas|sandalias|chancleta|calzado|tac[óo]n|suela' then
      slug := 'zapatos-de-mujer';
    elsif p.h ~ 'vestid|blusa|falda|lencer[íi]a|bata|pijama|short femin|vestido de mujer|bh |sost[éu]n|brassier' then
      slug := 'ropa-de-mujer';
    elsif p.h ~ 'camisa|pantal[óo]n|camiseta|player|polo |sudadera|chaqueta|traje|abrigo|medias|calcetines|buzo|jogger|pantalonetas|boxer' then
      slug := 'ropa-de-hombre';
    elsif p.h ~ 'bolso|bandolera|cartera|billetera|monedero|gorra|gorro|sombrero|gafas|lentes de sol|lentes|bufanda|guantes de vestir' then
      slug := 'relojes-joyas-y-accesorios';
    elsif p.h ~ 'reloj|joya|anillo|collar|cadena|arete|brazalete|pulsera|diadema|turbante|pinza|broche|argolla' then
      slug := 'relojes-joyas-y-accesorios';

    -- Hogar / electrodomésticos
    elsif p.h ~ 'nevera|refrigerador|congelador|lavadora|secadora|cocina|horno|microonda|ventilador|aire acondic|split|plancha|batidora|licuadora|aspiradora|cafetera|freidora' then
      slug := 'otros-electrodomesticos';
      if p.h ~ 'nevera|refrigerador|congelador' then second_slug := 'refrigeradores-y-neveras';
      elsif p.h ~ 'lavadora|secadora' then second_slug := 'lavadoras-y-secadoras';
      elsif p.h ~ 'microonda|horno|cocina' then second_slug := 'cocinas-y-hornos';
      elsif p.h ~ 'ventilador' then second_slug := 'ventiladores';
      elsif p.h ~ 'aire acondic|split' then second_slug := 'aire-acondicionado';
      else second_slug := 'pequeno-electrodomestico'; end if;
    elsif p.h ~ 'mueble|sof[áa]|sill[óo]n|mesa|silla|cama|colch[óo]n|closet|ropero|almohada|lampara|l[áa]mpara|espejo|cortina|decoraci[óo]n|toalla|s[áa]bana|coj[íi]n|vajilla|olla|sarten|set de cocina|utensilios de cocina|trapeador|escoba|balde|humificador' then
      slug := case
        when p.h ~ 'mueble|sof[áa]|sill[óo]n|mesa|silla|cama|colch[óo]n|closet|ropero' then 'muebles'
        else 'articulos-del-hogar' end;
    elsif p.h ~ 'herramienta|taladro|martillo|destornilla|serrucho|ferreter|lijadora|prensa' then
      slug := 'ferreteria-y-herramientas';

    -- Tecnología
    elsif p.h ~ 'telefono|celular|smartphone|m[oó]vil|iphone|samsung|xiaomi|tablet|ipad|computadora|computador|laptop|macbook|imac|teclado|mouse|monitor|router|cargador|power bank|aud[íi]fono|auricular|parlante|bocina|soundbar|barra de sonido|televisor|smart tv|proyector|c[áa]mara|gopro|consola|playstation|xbox|nintendo|videojuego|cable de|flash drive|pendrive|usb|memoria|impresora|escaner' then
      slug := 'otros-tecnologia';
      if p.h ~ 'aud[íi]fono|auricular|parlante|bocina|soundbar|barra de sonido' then second_slug := 'audifonos-bocinas-y-sonido';
      elsif p.h ~ 'telefono|celular|smartphone|m[oó]vil|iphone|samsung|xiaomi' then second_slug := 'celulares-y-accesorios';
      elsif p.h ~ 'computadora|computador|laptop|macbook|imac|tablet|ipad|teclado|mouse|monitor|impresora' then second_slug := 'computadoras-y-tablets';
      elsif p.h ~ 'consola|playstation|xbox|nintendo|videojuego' then second_slug := 'consolas-y-videojuegos';
      elsif p.h ~ 'televisor|smart tv|proyector' then second_slug := 'televisores-e-imagen';
      elsif p.h ~ 'c[áa]mara|gopro' then second_slug := 'camaras-y-fotografia';
      end if;

    -- Vehículos (solo aceite de motor, no cosmético)
    elsif p.h ~ 'aceite de motor|carro|autom[óo]vil|veh[íi]culo|moto|bicicleta|llanta|neum[áa]tico|repuesto de|bater[íi]a de carro|casco de moto|patineta|scooter|triciclo' then
      slug := 'otros-vehiculos';
      if p.h ~ 'bicicleta' then second_slug := 'bicicletas';
      elsif p.h ~ 'moto|casco de moto|scooter' then second_slug := 'motos-de-combustion';
      elsif p.h ~ 'llanta|neum[áa]tico|repuesto de|bater[íi]a de carro|aceite de motor' then second_slug := 'repuestos-y-accesorios-de-carros';
      end if;

    -- Deportes y bienestar
    elsif p.h ~ 'yoga|esterilla|pesas|mancuerna|bal[óo]n de|pelota|gym|gimnasio|ejercicio|porra|soga|camping|termo|botella termica|hidrataci[óo]n' then
      slug := case
        when p.h ~ 'termo|botella|hidrataci[óo]n' then 'salud-y-bienestar'
        else 'articulos-deportivos' end;

    elsif p.h ~ 'aceite esencial|aromaterapia|relajante|l[áa]vanda|incienso|difusor|vellonera|aceite de masaje|relajaci[óo]n' then
      slug := 'salud-y-bienestar';
    elsif p.h ~ 'perfume|perfumer[íi]a|colonia|agua arom[áa]tica|belleza|cosm[ée]tic|crema|maquilla|labial|esmalte|champ[úu]|shampoo|jab[óo]n|cuidado facial|serum|exfoliante|mascarilla facial|tinte|cera |sal[óo]n de' then
      slug := 'belleza-maquillaje-y-perfumes';
    elsif p.h ~ 'aromatizante|desodorante' then
      slug := 'belleza-maquillaje-y-perfumes';

    elsif p.h ~ 'aliment|caf[eé]|dulce|chocolate|postre|pan |galleta|helado|jugo|refresco|bebida|cerveza|vino|especia|condimento|golosina|snack|queso|harina|arroz|frijole|salsas|conserva|enlatado|mermelada|nutella|mantequilla|leche|yogur' then
      slug := 'alimentos-y-bebidas';

    elsif p.h ~ 'mascota|perro|gato|alimento para mascota|jaula|comedero|arenero|collera' then
      slug := 'productos-para-mascotas';
    elsif p.h ~ 'guitarra|piano|viol[íi]n|trompeta|instrumento|bater[íi]a musical|conga|timbal|flauta|tambor|ukelele' then
      slug := 'instrumentos-musicales';
    elsif p.h ~ 'libro|libros|pel[íi]cula|disco de musica|cd |dvd' then
      slug := 'peliculas-musica-y-libros';

    elsif p.h ~ 'servicio|env[íi]o|viaje|taxi|clase|curso|reparaci[óo]n|mantenimiento|limpieza|catering|fotograf[íi]a|evento|electric[íi]a|plomer|taller|costura|bordado|clases de' then
      slug := 'otros-servicios';
    elsif p.h ~ 'inmueble|casa en venta|apartamento|terreno|local comercial|oficina|alquiler|permuta|hostal' then
      slug := 'otros-inmobiliaria';
    elsif p.h ~ 'empleo|trabajo|vacante|curriculum' then
      slug := 'ofertas-de-empleo';
    end if;

    select c.id into cat_id from public.categories c where c.slug = blk.slug limit 1;
    if cat_id is null then
      select c.id into cat_id from public.categories c where c.slug = 'otros-general' limit 1;
    end if;

    update public.products set category_id = cat_id where id = p.id;
    insert into public.product_categories (product_id, category_id, position)
    values (p.id, cat_id, 0) on conflict do nothing;

    if second_slug is not null then
      select c.id into cat2_id from public.categories c where c.slug = blk.second_slug limit 1;
      if cat2_id is not null and cat2_id <> cat_id then
        insert into public.product_categories (product_id, category_id, position)
        values (p.id, cat2_id, 1) on conflict do nothing;
      end if;
    end if;

    idx := idx + 1;
  end loop;
  raise notice 'Reclasificados % productos', idx;
end $cat$;