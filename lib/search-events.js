// ── Bus de la búsqueda global en la home ───────────────────────────────────
// El buscador global de la home no abre un modal: transforma la propia página
// (mismo truco que la compra directa dentro de ProductModal). El TopNav vive
// en app/layout.jsx y la home en app/page.js, así que no hay relación de
// props entre ambos: se hablan por eventos de window, igual que el resto del
// chrome global (open-cart, open-legal-modal, cart-footer-visibility...).
//
// El drawer SearchModal sigue existiendo para el resto de rutas y escucha
// "open-search". Estos tres son exclusivos de la home.

/** Abrir la vista de búsqueda de la home (opcionalmente con consulta puesta). */
export const HOME_SEARCH_OPEN = "home-search-open";

/** Sincronizar el texto de la consulta en ambos campos. */
export const HOME_SEARCH_QUERY = "home-search-query";

/** Volver al feed, cerrando la vista de búsqueda. */
export const HOME_SEARCH_CLOSE = "home-search-close";
