import { SidebarBF } from '../../components/Sidebar-bf'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Calendar, Database, Send, Menu, HomeIcon, KeyRound } from 'lucide-react'
import Link from 'next/link'

export default function BFLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="md:hidden border-b bg-background">
        <div className="h-12 flex items-center px-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer"
                aria-label="Abrir menú"
              >
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="cursor-pointer">
              <SheetHeader className="px-4 py-3 border-b">
                <SheetTitle className="flex justify-center text-xl font-black">
                  BOMBERO FORESTAL
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col items-center justify-center cursor-pointer gap-4 py-8">
                <SheetClose asChild>
                  <Link
                    href="/bf"
                    className="w-10/12 flex items-center justify-center rounded-xl px-5 py-3 text-sm font-medium
                               border-2 border-primary/60 bg-primary/10 hover:bg-primary/20
                               dark:border-primary/40 dark:bg-primary/10 dark:hover:bg-primary/30
                               transition-all duration-200 shadow-sm hover:shadow-md gap-2"
                  >
                    <HomeIcon></HomeIcon>
                    INICIO
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/bf/list"
                    className="w-10/12 flex items-center justify-center text-center rounded-xl px-5 py-3 text-sm font-medium
                               border-2 border-primary/60 bg-primary/10 hover:bg-primary/20
                               dark:border-primary/40 dark:bg-primary/10 dark:hover:bg-primary/30
                               transition-all duration-200 shadow-sm hover:shadow-md gap-2"
                  >
                    <Database></Database>
                    MIS DATOS
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/bf/send"
                    className="w-10/12 flex items-center justify-center text-center rounded-xl px-5 py-3 text-sm font-medium
                               border-2 border-primary/60 bg-primary/10 hover:bg-primary/20
                               dark:border-primary/40 dark:bg-primary/10 dark:hover:bg-primary/30
                               transition-all duration-200 shadow-sm hover:shadow-md gap-2"
                  >
                    <Send></Send>
                    ENVIAR SOLICITUD
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/bf/month"
                    className="w-10/12 flex items-center justify-center text-center rounded-xl px-5 py-3 text-sm font-medium
                               border-2 border-primary/60 bg-primary/10 hover:bg-primary/20
                               dark:border-primary/40 dark:bg-primary/10 dark:hover:bg-primary/30
                               transition-all duration-200 shadow-sm hover:shadow-md gap-2"
                  >
                    <Calendar></Calendar>
                    RESUMEN MENSUAL
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/bf/pass"
                    className="w-10/12 flex items-center justify-center text-center rounded-xl px-5 py-3 text-sm font-medium
                               border-2 border-primary/60 bg-primary/10 hover:bg-primary/20
                               dark:border-primary/40 dark:bg-primary/10 dark:hover:bg-primary/30
                               transition-all duration-200 shadow-sm hover:shadow-md gap-2"
                  >
                    <KeyRound></KeyRound>
                    CAMBIAR CONTRASEÑA
                  </Link>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
          <div className="ml-2 font-medium">Menú</div>
        </div>
      </div>
      <div className="flex min-h-full">
        <SidebarBF />
        <div className="flex-1">{children}</div>
      </div>
    </>
  )
}
