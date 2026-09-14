---
# ═══════════════════════════════════════════════════════════
#  PLANTILLA DE PRODUCTO — elBisne
#  Todos los campos compatibles están documentados abajo.
#  Copia este archivo en content/products/, renómbralo y
#  completa con tus datos. Elimina los campos que no uses.
# ═══════════════════════════════════════════════════════════

# ── CAMPOS OBLIGATORIOS ──────────────────────────────────────

# Identificador único del producto. Usa solo letras, números y guiones.
# Si se omite, se usa automáticamente el nombre del archivo (sin .md).
id: "mi-producto"

# Nombre del producto — se muestra en tarjetas, modales, carrito y pedidos de WhatsApp.
name: "Nombre de mi producto"

# Precio de venta actual en USD (decimal). Siempre requerido.
# La plantilla admite cualquier símbolo de moneda definido en store-config.json.
priceUSD: 19.99

# ── VISUALIZACIÓN Y ORDEN ─────────────────────────────────

# Nombre de la categoría para filtrar. Los productos con la misma
# categoría se agrupan en el filtro del catálogo.
category: "General"

# Descripción corta — se muestra en la tarjeta del producto y en el modal.
description: "Una breve descripción del producto en una línea."

# Los productos destacados siempre aparecen PRIMERO en el catálogo, antes
# del orden alfabético. Pon true para resaltar productos importantes.
# Por defecto: false
featured: true

# ── PROMOCIONES ───────────────────────────────────────────

# Precio original (más alto) — habilita la visualización tachada de OFERTA
# y el distintivo de descuento. Solo se muestra si originalPrice > priceUSD.
# Omite este campo si el producto no está en oferta.
originalPrice: 29.99

# Indicador de oferta flash. Si es true Y hay originalPrice Y
# originalPrice > priceUSD, el producto aparece en la sección
# "Ofertas Flash" en la parte superior del catálogo.
# Por defecto: false
offer: true

# ── INVENTARIO Y DISPONIBILIDAD ────────────────────────────

# Cantidad de stock disponible. Controla el valor máximo del
# selector de cantidad en el modal del producto.
#   - stock < 10    → muestra el mensaje "Solo quedan N"
#   - stock === 0   → muestra "Agotado", botones deshabilitados
#   - Omitido       → sin límite (selector máximo = 99)
# Por defecto: sin límite
stock: 25

# Estado de disponibilidad del producto. Invalida el comportamiento del stock:
#   "coming-soon"   → muestra distintivo "Próximamente", botones deshabilitados
#   Omitido          → comportamiento normal según stock
# Por defecto: (ninguno)
status: "coming-soon"

# Identificador del grupo de promoción. Los productos con el mismo valor
# de promo se agrupan en un banner de promoción modal.
# Debe coincidir con el campo `target` de un promoLink en store-config.json.
# Omítelo si el producto no forma parte de un grupo promocional.
promo: "summer-sale"

# ── IMÁGENES ───────────────────────────────────────────────

# Imagen única del producto (cadena). Puedes usar:
#   - Un nombre de archivo local (colocado en content/products/)
#   - Una URL completa (https://...)
# La imagen se usa en la tarjeta del producto y como primera imagen de galería.
image: "mi-producto.webp"

# Múltiples imágenes para la galería del modal (arreglo de cadenas).
# Si se omite pero `image` está definido, la galería muestra solo esa imagen.
# Admite los mismos formatos que `image` (archivos locales o URLs).
images:
  - "mi-producto-angulo-1.webp"
  - "mi-producto-angulo-2.webp"
  - "mi-producto-detalle.webp"

# ── OPCIONES / VARIANTES ───────────────────────────────────

# Variantes del producto como talla, color, material, etc.
# Cada clave es un nombre de grupo de variantes (p. ej., "Talla", "Color").
# Cada valor es una lista de opciones. Cada opción puede tener:
#   name       : Nombre visible (obligatorio)
#   priceUSD   : Sobrescribe el precio base de esta opción (opcional)
#   originalPrice: Sobrescribe el precio original de esta opción (opcional)
#   image      : Sobrescribe la imagen del producto cuando se selecciona esta opción (opcional)
#
# Cuando existen opciones, la tarjeta del producto muestra un botón
# "Añadir al carrito" que abre el modal para elegir la opción en lugar de
# añadirlo directamente. La primera opción de cada grupo viene pre-seleccionada.
#
# Omite todo el bloque `options` para productos simples sin variantes.
options:
  Talla:
    - name: "Pequeño"
      priceUSD: 19.99
    - name: "Mediano"
      priceUSD: 24.99
    - name: "Grande"
      priceUSD: 29.99
  Color:
    - name: "Negro medianoche"
      image: "mi-producto-negro.webp"
    - name: "Blanco perla"
      image: "mi-producto-blanco.webp"

# ── ATRIBUTOS / ESPECIFICACIONES ──────────────────────────

# Pares clave-valor que se muestran como ficha técnica en el modal del producto.
# Úsalo para detalles técnicos, materiales, dimensiones, etc.
attributes:
  Material: "Aluminio cepillado premium"
  Peso: "540 g"
  Dimensiones: "25 × 15 × 5 cm"
  Garantía: "2 años limitada"

# ── CUERPO (Markdown) ──
# Todo lo que está debajo del segundo `---` es la descripción del producto.
# Se renderiza como HTML dentro del modal del producto, debajo de la descripción
# corta. Usa sintaxis Markdown para un formato enriquecido.
#
# CONSEJOS:
#   - Usa `- **Negritas**` para listas clave-valor
#   - Mantén párrafos cortos para que se lea bien en móvil
#   - Agrega saltos de línea entre secciones para un Markdown limpio
---
Escribe aquí la descripción completa de tu producto. Puedes usar **negritas**, *itálicas* y otros formatos Markdown.

- **Característica 1:** Explica el primer beneficio clave.
- **Característica 2:** Explica el segundo beneficio clave.
- **Característica 3:** Explica el tercer beneficio clave.

Aquí van los párrafos adicionales, instrucciones de uso o consejos de cuidado.