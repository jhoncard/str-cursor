import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import ForgotPasswordForm from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans">
      <Header />
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}
