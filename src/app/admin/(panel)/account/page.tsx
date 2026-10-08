import { requireUser } from "@/lib/auth/session";
import { AccountForm } from "./account-form";

export const metadata = { title: "My account" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <>
      <h1 className="text-4xl">My account</h1>
      <p className="mt-3 text-sm text-mist">{user.name} · {user.email} · {user.role.replace("_", " ").toLowerCase()}</p>
      <h2 className="mb-6 mt-14 text-2xl">Change password</h2>
      <AccountForm />
    </>
  );
}
