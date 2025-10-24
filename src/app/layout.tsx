// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/ui/NavBar";

export const metadata: Metadata = {
  title: "INFOEX",
  description: "Sistema INFOEX",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen 100">
        <NavBar />
        {/* Padding top para que el contenido no quede debajo del navbar fijo */}
        <div className="pt-20">
          {children}
        </div>
      </body>
    </html>
  );
}
