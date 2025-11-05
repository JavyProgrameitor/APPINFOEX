// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/Navbar";
import { ThemeProvider } from "@/components/ui/Theme-provider";
import { ToasterProvider } from "@/components/ui/Use-toast";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "APP Control-diario",
  description: "Control diario servicios ",
  icons: {
    icon: "/img/logoGreen.svg",
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
            <div>{children}</div>
          </ToasterProvider>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
