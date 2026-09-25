-- ════════════════════════════════════════════════════════════════════
-- 015: Asignar categorías unificadas a los productos existentes
-- (los productos previos quedaron sin categoría al reemplazar el listado).
-- Clasificación heurística por palabras del nombre/descripción; por defecto
-- "Otros - General". Inserta en product_categories y fija products.category_id.
-- ════════════════════════════════════════════════════════════════════

do $cat$
<<blk>>
declare
  p record;
  slug text;
  second_slug text := null;
  cat_id uuid;
  cat2_id uuid;
  idx int := 0;
begin
  for p in
    select id, lower(coalesce(name, '') || ' ' || coalesce(description, '')) as haystack
    from public.products
    where not exists (select 1 from public.product_categories pc where pc.product_id = products.id)
  loop
    slug := 'otros-general';
    second_slug := null;
    if p.haystack ~ 'juego|juguete|beb[eé]|panal|tetero|ni[nñ]' then
      slug := 'juguetes';
    elsif p.haystack ~ 'uniforme|pupil|cuaderno|lapiz|lapicero|mochila|escolar|bloque|libreta|crayon' then
      slug := 'utiles-escolares-y-mochilas';
    elsif p.haystack ~ 'carrito|mamadera|estacion de bebe|corral|hamaca de bebe' then
      slug := 'articulos-de-bebe';
    elsif p.haystack ~ 'vitamina|suplement|prote[íi]na|omega|creatina' then
      slug := 'suplementos-y-nutricion-deportiva';
    elsif p.haystack ~ 'telefono|celular|m[oó]vil|smartphone|tablet|ipad|ipod|computadora|computador|laptop|pc |imac|macbook|monitor|teclado|mouse|m[oó]dem|router|carga|cargador|cable|audifono|auricular|parlante|bocina|soundbar|tv |televisor|smart tv|proyector|camara|gopro|consola|playstation|xbox|nintendo|videojuego|switch ' then
      slug := 'otros-tecnologia';
      if p.haystack ~ 'audifono|auricular|parlante|bocina|soundbar|barra de sonido' then
        second_slug := 'audifonos-bocinas-y-sonido';
      elsif p.haystack ~ 'telefono|celular|m[oó]vil|smartphone' then
        second_slug := 'celulares-y-accesorios';
      elsif p.haystack ~ 'computadora|computador|laptop|pc |macbook|imac|tablet|ipad' then
        second_slug := 'computadoras-y-tablets';
      elsif p.haystack ~ 'consola|playstation|xbox|nintendo|videojuego' then
        second_slug := 'consolas-y-videojuegos';
      elsif p.haystack ~ 'tv |televisor|smart tv|proyector' then
        second_slug := 'televisores-e-imagen';
      elsif p.haystack ~ 'camara|gopro' then
        second_slug := 'camaras-y-fotografia';
      end if;
    elsif p.haystack ~ 'nevera|refrigerador|congelador|lavadora|secadora|cocina|horno|microonda|microondas|ventilador|aire acondicionado|aire acondic|split|plancha|batidora|licuadora|pipa |cafetera|aspiradora' then
      slug := 'otros-electrodomesticos';
      if p.haystack ~ 'nevera|refrigerador|congelador' then
        second_slug := 'refrigeradores-y-neveras';
      elsif p.haystack ~ 'lavadora|secadora' then
        second_slug := 'lavadoras-y-secadoras';
      elsif p.haystack ~ 'cocina|horno|microonda|microondas' then
        second_slug := 'cocinas-y-hornos';
      elsif p.haystack ~ 'ventilador' then
        second_slug := 'ventiladores';
      elsif p.haystack ~ 'aire acondicionado|aire acondic|split' then
        second_slug := 'aire-acondicionado';
      else
        second_slug := 'pequeno-electrodomestico';
      end if;
    elsif p.haystack ~ 'mueble|sof[áa]|sill[óo]n|mesa|silla|cama|colch[óo]n|lampara|l[áa]mpara|espejo|cortina|decor|toalla|s[áa]bana|coj[íi]n|vajilla|olla|sarten|set de cocina|utensilio|silla de masaje|almohada|closet|ropero|organizador' then
      slug := 'articulos-del-hogar';
      if p.haystack ~ 'mueble|sof[áa]|sill[óo]n|mesa|silla|cama|colch[óo]n|closet|ropero' then
        second_slug := 'muebles';
      end if;
    elsif p.haystack ~ 'herramienta|taladro|pala|martillo|destornilla|serrucho|ferreter|tuberia|cable electrico|interruptor|seguro' then
      slug := 'ferreteria-y-herramientas';
    elsif p.haystack ~ 'carro|coche|auto|vehiculo|moto|bicicleta|llanta|neum[áa]tico|repuesto|aceite|bateria|casco|patineta' then
      slug := 'otros-vehiculos';
      if p.haystack ~ 'bicicleta' then
        second_slug := 'bicicletas';
      elsif p.haystack ~ 'llanta|neum[áa]tico|repuesto|bateria|aceite' then
        second_slug := 'repuestos-y-accesorios-de-carros';
      elsif p.haystack ~ 'moto' then
        second_slug := 'motos-de-combustion';
      end if;
    elsif p.haystack ~ 'inmueble|casa en venta|apartamento|terreno|local|oficina|alquiler|permuta|hostal' then
      slug := 'otros-inmobiliaria';
    elsif p.haystack ~ 'empleo|trabajo|vacante' then
      slug := 'ofertas-de-empleo';
    elsif p.haystack ~ 'perfume|perfumer[íi]a|belleza|cosm[ée]tico|crema|maquilla|labial|esmalte|shampoo|champu|jab[óo]n|cuidado personal|cuidado facial|exfoliante|serum|tinte de cabello|brillo de labios' then
      slug := 'belleza-maquillaje-y-perfumes';
    elsif p.haystack ~ 'ropa|camisa|player|camiseta|vestid|pantal[óo]n|blusa|short|medias|calcet|traje|chaqueta|abrigo|sudadera|camis[óo]n|falda|bata|pijama|lencer[íi]a|vestido|jogger|buzo|polo ' then
      slug := 'otros-ropa-y-accesorios';
      if p.haystack ~ 'vestid|blusa|falda|lencer[íi]a|bata|pijama|short de mujer' then
        second_slug := 'ropa-de-mujer';
      elsif p.haystack ~ 'traje|camisa|pantal[óo]n de hombre|polo |buzo' then
        second_slug := 'ropa-de-hombre';
      end if;
    elsif p.haystack ~ 'zapat|tenis|botas|sandalias|chancleta|calzado|tac[óo]n' then
      slug := 'otros-ropa-y-accesorios';
      second_slug := 'zapatos-de-mujer';
    elsif p.haystack ~ 'reloj|joya|anillo|collar|arete|cadena|brazalete|pulsera|lentes|gafas|gorro|bolso|cartera|mochila de mano|billetera|sombrero' then
      slug := 'relojes-joyas-y-accesorios';
    elsif p.haystack ~ 'deporte|gym|gimnasio|ejercicio|pesas|manca|pelota|bal[óo]n|yoga|camping|trota|cuello|soga' then
      slug := 'articulos-deportivos';
    elsif p.haystack ~ 'comida|aliment|caf[eé]|dulce|postre|pan|galleta|helado|jugo|refresco|bebida|cerveza|vino|especia|condimento|chocolate|candy|golosina|snack|queso|pan[es]|harina|arroz|frijol|salsa' then
      slug := 'alimentos-y-bebidas';
    elsif p.haystack ~ 'mascota|perro|gato|alimento para|jaula|arena de gato|collera' then
      slug := 'productos-para-mascotas';
    elsif p.haystack ~ 'guitarra|piano|viol[íi]n|trompeta|instrumento|bateria musical|conga|timbal|lua|flauta|tambor' then
      slug := 'instrumentos-musicales';
    elsif p.haystack ~ 'libro|libros|pelicula|disco|canciones|musica' then
      slug := 'peliculas-musica-y-libros';
    elsif p.haystack ~ 'servicio|env[íi]o|viaje|taxi|clase|curso|repar|mantenimiento|limpieza|catering|sal[óo]n|fotograf[íi]a|evento|electric[íi]a|plomer|taller|costura|bordado' then
      slug := 'otros-servicios';
    end if;

    select c.id into cat_id from public.categories c where c.slug = blk.slug limit 1;
    if cat_id is null then
      select c.id into cat_id from public.categories c where c.slug = 'otros-general' limit 1;
    end if;

    update public.products set category_id = cat_id where id = p.id;
    insert into public.product_categories (product_id, category_id, position)
    values (p.id, cat_id, 0)
    on conflict do nothing;

    if second_slug is not null then
      select c.id into cat2_id from public.categories c where c.slug = blk.second_slug limit 1;
      if cat2_id is not null and cat2_id <> cat_id then
        insert into public.product_categories (product_id, category_id, position)
        values (p.id, cat2_id, 1)
        on conflict do nothing;
      end if;
    end if;

    idx := idx + 1;
  end loop;
  raise notice 'Categorías asignadas a % productos', idx;
end $cat$;