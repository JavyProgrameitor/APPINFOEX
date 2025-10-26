"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"        // agrega la clase 'light' o 'dark' en <html>
      defaultTheme="dark"      // tu app actual es oscura por defecto
      enableSystem={false}     // opcional: ignora tema del SO
      value={{
        dark: "dark",          // no necesitas CSS extra para dark
        light: "light",        // coincide con tu .light en globals.css
      }}
    >
      {children}
    </NextThemesProvider>
  );
}
