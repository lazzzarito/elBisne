# elBisne — Catálogo Online y Marketplace Social

El objetivo de `elBisne` es simplificar el comercio electrónico usando la familiaridad y fluidez de las redes sociales: navegación rápida, compartir fácil y descubrimiento visual.

Despliegue inicial: Vercel. Repositorio en GitHub y demo pública en https://elbisne.vercel.app

## Características principales

- Diseño minimalista e intuitivo inspirado en Pinterest/Instagram con efectos tipo "liquid glass" y animaciones suaves. Priorizar rendimiento y accesibilidad.
- Backend ligero con sincronización en tiempo real: recomendación principal — Supabase (Postgres, autenticación, storage, realtime). Alternativa — Firebase (Realtime DB / Firestore) para equipos ya familiarizados.
- Flujo de pedidos basado inicialmente en mensajes a WhatsApp (link directo o mensaje preformateado).
- Perfiles de negocio llamados “Bisnes”: páginas públicas tipo catálogo con contacto directo, ubicación, horario, productos y estadísticas básicas.

### Opciones recomendadas

- Base de datos: **Supabase** (SQL, roles, backups) — facilita consultas complejas y escalado. Usar Firebase sólo si se requiere integración profunda con productos Google.
- Mensajería de pedidos: comenzar con enlaces `https://wa.me/` para MVP.
- Hosting / CI: Vercel para frontend; integrar GitHub Actions para pruebas y despliegues automáticos.

### Opciones a evitar

- Depender exclusivamente de mensajes sin confirmación (no es escalable para múltiples pedidos simultáneos).
- Usar solo imágenes sin metadatos en los productos (SEO y accesibilidad sufrirán). Siempre incluir título, precio, descripción corta y etiquetas.

---

### Diseños generales

1. Modal bottom-sheet: todos los detalles (producto, contacto, mapa) se abren en un modal que se desliza desde abajo, ancho completo y altura dinámica. El fondo se difumina y se aplica una capa accesible para cerrar con Esc o toque fuera.
2. Barra de navegación inferior flotante con efecto glass; íconos: Inicio, Explorar, Mi Perfil. Indicador de pestaña activa con microanimación.
3. Soporte táctil: swipes para cerrar modales y deslizar galerías. Toda interacción debe funcionar con teclado y lectores de pantalla.

---

### Pantalla de bienvenida / Auth

1. Autenticación simple: correo/contraseña y Google Sign-In.
2. Al registrarse, elegir tipo de cuenta: **Usuario** o **Catálogo (Bisne)**.

Comportamiento por tipo:
- Usuario: perfil privado por defecto; feed personal de productos guardados/megusta; interacción social (seguir, comentar, guardar).
- Catálogo (Bisne): perfil público con página de catálogo, contacto (WhatsApp), mapa, productos y panel de administración.

Formulario de creación de perfil (Catálogo):

- Datos personales / del negocio: `Nombre de usuario (@)`, `Nombre del catálogo/negocio`, `Teléfono (WhatsApp)`.
- Detalles: `Descripción`, `Dirección`, `Horario`, `Categoría` (predefinidas), `Domicilio/Recogida`, `Redes sociales`.
- Ubicación: enlace a Google Maps + vista previa en mapa.
- Imágenes: foto de perfil y portada.

---

### Página de Inicio

1. Slider principal de banners (16:9) para promociones.
2. Sección "Bisnes cerca de ti": carrusel de perfiles según geolocalización (con permiso del usuario).
3. Productos recomendados: feed en Masonry grid (estilo Pinterest) que muestra imagen, título recortado, precio y CTA para abrir modal.
4. Categorías populares: carrusel horizontal con iconos.
5. Ofertas recientes: sección destacada con etiqueta de rebaja.
6. Banner final de contenido propio (promociones/guías).

UX: cargar imágenes de forma progresiva, placeholders y lazy-loading para rendimiento.

---

### Página de Explorar

1. Buscador global con sugerencias en tiempo real (autocompletar). Filtrado por: categoría, ubicación, precio, envío.
2. Tendencias y colecciones (curadas y generadas por actividad — hashtags, búsquedas).
3. Filtros avanzados y guardado de búsquedas.
4. Mapa interactivo opcional para ver Bisnes cercanos.

---

### Página de Mi Perfil

Para usuarios comunes:
- Feed personal con productos guardados y actividad.
- Ajustes de privacidad y notificaciones.

Para Bisnes (catálogo):
- Página pública de catálogo con productos, reviews y contacto.
- Panel de gestión: CRUD de productos, estadísticas básicas (vistas, clics, guardados), mensajes/pedidos (enlaces a WhatsApp o inbox integrado si se implementa).
- Opciones de verificación: badge para negocios verificados.

---

### Flujo de pedidos y comunicaciones

- MVP: mensaje preformateado a WhatsApp con plantilla que incluye producto, cantidad y enlace al perfil.
- Fase 2: carrito básico + checkout y confirmación por WhatsApp/Email.
- Fase 3: integración con WhatsApp Business API para mensajes estructurados, estados de pedido y plantillas.

---

### Privacidad y seguridad

- Cumplir con políticas de protección de datos (GDPR/legislación local según mercado objetivo).
- Validar y sanitizar todas las entradas en backend.
- Autenticación segura y opciones de 2FA para Bisnes.

---

### Observabilidad y crecimiento

- Analytics: Google Analytics / Plausible + eventos personalizados para producto/clicks/ventas.
- Tests: unitarios, E2E (Playwright) para flujos críticos.
- SEO: meta tags, Open Graph y card previews para compartir productos.

---

### Tareas siguientes (sugeridas)

1. Definir esquema inicial de la base de datos (productos, usuarios, bisnes, categorías, pedidos).
2. Bocetar pantallas claves (Inicio, Producto modal, Perfil Bisne, Explorar).
3. Implementar MVP técnico: frontend en Next.js + Supabase + despliegue en Vercel.
