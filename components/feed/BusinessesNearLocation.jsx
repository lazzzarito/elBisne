"use client";

import { useEffect, useMemo, useState } from "react";
import BusinessCard from "@/components/feed/BusinessCard";
import { parseEmbedCoords, haversineKm } from "@/lib/geo";

// "Bisnes cerca de ti" (UI_UX.md §4.6): carrusel de bisnes ordenado por
// proximidad real al usuario cuando este da permiso de geolocalización.
//  · con permiso: se parsean las coords del embed de Google de cada bisne
//    y se ordena por distancia (haversine); sin coords → al final.
//  · sin permiso / sin soporte: orden por rating (igual que antes del mapa).
export default function BusinessesNearLocation({ bisnes }) {
  const [userPos, setUserPos] = useState(null); // { lat, lng } | null
  const [geoResolved, setGeoResolved] = useState(false);

  useEffect(() => {
    let active = true;
    const resolve = () => { if (active) setGeoResolved(true); };
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      Promise.resolve().then(resolve);
      return () => { active = false; };
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!active) return;
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoResolved(true);
      },
      () => {
        if (active) setGeoResolved(true);
      },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 300000 }
    );
    return () => { active = false; };
  }, []);

  const sorted = useMemo(() => {
    const list = [...(bisnes || [])];
    if (userPos) {
      // Con ubicación: distancia real primero; sin coords → al final.
      const withDist = list.map((b) => {
        const c = parseEmbedCoords(b.mapEmbedUrl);
        return { b, dist: c ? haversineKm(userPos, c) : Infinity };
      });
      return withDist
        .sort((x, y) => x.dist - y.dist)
        .map(({ b }) => b);
    }
    // Fallback: orden por recomendación (mismo criterio que "Bisnes para ti").
    return list.sort((a, b) => {
      const ra = a.rating ?? -1;
      const rb = b.rating ?? -1;
      return rb - ra || String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });
  }, [bisnes, userPos]);

  if (!sorted.length) return null;

  // Lo capamos por rendimiento: el carrusel se desplaza, no pinta todo.
  const shown = sorted.slice(0, 24);

  // El subtítulo cuenta la historia real según lo que sepamos del usuario:
  // mientras se decide la ubicación no prometemos proximidad, y si el usuario
  // la niega decimos por qué estamos viendo otras tiendas.
  let subtitle = "Ordenadas por lo cerca que están de ti";
  if (!geoResolved) subtitle = "Calculando qué tiendas tienes más cerca";
  else if (!userPos) subtitle = "No compartiste tu ubicación: mostramos las más valoradas";

  return (
    <section className="businesses-carousel-section" aria-label="Bisnes cerca de ti">
      <h2 className="featured-title">Bisnes cerca de ti</h2>
      <p className="section-subtitle">{subtitle}</p>
      <div className="businesses-carousel">
        {shown.map((bisne) => (
          <BusinessCard key={bisne.id} bisne={bisne} followable />
        ))}
      </div>
    </section>
  );
}