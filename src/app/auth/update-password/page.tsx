import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import UpdatePasswordForm from "./update-password-form";

export default function UpdatePasswordPage() {
  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans">
      <Header />
      <Suspense>
        <UpdatePasswordForm />
      </Suspense>
    </div>
  );
}
