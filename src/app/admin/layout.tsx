import Link from "next/link";
import { SidebarAdmin } from "../../components/ui/Sidebar-admin";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Menu } from "lucide-react";
import Footer from "@/components/ui/Footer";


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
                <SheetTitle className="font-semibold">Menu</SheetTitle>
                </SheetHeader>
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
          <div className="ml-2 font-bold">Menu</div>
        </div>
      </div>
      <div className="flex min-h-[calc(100vh-56px)]">
        <SidebarAdmin />
        <div className="flex-1">{children}</div>
      </div>
      <div>
      <Footer />
      </div>
    </>
  );
}
