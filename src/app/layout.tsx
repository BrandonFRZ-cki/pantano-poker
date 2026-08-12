import type { Metadata, Viewport } from "next";
import { Inter, Archivo_Black } from "next/font/google";
import "./globals.css";

const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

// Aktiv Grotesk (usada en el logo) es de pago; Archivo Black es la alternativa
// gratuita más cercana en peso/carácter para titulares.
const displayFont = Archivo_Black({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pantano Poker",
  description: "App de gestión del torneo familiar Pantano Poker",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/logo.svg",
    apple: "/icons/logo.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#255e2e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${bodyFont.variable} ${displayFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-pp-cream text-pp-brown">
        {children}
      </body>
    </html>
  );
}
