import Link from "next/link";
import { SidebarAdmin } from "../../components/ui/sidebar-admin";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="md:hidden border-b bg-background">
        <div className="h-12 flex items-center px-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menú">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <SheetHeader className="px-4 py-3 border-b"><SheetTitle>Menú</SheetTitle></SheetHeader>
              <nav className="space-y-1 p-4">
                <SheetClose asChild>
                  <Link
                    href="/admin/forms"
                    className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                  >
                    Formulario de Registro
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/admin/reports"
                    className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                  >
                    Listar Reportes
                  </Link>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
          <div className="ml-2 font-medium">Menú</div>
        </div>
      </div>
      <div className="flex min-h-[calc(100vh-56px)]">
        <SidebarAdmin />
        <div className="flex-1">{children}</div>
      </div>
    </>
  );
}
