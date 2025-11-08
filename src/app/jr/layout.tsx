import { SidebarJR } from '../../components/Sidebar-jr'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Menu } from 'lucide-react'
import Link from 'next/link'

export default function JRLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="md:hidden border-b bg-background">
        <div className="h-12 flex items-center px-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menú">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <SheetHeader className="px-4 py-3 border-b">
                <SheetTitle className="flex justify-center font-black">
                  Panel de Jefes de Servicio
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col items-center justify-center gap-4 py-8">
                <SheetClose asChild>
                  <Link
                    href="/jr/add"
                    className="w-10/12 text-center rounded-xl px-5 py-3 text-sm font-medium
                               border-2 border-primary/60 bg-primary/10 hover:bg-primary/20
                               dark:border-primary/40 dark:bg-primary/10 dark:hover:bg-primary/30
                               transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Agregar Bomberos
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/jr/note"
                    className="w-10/12 text-center rounded-xl px-5 py-3 text-sm font-medium
                               border-2 border-primary/60 bg-primary/10 hover:bg-primary/20
                               dark:border-primary/40 dark:bg-primary/10 dark:hover:bg-primary/30
                               transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Anotaciones Diarias
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/jr/exit"
                    className="w-10/12 text-center rounded-xl px-5 py-3 text-sm font-medium
                               border-2 border-primary/60 bg-primary/10 hover:bg-primary/20
                               dark:border-primary/40 dark:bg-primary/10 dark:hover:bg-primary/30
                               transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Salidas Diarias
                  </Link>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
          <div className="ml-2 font-bold">Menú</div>
        </div>
      </div>
      <div className="flex min-h-full">
        <SidebarJR />
        <div className="flex-1">{children}</div>
      </div>
      <div></div>
    </>
  )
}
