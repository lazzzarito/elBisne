import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import BottomNav from "@/components/navigation/BottomNav";
import ToastNotification from "@/components/ToastNotification";
import Preloader from "@/components/Preloader";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://elbisne.vercel.app";

export const metadata = {
  metadataBase: new URL(baseUrl),
  title: "elBisne | Catálogo en línea con pedidos por WhatsApp",
  description: "elBisne — Catálogo en línea moderno y listo para usar. Explora productos, añade al carrito y pide directo por WhatsApp en tu idioma.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "elBisne",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/icons/icon-192x192.png",
  },
  openGraph: {
    locale: "es_CO",
    images: [{ url: "/images/logo.webp", width: 512, height: 512, alt: "elBisne" }],
  },
  alternates: { canonical: baseUrl },
};

export const viewport = {
  themeColor: "#00a884",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={inter.variable}>
      <link rel="preconnect" href="https://wa.me" />
      <body>
        <a href="#main-content" className="skip-to-content">Saltar al contenido</a>
        <AppProvider>
          <Preloader>{children}</Preloader>
          <BottomNav />
          <ToastNotification />
        </AppProvider>
      </body>
    </html>
  );
}