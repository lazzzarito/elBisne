"use client";

import { useEffect, useState } from "react";
import { getBisneInfo } from "@/lib/orders";

// Devuelve { name, handle, logoUrl, verified, ... } del bisne dado,
// o null mientras carga / si el producto no tiene bisne.
export function useBisneInfo(bisneId) {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!bisneId) return;
    let active = true;
    getBisneInfo(bisneId).then((data) => {
      if (active) setInfo(data);
    });
    return () => {
      active = false;
    };
  }, [bisneId]);

  // El producto sin bisne no tiene info: se deriva en render
  return bisneId ? info : null;
}
