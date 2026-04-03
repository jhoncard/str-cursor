import { Header } from "@/components/layout/header";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans">
      <Header />
      {children}
    </div>
  );
}
