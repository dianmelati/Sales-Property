import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/admin");
  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_1fr]">
      <div className="hidden bg-basalt p-12 text-paper lg:flex lg:items-end">
        <p className="max-w-sm font-serif text-4xl tracking-display">Every listing, one place to manage it.</p>
      </div>
      <div className="flex items-center px-6 py-16 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-4xl">Sign in</h1>
          <p className="mb-10 mt-3 text-sm text-mist">Estate admin</p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
