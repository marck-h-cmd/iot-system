import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Cooling — Monitoreo y Control Térmico IoT",
  description:
    "Telemetría física y simulada por MQTT, predicción térmica y control autónomo.",
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
