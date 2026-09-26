// Geo helpers: coordenadas de bisnes y distancia (sección "Bisnes cerca de ti")

// Extrae lat/lng de una URL de embed de Google Maps ("!3d<lat>!2d<lng>").
export function parseEmbedCoords(embedUrl) {
  if (!embedUrl || typeof embedUrl !== "string") return null;
  const lat = embedUrl.match(/!3d(-?\d+(?:\.\d+)?)/);
  const lng = embedUrl.match(/!2d(-?\d+(?:\.\d+)?)/);
  if (!lat || !lng) return null;
  const la = parseFloat(lat[1]);
  const lo = parseFloat(lng[1]);
  if (Number.isNaN(la) || Number.isNaN(lo)) return null;
  return { lat: la, lng: lo };
}

// Distancia en kilómetros entre dos puntos (fórmula del haversine).
export function haversineKm(a, b) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}