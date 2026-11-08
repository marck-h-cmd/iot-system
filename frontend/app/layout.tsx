import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema de Enfriamiento Autónomo IoT | Laboratorio UNT",
  description: "Monitoreo y control inteligente de disipación térmica para equipos electrónicos con Edge Computing y Machine Learning.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="antialiased bg-[#070b14] text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
