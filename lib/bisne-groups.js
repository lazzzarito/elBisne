// Agrupación por Bisne compartida entre el carrito y los favoritos, para que
// las dos pestañas del cajón ordenen y numeren los grupos igual.
//
// `bisneIndex` es el Map que devuelve loadBisneIndex(): bisneId -> { name,
// handle, ... }. Los bisnes conocidos se ordenan alfabéticamente por nombre y
// los productos sin bisne se van al final, que es como se comporta el carrito.

export function groupByBisne(items, bisneIndex) {
  const groups = new Map();

  for (const item of items || []) {
    const bisneId = item.bisneId || null;
    if (!groups.has(bisneId)) {
      const info = (bisneId && bisneIndex?.get(bisneId)) || null;
      groups.set(bisneId, {
        bisneId,
        name: info?.name || null,
        handle: info?.handle || null,
        items: [],
      });
    }
    groups.get(bisneId).items.push(item);
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.bisneId === b.bisneId) return 0;
    if (!a.bisneId) return 1;
    if (!b.bisneId) return -1;
    return (a.name || "").localeCompare(b.name || "");
  });
}

// El carrito muestra la suma de dinero del grupo; los favoritos el número de
// productos. Una suma en favoritos se leería como un total a pagar.
export function groupTotalLabel(group, money) {
  if (money) {
    const total = group.items.reduce((acc, item) => acc + item.priceUSD * (item.quantity || 1), 0);
    return `$${total.toFixed(2)}`;
  }
  const n = group.items.length;
  return `${n} ${n === 1 ? "producto" : "productos"}`;
}
