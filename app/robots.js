export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_BASE_URL || "https://elbisne.vercel.app"}/sitemap.xml`,
  };
}
