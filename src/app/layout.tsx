// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/ui/Navbar";

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
      <body className="bg-[--background] text-[--foreground]" >
        <NavBar />
        <div className="pt-20">
          {children}
        </div>
      </body>
    </html>
  );
}
