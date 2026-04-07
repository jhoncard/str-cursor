import { AdminShell } from "@/components/layout/admin-shell";
import { requireAdminPage } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Security: enforce admin role for every page under /admin/(dashboard).
  // Without this, the middleware only checks "is logged in" — any authenticated
  // guest could otherwise reach /admin/webhooks, /admin/properties/[id], etc.
  // See security audit Finding #1 (CWE-285, CWE-862).
  await requireAdminPage();
  return <AdminShell>{children}</AdminShell>;
}
