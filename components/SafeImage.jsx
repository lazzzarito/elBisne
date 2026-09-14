"use client";

import { useState } from "react";
import Image from "next/image";

export default function SafeImage({ src, fallback = "/images/placeholder.svg", alt, className, width, height, style, priority, sizes, fill }) {
  const [imgSrc, setImgSrc] = useState(src);
  const [errored, setErrored] = useState(false);

  if (fill) {
    return (
      <Image
        src={imgSrc}
        alt={alt}
        className={className}
        fill
        sizes={sizes}
        priority={priority}
        style={{ objectFit: "cover", ...style }}
        onError={() => {
          if (!errored) {
            setImgSrc(fallback);
            setErrored(true);
          }
        }}
      />
    );
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      className={className}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      style={style}
      onError={() => {
        if (!errored) {
          setImgSrc(fallback);
          setErrored(true);
        }
      }}
    />
  );
}
