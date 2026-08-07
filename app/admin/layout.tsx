import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="admin-area text-neutral-900">{children}</div>;
}
