# elBisne — Catálogo Online y Marketplace Social

El objetivo de `elBisne` es crear un marketplace social donde cualquier persona pueda vender desde su catálogo personal (un "Bisne") mientras los compradores descubren productos y negocios cercanos con la fluidez de una red social: navegación rápida, compartir fácil y descubrimiento visual.

Despliegue: Vercel. Repositorio en GitHub y demo pública en https://elbisne.vercel.app

---

## Stack técnico

| Capa              | Tecnología                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------- |
| Frontend          | Next.js 16 (App Router) + React 19                                                                            |
| Backend           | Supabase (Postgres, Auth, Storage, Realtime)                                                                  |
| Estilo            | CSS custom properties + glassmorphism + dark mode automático                                                 |
| Animaciones       | Framer Motion                                                                                                 |
| Pedidos MVP       | Deep-links a WhatsApp/Telegram/Email (`wa.me/`, `t.me/`, `mailto:`) con mensaje preformateado (sin SMS) |
| Despliegue        | Vercel (auto-detecta Next.js)                                                                                 |
| Base del template | Fork de[Whatalog](https://github.com/lazzzarito/Whatalog) — catálogo multi-canal                             |

---

## Base del proyecto: Whatalog-Template

elBisne parte del template Whatalog como base visual y de UX, adaptándolo a un marketplace multi-vendedor:

- Se **reutiliza** intacto: `MasonryGrid`, `Icon`, `SafeImage`, `Skeleton`, `ErrorBoundary`, `Preloader`, `ProductModal`, `QuickBuyModal`, `OfferModal`, `PromoModal`, `FavoritesModal`, `ChannelSplitButton`, `StoreInfoCard`, `CustomerInfoModal`, `LegalInfoModal`
- Se **adapta**: `FilterHeader` (header de tienda), `CatalogContainer` (orquestador), `Cart` (carrito global con checkout por Bisne), `ProductCard` (badge del Bisne)
- Se **hereda como librería**: `lib/popup-history.js`, `lib/scroll-lock.js`, `lib/use-focus-trap.js`, `lib/use-history-popup.js`, `lib/messaging.js`
- Se **reescribe**: `lib/products.js` (lectura desde Supabase en vez de MD/CSV), `content/store-config.json` (reemplazado por tabla `bisnes`)
- Se **crea de nuevo**: BottomNav, AuthProvider, tablas de feed/explorar/perfil, ThemeEditor, Panel del vendedor, admin de verificación

### Cómo se ve la tienda de un Bisne

Cada Bisne tiene su propia tienda pública (`/b/[handle]`) que se muestra **igual que el template original**: header de tienda con logo, categorías y búsqueda, botón de carrito **global** (flotante), promo grid, flash offers, masonry de productos, ficha con mapa y contacto. Solo se añade alrededor:

- **Barra de contexto del marketplace** arriba (breadcrumb: `elBisne › @handle`, enlace a Explorar)
- Solo el header propio de la tienda (sin TopNav/BottomNav del marketplace)
- **Botón Seguir** y contador de seguidores en la portada
- **Tema personalizado** del Bisne (CSS variables inyectadas solo en su página)
- **Pedidos registrados** en DB además de enviarse por WhatsApp

---

## Arquitectura general

```
┌────────────────────── 3 PESTAÑAS DEL MARKETPLACE ──────────────────────┐
│                                                                         │
│  [🏠 Inicio]          [🧭 Explorar]          [👤 Perfil]               │
│   /                     /explorar                /perfil                │
│   Feed social           Búsqueda global          Cuenta + tienda        │
│   + Bisnes cercanos     + Filtros + Tendencias   + Guardados            │
│   + Productos + Ofertas + Mapa de Bisnes         + Panel vendedor       │
│   + Categorías          + Colecciones            + Activar tienda       │
│                                                                         │
│  ──────────────────────── RUTAS COMPLEMENTARIAS ────────────────────── │
│  /b/[handle]          Tienda pública = template parametrizado          │
│  /producto/[id]       Detalle producto (SEO + JSON-LD)                │
│  /auth                Login / Registro                                 │
│  /panel               Panel del vendedor (CRUD, pedidos, apariencia)  │
│  /admin               Moderación de verificación (solo equipo)        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Modelo de datos (Supabase / Postgres)

### Tablas principales

```sql
-- Perfil de usuario (siempre existe, un usuario puede además tener una tienda)
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url  TEXT,
  bio         TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Tienda del Bisne (1:1 con profiles, solo si el usuario activa su tienda)
CREATE TABLE bisnes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  handle          TEXT UNIQUE NOT NULL,          -- @slug de la tienda
  business_name   TEXT NOT NULL,
  slogan          TEXT,
  logo_url        TEXT,
  cover_url       TEXT,
  phone_whatsapp  TEXT NOT NULL,
  description     TEXT,
  address         TEXT,
  hours           TEXT,
  category_id     UUID REFERENCES categories(id),
  delivery_mode   TEXT CHECK (delivery_mode IN ('pickup','delivery','both','none')) DEFAULT 'both',
  social_links    JSONB DEFAULT '{}',            -- {instagram, facebook, tiktok, ...}
  map_embed_url   TEXT,
  theme           JSONB DEFAULT '{}',            -- cssVariables, fontFamily, radiusScale
  layout          JSONB DEFAULT '{}',            -- masonryColumns, showOffers, showMap
  verified        BOOLEAN DEFAULT false,
  verification_requested BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Categorías globales del marketplace
CREATE TABLE categories (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name  TEXT UNIQUE NOT NULL,
  icon  TEXT,
  slug  TEXT UNIQUE NOT NULL
);

-- Productos (cada uno pertenece a un Bisne)
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE,                    -- id del .md original, usado en /product/[slug]
  bisne_id        UUID NOT NULL REFERENCES bisnes(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  price           NUMERIC(10,2) NOT NULL,
  original_price  NUMERIC(10,2),
  stock           INTEGER DEFAULT 0,              -- NULL = sin límite
  status          TEXT CHECK (status IN ('available','coming_soon','coming-soon','out_of_stock')) DEFAULT 'available',
  featured        BOOLEAN DEFAULT false,
  offer           BOOLEAN DEFAULT false,
  category_id     UUID REFERENCES categories(id),
  images          JSONB DEFAULT '[]',            -- URLs de Supabase Storage
  attributes      JSONB DEFAULT '{}',            -- {Material: "Acero", ...}
  options         JSONB DEFAULT '{}',            -- {Size: [{name, priceUSD, image}], ...}
  ratio           TEXT CHECK (ratio IN ('tall','square','wide')),
  content_html    TEXT,                          -- body Markdown renderizado
  seo_title       TEXT,
  seo_description TEXT,
  promo           TEXT,                          -- target de promoLinks
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Pedidos (checkout; un pedido por Bisne con su bisne_id; los items de otros Bisnes quedan en el carrito)
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bisne_id        UUID NOT NULL REFERENCES bisnes(id),
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT,
  items           JSONB NOT NULL,                -- [{productId, name, qty, price, options}]
  total           NUMERIC(10,2) NOT NULL,
  payment_method  TEXT,
  delivery_mode   TEXT,
  address         TEXT,
  status          TEXT DEFAULT 'pending',        -- pending/confirmed/shipped/delivered
  channel         TEXT,                          -- whatsapp/telegram/email
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Favoritos de productos (sincronizados por usuario)
CREATE TABLE favorites (
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

-- Seguimiento de Bisnes
CREATE TABLE follows (
  user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bisne_id UUID NOT NULL REFERENCES bisnes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, bisne_id)
);

-- Solicitudes de verificación
CREATE TABLE verification_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bisne_id     UUID NOT NULL REFERENCES bisnes(id) ON DELETE CASCADE,
  status       TEXT CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  submitted_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at  TIMESTAMPTZ
);
```

### Row Level Security (RLS)

- Catálogos y productos: lectura pública, escritura solo del dueño (`auth.uid() = bisne.owner_id`)
- Pedidos: insertable por cualquiera, lectura solo del dueño del Bisne
- Favoritos/Follows: CRUD propio (`auth.uid() = user_id`)
- Perfil: lectura pública, escritura solo propio
- Verificación: lectura propia + admin, escritura propia + admin
- Storage `product-images`: lectura pública (bucket público), escritura solo service_role

### Catálogo en Supabase (Fase 2b)

- 26 productos volcados desde `content/products/*.md` → tabla `products` (slug = id del MD, URLs `/product/[slug]` intactas)
- Imágenes locales `.webp` → Supabase Storage (bucket público `product-images`), el route `/api/images/products` se eliminó
- Asignación por categoría a 4 bisnes demo: `bazar-elbisne` (Ropa/Calzado/Deportes/Electrónica/General), `bosque-verde` (Hogar/Hogar y Cocina), `dorado-shop` (Joyería/Accesorios), `lux-beauty` (Perfumería/Cosméticos)
- `lib/products.js` reescrito: lee de `products` + `categories` con el server data-client (SSG/ISR sin cookies); `getStoreConfig()` sigue leyendo `content/store-config.json`
- `gray-matter`/`marked` pasaron a devDependencies (solo los usa `migrate-products.mjs`); se eliminó `xlsx` y los loaders legacy (Sheets/CSV/XLSX)

---

## Navegación y diseño

### TopNav (menú superior tipo template — glassmorphism)

Barra fija arriba (logo + Inicio · Explorar · Perfil). Visible en las páginas del marketplace (`/`, `/explorar`, `/perfil`); las rutas con header propio (`/tienda`, `/b/[handle]`, `/product/[id]`, `/auth`) no lo muestran:

```
   [logo elBisne]   [🏠 Inicio]   [🧭 Explorar]   [👤 Perfil]
     activo: pill con color accent
```

El botón flotante de carrito (`Cart.jsx` → `floating-cart-btn`) se mantiene en todas las páginas con catálogo.

### Design System

Heredado del template con recolores para identidad elBisne:

- CSS custom properties (`--bg-primary`, `--accent-green`, etc.) con dark mode automático (`prefers-color-scheme: dark`)
- Los Bisnes pueden personalizar sus propias variables vía `bisnes.theme`
- Fuentes: Inter (self-hosted via `next/font`) + stack de sistema
- Glassmorphism en headers, TopNav, drawers
- Modales tipo bottom-sheet con `framer-motion` + popup stack + focus trap

### Pantalla de bienvenida / Auth

- Login/registro: correo/contraseña + Google Sign-In
- Wizard de registro: nombre, username (`@`), email, contraseña, foto
- **Cuenta dual**: todos son usuarios; la tienda ("Bisne") es una entidad adicional que se activa desde `/perfil`
- "Activa tu tienda" → bottom-sheet pidiendo: nombre del negocio, handle, WhatsApp, categoría, portada → crea `bisnes` → redirige al panel

### Tienda pública del Bisne (`/b/[handle]`)

Es el template Whatalog parametrizado:

1. Barra de contexto del marketplace (breadcrumb + enlace a Explorar)
2. **Header de tienda**: logo del Bisne + categorías de sus productos + búsqueda + botón carrito + info tienda (igual que `FilterHeader`)
3. **Portada**: cover image + avatar + nombre + badge verificado + slogan + seguir + WhatsApp directo
4. **Promo grid**: banners del Bisne (si los configura)
5. **Flash Offers**: productos con descuento (si los tiene)
6. **Masonry de productos**: grid de 2-4 columnas con infinite scroll, ProductCard con badge del Bisne
7. **Ficha del Bisne**: `StoreInfoCard` — ubicación, horario, envíos, redes sociales, mapa de Google Maps embed
8. **Carrito flotante global**: muestra productos de todos los Bisnes con su logo; al confirmar envía solo los del Bisne elegido y registra en `orders`

### Tema personalizado por Bisne

Cada tienda puede personalizar:

| Elemento         | Control                                          |
| ---------------- | ------------------------------------------------ |
| Color accent     | Color picker →`theme.cssVariables.accent`     |
| Color de fondo   | Color picker →`theme.cssVariables.bg`         |
| Color de texto   | Color picker →`theme.cssVariables.text`       |
| Border radius    | Slider →`theme.radiusScale`                   |
| Fuente           | Selector →`theme.fontFamily`                  |
| Logo circular    | Upload a Supabase Storage →`bisnes.logo_url`  |
| Portada (cover)  | Upload a Supabase Storage →`bisnes.cover_url` |
| Slogan           | Texto libre →`bisnes.slogan`                  |
| Columnas masonry | Selector 2/3/4 →`layout.masonryColumns`       |
| Mostrar ofertas  | Toggle →`layout.showOffers`                   |
| Mostrar mapa     | Toggle →`layout.showMap`                      |

Las CSS variables se inyectan como `<style>` **solo en la página del Bisne** (`/b/[handle]`), no afectan al marketplace.

### Sistema de verificación

1. El vendedor solicita desde su panel
2. Se crea una fila en `verification_requests` con `status: 'pending'`
3. El equipo modera desde `/admin`
4. Al aprobar: `bisnes.verified = true`, se muestra badge ✓ en la tienda y en búsquedas

---

## Página de Inicio (`/`)

1. **Banner slider** (16:9) para promociones del marketplace
2. **Bisnes cerca de ti**: carrusel de perfiles según geolocalización (con permiso)
3. **Productos recomendados**: feed en Masonry grid (estilo Pinterest) — imagen, título recortado, precio, badge del Bisne, CTA → modal
4. **Categorías populares**: carrusel horizontal con iconos
5. **Ofertas recientes**: sección destacada con etiqueta de rebaja + "Ver todas" → OfferModal
6. UX: lazy-loading, placeholders, Skeleton loaders, infinite scroll

---

## Página de Explorar (`/explorar`)

1. **Buscador global** con autocompletado en tiempo real (Supabase full-text search)
2. **Filtros**: categoría, ubicación (radio km), precio, modo de envío
3. **Tendencias y colecciones**: curadas y generadas por actividad
4. **Mapa interactivo** para ver Bisnes cercanos (Google Maps embed o alternativa)
5. Guardado de búsquedas frecuentes

---

## Página de Mi Perfil (`/perfil`)

### Como usuario:

- Feed personal con productos guardados (`favorites`) y actividad
- Ajustes de privacidad y notificaciones
- Botón **"Activa tu tienda"** (si aún no tiene Bisne)

### Como Bisne (tiene tienda activa):

- Resumen rápido de su tienda (vistas, pedidos, productos)
- Enlace directo a `/panel` y a su tienda pública `/b/[handle]`

---

## Panel del vendedor (`/panel`)

Protegido, solo el dueño del Bisne accede.

| Sección                | Contenido                                                                                                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Productos**     | CRUD completo: crear, editar, borrar, reordenar (drag & drop).`OptionEditor` para variantes (talla/color/precio), `AttributeEditor` para atributos (material/peso/garantía).  |
| **Pedidos**       | Lista de pedidos recibidos, buscar/filtrar, cambiar estado (`pending → confirmed → shipped → delivered`). Items, total, método de pago, canal.                               |
| **Estadísticas** | Total productos, total pedidos, ingresos totales, low stock alerts, top productos vendidos                                                                                         |
| **Apariencia**    | ThemeEditor: color pickers (accent/fondo/texto/radio) + fuente + logo/portada/slogan upload + disposición del catálogo (columnas, ofertas on/off, mapa on/off). Preview en vivo. |
| **Verificación** | Estado de solicitud, botón "Solicitar verificación" →`verification_requests`                                                                                                  |

---

## Carrito y flujo de pedidos

### Carrito global con agrupación por Bisne

- El carrito es **único y global**: no se resetea al cambiar de tienda
- Cada item muestra el **logo/favicon del Bisne** del que se añadió
- Persiste en `localStorage` (y se sincroniza con la cuenta si hay sesión iniciada)
- Al añadir productos de varias tiendas, todos permanecen visibles agrupados por Bisne, cada grupo con su subtotal

### Checkout en secuencia (un Bisne a la vez)

1. **"Finalizar compra"**:
   - Si el carrito tiene **un solo Bisne** → pasa directo al checkout
   - Si tiene **varios Bisnes** → bottom-sheet selector: cada Bisne con su logo, nº de productos y subtotal. El usuario elige a cuál le hace el pedido.
2. **Checkout del Bisne elegido**: nombre, teléfono, pickup/delivery, dirección, método de pago (7 opciones) — formulario heredado del template, solo con los productos de *ese* Bisne
3. **Confirmación**: `buildOrderMessage()` genera el mensaje formateado → `getChannelUrl()` abre **WhatsApp, Telegram o Email** (sin SMS) al vendedor elegido
4. **Al abrir el canal, el carrito se actualiza de inmediato** (sin esperar a que el usuario "regrese" de WhatsApp): los items del Bisne confirmado se eliminan; los del resto de Bisnes permanecen. El usuario puede repetir el flujo con la siguiente tienda.
5. **Persistencia**: cada confirmación guarda **un pedido por Bisne** en `orders` (`bisne_id`) → el vendedor lo ve en su panel
6. **Stock**: se decrementa en tiempo real (`products.stock`) al confirmar el pedido

### Compra directa (QuickBuy)

- **No se ve afectada por el carrito**: compra inmediata de 1 producto desde la tienda del Bisne → mensaje formateado directo al WhatsApp/Telegram/Email del vendedor
- También se registra en `orders` y decrementa stock

---

## Privacidad y seguridad

- RLS en todas las tablas de Supabase
- Autenticación: Supabase Auth (email + Google)
- JWT para sesiones, cookies HttpOnly
- Validación y sanitización de todas las entradas
- Imágenes en Supabase Storage con políticas de acceso
- GDPR: datos mínimos, eliminación bajo solicitud

---

## SEO y rendimiento

- SSG + ISR (`revalidate: 60`) para páginas de Bisnes y productos
- `generateMetadata` dinámica por Bisne y producto (OG images, Twitter cards)
- JSON-LD estructurado (`schema.org/Product` + `schema.org/LocalBusiness`)
- Sitemap dinámico: todas las páginas de Bisnes y productos
- Self-hosted Inter font (sin FOUT)
- Lazy loading de imágenes, `content-visibility`, infinite scroll

---

## PWA

Heredada del template:

- `public/manifest.json` (nombre, iconos, theme color, display standalone)
- `public/sw.js` v3 (cache-first para navegación, network-first para API)
- Icons 192×192 y 512×512
- Splash screen personalizado

---

## Mejoras y características recomendadas (post-MVP)

### Prioridad alta (adoptar pronto)

- **Reseñas y valoraciones**: tabla `reviews` (usuario, bisne/producto, puntuación 1–5, comentario) solo sobre pedidos confirmados. Promedio visible en la portada del Bisne y en el feed. RLS: cualquier usuario puede escribir, dueño y moderadores moderan.
- **Notificaciones en la app**: centro de notificaciones con Supabase Realtime + badgetes (nuevo pedido, nuevo seguidor, producto guardado). Fase posterior: Web Push.
- **Códigos de descuento por Bisne**: `coupons` (código, % o monto, vigencia, límite de usos). El vendedor los crea en su panel y se aplican en el checkout.
- **Estados de pedido visibles para el comprador**: URL pública de seguimiento (`/pedido/[id]`) con estado live (pendiente → confirmado → enviado → entregado) vía Realtime.
- **Chat comprador ↔ vendedor** (in-app, Mensajes): complementa a WhatsApp para quien no quiera salir de la app. Tabla `messages` + Realtime.

### Crecimiento del marketplace

- **Compartir con tarjeta de preview**: botón compartir en producto y Bisne (Web Share API) hacia WhatsApp status, IG Stories, redes.
- **Recomendaciones inteligentes**: "Bisnes que sigues" y "Porque guardaste X" (primera versión simple sobre `favorites`).
- **Búsqueda por imagen / IA descriptiva** (opcional avanzado): subir foto → productos similares.
- **i18n real multi-idioma** (es/en) y **multi-divisa/multi-país** (moneda configurable por Bisne).
- **Exportar catálogo a CSV/XLSX** en el panel del vendedor (reutilizar la lógica del generador del template).

### Moderación y confianza

- **Reportes de Bisnes/productos**: tabla `reports` + moderación en `/admin` (suspender, ocultar, advertir).
- **Sistema de hashtags/categorías populares** derivados de búsquedas para alimentar "Tendencias".

### Modelo de ingresos (más adelante)

- **Bisnes destacados**: slot patrocinado en el feed/explorar (con badge "Patrocinado").
- **Suscripción Premium para vendedores**: estadísticas avanzadas, más columnas de layout, prioridad en search.
- **Comisión opcional transparente** por pedido (el equivalente de lo que hoy se paga por WhatsApp Business API).

---

## Fases de implementación

| Fase                                 | Alcance                                                                                                                                                                                                                                                                                                                                                                                                                                  | Resultado                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **0 · Base**                  | Copiar template a raíz, instalar deps, env de Supabase, identidad elBisne, textos en español                                                                                                                                                                                                                                                                                                                                           | `npm run dev` funciona                                           |
| **1 · Shell**                 | BottomNav 3 tabs, AppContext (auth/carrito/favoritos), popup-history heredado, i18n español de componentes                                                                                                                                                                                                                                                                                                                              | Navegas entre 3 pestañas, modales en español                     |
| **2 · Supabase**              | Migraciones SQL (schema + RLS:`bisnes`, `products`, `orders`, `favorites`, `reviews`, `coupons`, `notifications`), clientes, seed (categorías, bisnes demo), auth email+Google. **2b · Catálogo**: volcado de los 26 productos MD → `products` + Storage (`product-images`), `lib/products.js` lee de Supabase, borrado de `content/products/`                                                           | Usuarios se registran, datos seed visibles, catálogo en DB        |
| **3 · Home**                  | BannerSlider, BisnesNearby, RecommendationsFeed, CategoriesCarousel, OffersSection · ✅**3 · Home (base):** feed en `/` con los 5 componentes, datos desde Supabase (`categories` + `bisnes` + rating de `reviews`), banners desde `store-config.json`, carruseles, modales reutilizados (ProductModal/Cart/Promo/Offer/QuickBuy), infinite scroll en RecommendationsFeed, categorías enlazan a `/tienda?category=` | Feed completo con infinite scroll                                  |
| **4 · Explorar** | GlobalSearch autocomplete (productos+bisnes, tiempo real), búsquedas frecuentes (localStorage), filtros (categoría, precio máx, ofertas, orden), tendencias (soldMap) + colecciones (promoLinks), mapa (embed) + lista de Bisnes · ✅ **4 · Explorar (base):** `/explorar` con todo lo anterior; búsqueda local en cliente sobre catálogo cargado | Búsquedas funcionales en cliente (26 productos) |
| **5 · Tienda**                | `/b/[handle]` = CatalogContainer parametrizado + tema + Seguir + favoritos síncronos + chip de calificación promedio (reviews) · ✅ **5 · Tienda (base):** `/b/[handle]` SSG (4 bisnes) con hero de tienda (cover/logo/nombre/verificado/slogan/rating+meta), tema por bisne (`theme.accent` + `radiusScale` → CSS vars), `CatalogContainer` reutilizado con productos y `storeConfig` del bisne, FollowButton (insert/delete en `follows`), chip de rating promedio (reviews) | Cada Bisne tiene su tienda personalizada |
| **6 · Pedidos**               | Carrito global + checkout secuencial por Bisne (selector multi-tienda),`orders` en DB + stock real                                                                                                                                                                                                                                                                                                                                     | Carrito agrupado con logos; checkout registra y confirma por Bisne |
| **7 · Panel**                 | CRUD productos, pedidos, estadísticas, ThemeEditor, solicitud verificación                                                                                                                                                                                                                                                                                                                                                             | Vendedor gestiona su tienda                                        |
| **8 · Confianza**             | Reseñas 1-5⭐ + comentario (solo pedidos confirmados, RLS), cupones por Bisne, tracking público`/pedido/[id]`                                                                                                                                                                                                                                                                                                                        | Compradores dejan reseñas y siguen sus pedidos                    |
| **9 · Notificaciones + Chat** | Centro de notificaciones (nuevo pedido, seguidor) con Realtime + badge, chat comprador↔vendedor in-app (`messages`)                                                                                                                                                                                                                                                                                                                   | Vendedor y comprador se comunican dentro de la app                 |
| **10 · Admin + Moderación**  | `/admin` moderación verificación + reportes/suspensiones, PWA/SEO/sitemap extendido, despliegue Vercel                                                                                                                                                                                                                                                                                                                               | MVP completo en producción                                        |

---

## Estructura de archivos

```
elBisne/
├── app/
│   ├── layout.js                   RootLayout (es, theme, TopNav, AuthProvider)
│   ├── globals.css                 Design system elBisne (CSS variables + dark mode)
│   ├── page.js                     TAB 1: Inicio/Feed (HomeFeed + feed components)
│   ├── explorar/                   TAB 2: Explorar
│   │   ├── page.js                 ✅ Server: carga products/categories/bisnes/storeConfig
│   │   ├── ExplorarPage.jsx        ✅ Orquestador (búsqueda + filtros + modales)
│   │   ├── GlobalSearch.jsx        ✅ Autocomplete + búsquedas frecuentes
│   │   ├── ExploreFilters.jsx      ✅ Categoría, precio máx, ofertas, orden
│   │   ├── TrendsSection.jsx       ✅ Tendencias (soldMap) + colecciones (promoLinks)
│   │   └── MapSection.jsx          ✅ Mapa embed + lista de Bisnes
│   ├── perfil/page.js              TAB 3: Mi Perfil
│   ├── auth/page.js                Login / Registro
│   ├── b/[handle]/page.js          Tienda pública del Bisne (SEO + tema) ✅ Fase 5 (SSG + hero + CatalogContainer)
│   ├── b/[handle]/StorePageClient.jsx  ✅ Hero, tema por bisne (CSS vars) y FollowButton
│   ├── panel/                      Panel del vendedor
│   │   ├── page.js                 Dashboard
│   │   ├── productos/page.js       CRUD productos
│   │   ├── productos/nuevo/page.js Crear producto
│   │   ├── productos/[id]/page.js  Editar producto
│   │   ├── pedidos/page.js         Gestión de pedidos
│   │   ├── apariencia/page.js      ThemeEditor
│   │   └── verificacion/page.js    Solicitar verificación
│   ├── producto/[id]/page.js       Detalle producto (SSG + JSON-LD)
│   ├── pedido/[id]/page.js         Tracking público del pedido (Fase 8)
│   ├── notificaciones/page.js      Centro de notificaciones (Fase 9)
│   ├── mensajes/page.js            Chat comprador↔vendedor (Fase 9)
│   ├── admin/page.js               Moderación de verificación + reportes
│   ├── error.js
│   ├── sitemap.js
│   └── robots.js
├── components/
│   ├── navigation/
│   │   ├── TopNav.jsx              Menú superior (logo + Inicio/Explorar/Perfil)
│   ├── feed/
│   │   ├── BannerSlider.jsx
│   │   ├── BusinessesNearby.jsx
│   │   ├── RecommendationsFeed.jsx
│   │   ├── CategoriesCarousel.jsx
│   │   └── OffersSection.jsx
│   ├── feed/
│   │   ├── BannerSlider.jsx        Carousel de banners (store-config promoBanners/promoLinks)
│   │   ├── BusinessesNearby.jsx    Tarjetas de bisnes (rating + nº productos)
│   │   ├── RecommendationsFeed.jsx Grid productos con infinite scroll (24 en 24)
│   │   ├── CategoriesCarousel.jsx  Chips de categorías → /tienda?category=
│   │   └── OffersSection.jsx       Ofertas Flash (grid + Ver todas → OfferModal)
│   ├── explore/
│   │   ├── GlobalSearch.jsx
│   │   ├── FiltersPanel.jsx
│   │   ├── TrendingTags.jsx
│   │   └── BusinessMap.jsx
│   ├── profile/
│   │   ├── UserProfile.jsx
│   │   ├── BusinessProfileCard.jsx
│   │   └── ActivateStoreWizard.jsx
│   ├── panel/
│   │   ├── PanelLayout.jsx
│   │   ├── ProductManager.jsx
│   │   ├── OrdersTable.jsx
│   │   ├── CouponsManager.jsx        Fase 8: crear/editar cupones
│   │   ├── ThemeEditor.jsx
│   │   └── VerificationCard.jsx
│   ├── auth/
│   │   ├── LoginForm.jsx
│   │   └── SignupWizard.jsx
│   ├── trust/
│   │   ├── ReviewForm.jsx             Fase 8: escribir reseña (pedido confirmado)
│   │   ├── ReviewList.jsx             Fase 8: listado + promedio
│   │   └── CouponInput.jsx            Fase 8: aplicar cupón en checkout
│   ├── notifications/
│   │   └── NotificationsPanel.jsx     Fase 9: centro + badge Realtime
│   ├── chat/
│   │   └── ChatBox.jsx                Fase 9: hilo comprador↔vendedor
│   ├── ProductCard.jsx             ADAPTAR (badge Bisne + textos ES)
│   ├── ProductModal.jsx            ADAPTAR (link al Bisne)
│   ├── QuickBuyModal.jsx           ADAPTAR (WhatsApp del vendedor)
│   ├── Cart.jsx                    ADAPTAR (carrito global agrupado por Bisne + selector de tienda en checkout)
│   ├── StoreInfoCard.jsx           REUTILIZAR (ficha del Bisne)
│   ├── MasonryGrid.jsx             REUTILIZAR
│   ├── Icon.jsx                    REUTILIZAR (agregar iconos tabs)
│   ├── FilterHeader.jsx            REUTILIZAR (header de tienda)
│   ├── SafeImage.jsx               REUTILIZAR
│   ├── Skeleton.jsx                REUTILIZAR
│   ├── ErrorBoundary.jsx           REUTILIZAR
│   ├── Preloader.jsx               REUTILIZAR
│   ├── ChannelSplitButton.jsx      REUTILIZAR
│   ├── CustomerInfoModal.jsx       REUTILIZAR
│   ├── LegalInfoModal.jsx          REUTILIZAR
│   ├── FavoritesModal.jsx          REUTILIZAR (favoritos síncronos)
│   └── ConfirmDialog.jsx           NUEVO
├── context/
│   └── AppContext.jsx              Auth + carrito + favoritos + toasts
├── lib/
│   ├── supabase/
│   │   ├── client.js               Browser client
│   │   ├── server.js               Server client (cookies)
│   │   └── data.js                 Cliente de lectura pública (SSG/ISR, sin cookies)
│   ├── products.js                 REESCRITO (lectura desde Supabase: products + categories)
│   ├── feed.js                     NUEVO (categorías + bisnes con rating/productos para el Home)
│   ├── messaging.js                REUTILIZAR (número del vendedor)
│   ├── popup-history.js            REUTILIZAR
│   ├── scroll-lock.js              REUTILIZAR
│   ├── use-focus-trap.js           REUTILIZAR
│   ├── use-history-popup.js        REUTILIZAR
│   └── i18n.js                     NUEVO (diccionario español)
├── scripts/
│   ├── seed.mjs                   Usuarios/bisnes demo (idempotente, Admin API + REST)
│   └── migrate-products.mjs       Volcado 1:1 de MD → products + Storage (Fase 2b)
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql  Esquema completo + RLS + categorías
│       └── 002_catalog.sql         Catálogo: slug, content_html, seo, promo, status coming-soon
├── public/
│   ├── manifest.json               PWA
│   ├── sw.js                       Service worker
│   └── icons/                      PWA icons
├── .env.local                      Supabase keys
├── package.json                    elbisne
├── next.config.mjs
└── vercel.json                     (NO necesario — Vercel auto-detecta)
```

---

## Tareas siguientes (orden de ejecución)

1. ✅ Fase 0, 1 y 2 completadas (base, shell, Supabase, auth email). Faltan para cerrar Fase 2: Google Sign-In (dashboard + OAuth Client) y rotación del PAT/secret expuestos en chat
2. ✅ Fase 2b: catálogo en Supabase (26 productos, Storage `product-images`, `lib/products.js` desde DB)
3. ✅ Fase 3 (base): feed `/` con BannerSlider + CategoriesCarousel + BisnesNearby + OffersSection + RecommendationsFeed (infinite scroll), datos de Supabase (`lib/feed.js`), banners de `store-config.json`, categorías → `/tienda?category=`, modales reutilizados. Pendiente fino: contadores de bisnes, seguir bisnes desde feed
4. ✅ Fase 4 (base): `/explorar` con GlobalSearch (autocomplete productos+bisnes + búsquedas frecuentes en localStorage), filtros (categoría, precio máx, ofertas, orden), tendencias (soldMap) + colecciones (promoLinks), mapa embed + lista de Bisnes. Pendiente fino: full-text server-side (pg_trgm ya habilitado), radio km (requiere lat/lng en `bisnes`)
5. ✅ Fase 5 (base): `/b/[handle]` SSG (4 bisnes) con hero de tienda, tema por bisne (accent/radiusScale → CSS vars en `<style>` scoped), CatalogContainer reutilizado (productos + storeConfig del bisne), FollowButton (insert/delete `follows`), chip de rating promedio (reviews). Pendiente fino: StoreInfoCard (mapa/redes/horario) en la portada, layout.masonryColumns aplicado al grid, showOffers/showMap por bisne, carrito global multi-bisne (Fase 6)
