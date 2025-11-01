"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"        // agrega la clase 'light' o 'dark' en <html>
      defaultTheme="dark"      // oscura por defecto
      enableSystem={false}     // ignora tema del SO
      value={{
        dark: "dark",          
        light: "light",        //  .light en globals.css
      }}
    >
      {children}
    </NextThemesProvider>
  );
}
