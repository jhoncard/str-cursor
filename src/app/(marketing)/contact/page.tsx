import { Header } from "@/components/layout/header";
import ContactForm from "./contact-form";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans pb-16">
      <Header />
      <ContactForm />
    </div>
  );
}
