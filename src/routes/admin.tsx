import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "@/components/admin/AdminShell";

/** Private back office. Rendered in the browser only; data access is protected by database rules. */
export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Back office | Simple Surface" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
