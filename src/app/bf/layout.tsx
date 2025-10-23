import { SidebarBF } from "../../components/ui/sidebar-bf";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      <SidebarBF />
      <div className="flex-1">{children}</div>
    </div>
  );
}