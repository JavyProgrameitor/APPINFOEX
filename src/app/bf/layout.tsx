import { SidebarBF } from "../../components/Sidebar-bf";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Menu } from "lucide-react";
import Link from "next/link";
import Footer from "@/components/Footer";

export default function BFLayout({ children }: { children: React.ReactNode }) {
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
                <SheetTitle className="font-black">Panel de Bomberos Forestales</SheetTitle>
              </SheetHeader>
              <nav className="space-y-1 p-4">
                <SheetClose asChild>
                  <Link href="/bf/list"
                    className="w-10/12 text-center rounded-xl px-5 py-3 text-sm font-medium
                               border-2 border-primary/60 bg-primary/10 hover:bg-primary/20
                               dark:border-primary/40 dark:bg-primary/10 dark:hover:bg-primary/30
                               transition-all duration-200 shadow-sm hover:shadow-md">
                    Listar
                  </Link>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
          <div className="ml-2 font-medium">Menú</div>
        </div>
      </div>
      <div className="flex min-h-[calc(100vh-56px)]">
        <SidebarBF />
        <div className="flex-1">{children}</div>
      </div>
    </>
  );
}
