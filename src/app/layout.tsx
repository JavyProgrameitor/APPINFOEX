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
      <body className="min-h-screen bg-gradient-to-b from-yellow-100 via-yellow-300 to-green-200 text-slate-900 dark:text-slate-100">
        <NavBar />
        {/* Padding top para que el contenido no quede debajo del navbar fijo */}
        <div className="pt-20">
          {children}
        </div>
      </body>
    </html>
  );
}
