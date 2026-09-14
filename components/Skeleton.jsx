"use client";

export default function Skeleton({ width, height = "100%", borderRadius = "var(--radius-sm)", className = "", style }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius, ...style }}
      aria-hidden="true"
    />
  );
}
