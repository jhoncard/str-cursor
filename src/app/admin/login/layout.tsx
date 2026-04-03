import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Staff sign in",
  description: "Sign in to the Feathers Houses admin dashboard.",
};

export default function AdminLoginRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
