import { Header } from "@/components/layout/header";
import SuccessContent from "./success-content";

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans pb-24 flex flex-col">
      <Header />
      <SuccessContent />
    </div>
  );
}
