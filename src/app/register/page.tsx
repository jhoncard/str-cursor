import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import RegisterForm from "./register-form";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans">
      <Header />
      <Suspense>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
