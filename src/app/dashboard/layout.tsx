import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Reservations | Feathers Houses",
  description: "View and manage your upcoming and past reservations.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
