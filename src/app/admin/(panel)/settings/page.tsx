import { requirePermission } from "@/lib/auth/session";
import { getSiteSettings } from "@/server/cms/settings";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requirePermission("settings:write");
  const s = await getSiteSettings();
  return (
    <>
      <h1 className="mb-12 text-4xl">Settings</h1>
      <SettingsForm s={s} />
    </>
  );
}
