import type { ReactNode } from "react";
import AdminHeader from "@/components/AdminHeader";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-area text-neutral-900">
      <AdminHeader />
      {children}
    </div>
  );
}
