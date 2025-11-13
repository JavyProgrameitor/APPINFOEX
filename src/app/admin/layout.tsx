import Link from 'next/link'
import { SidebarAdmin } from '../../components/Sidebar-admin'
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
                  Panel del Administrador
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col items-center justify-center gap-4 py-8">
                <SheetClose asChild>
                  <Link
                    href="/admin"
                    className="w-10/12 text-center rounded-xl px-5 py-3 text-sm font-medium
                               border-2 border-primary/60 bg-primary/10 hover:bg-primary/20
                               dark:border-primary/40 dark:bg-primary/10 dark:hover:bg-primary/30
                               transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Listar usuarios
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/admin/list"
                    className="w-10/12 text-center rounded-xl px-5 py-3 text-sm font-medium
                               border-2 border-primary/60 bg-primary/10 hover:bg-primary/20
                               dark:border-primary/40 dark:bg-primary/10 dark:hover:bg-primary/30
                               transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Ver usuario
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/admin/users"
                    className="w-10/12 text-center rounded-xl px-5 py-3 text-sm font-medium
                               border-2 border-primary/60 bg-primary/10 hover:bg-primary/20
                               dark:border-primary/40 dark:bg-primary/10 dark:hover:bg-primary/30
                               transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Agregar usuario
                  </Link>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
          <div className="ml-3 font-bold text-primary text-sm">Menu</div>
        </div>
      </div>
      <div className="flex min-h-full">
        <SidebarAdmin />
        <div className="flex-1">{children}</div>
      </div>
    </>
  )
}
