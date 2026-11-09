import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Cooling — Monitoreo y Control Térmico IoT",
  description:
    "Sistema de enfriamiento autónomo inteligente para equipos electrónicos con predicción lineal y simulación de 5 zonas.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
