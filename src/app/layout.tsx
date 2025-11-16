// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import NavBar from '@/components/Navbar'
import { ThemeProvider } from '@/components/ui/Theme-provider'
import { ToasterProvider } from '@/components/ui/Use-toast'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'APP Control-diario',
  description: 'Control diario servicios ',
  icons: {
    icon: '/img/logoGreen.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-dvh flex flex-col overflow-x-hidden">
        <ThemeProvider>
          <NavBar />
          <ToasterProvider>
            <main className="flex-1">{children}</main>
          </ToasterProvider>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  )
}
