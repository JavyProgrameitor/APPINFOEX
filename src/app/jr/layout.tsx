import { SidebarJR } from "../../components/ui/sidebar-jr";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      <SidebarJR />
      <div className="flex-1">{children}</div>
    </div>
  );
}