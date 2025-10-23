import { SidebarAdmin } from "../../components/ui/sidebar-admin";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      <SidebarAdmin />
      <div className="flex-1">{children}</div>
    </div>
  );
}