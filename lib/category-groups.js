// Jerarquía de categorías: los grupos son TÍTULOS que solo organizan; los
// productos viven siempre en una hoja. Un grupo no es asignable, así que aquí
// se filtra por construcción: si algún día alguien inserta una fila de título
// en `categories` (name === group_name), se renderiza como encabezado y nunca
// como opción seleccionable.
//
// Los grupos no son filas de `categories`: son el texto `group_name` de las
// 68 hojas. Por eso "Vehículos" no se puede asignar, no porque esté excluido
// en algún sitio, sino porque no existe como categoría.

export const FALLBACK_GROUP = "General";

// Orden de los títulos tal como los declara el catálogo. Las hojas se
// agrupan con este orden y no con el que devuelva la consulta, para que el
// panel y el asistente de tienda muestren la misma jerarquía.
export const CATEGORY_GROUP_ORDER = [
  "Vehículos",
  "Inmobiliaria",
  "Tecnología",
  "Empleos",
  "Ropa y Accesorios",
  "Servicios",
  "Electrodomésticos",
  "Hogar",
  "Familia",
  "General",
];

export function groupOf(category) {
  return category.group_name || FALLBACK_GROUP;
}

// Un título es una categoría cuyo nombre coincide con su propio grupo.
export function isCategoryTitle(category) {
  return category.name === groupOf(category);
}

// Devuelve [[nombreGrupo, hojas], ...] listo para renderizar. Las hojas
// conservan el orden recibido (la consulta las pide por group_name, name).
export function groupCategories(categories) {
  const groups = new Map();

  for (const category of categories || []) {
    if (isCategoryTitle(category)) continue;
    const group = groupOf(category);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(category);
  }

  const ordered = [];
  for (const group of CATEGORY_GROUP_ORDER) {
    if (groups.has(group)) ordered.push([group, groups.get(group)]);
    groups.delete(group);
  }
  // Grupos que no estén en el catálogo conocido van al final, no se pierden.
  for (const [group, items] of groups) ordered.push([group, items]);

  return ordered;
}
