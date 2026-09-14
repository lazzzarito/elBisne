"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function Preloader({ children }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setLoaded(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  return (
    <>
      {!loaded && (
        <div className="preloader-overlay">
          <div className="preloader-ring">
            <div className="preloader-logo-wrapper">
              <Image
                src="/images/logo.webp"
                alt="Logo"
                width={56}
                height={56}
                className="preloader-logo"
                priority
              />
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
