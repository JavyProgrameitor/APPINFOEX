// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/Navbar";
import { ThemeProvider } from "@/components/ui/Theme-provider";
import { ToasterProvider } from "@/components/ui/Use-toast";

export const metadata: Metadata = {
  title: "INFOEX",
  description: "Sistema INFOEX",
  icons: {
    icon: "/img/Logo.jpg", // o "/favicon.png" si lo pones
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-[--background] text-[--foreground]">
        <ThemeProvider>
          <NavBar />
          <ToasterProvider>
            <div className="pt-20">{children}</div>
          </ToasterProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
