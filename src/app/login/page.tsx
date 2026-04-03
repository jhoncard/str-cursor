import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans">
      <Header />
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
