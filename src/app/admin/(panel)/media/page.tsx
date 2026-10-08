import { requirePermission } from "@/lib/auth/session";
import { MediaBrowser } from "@/components/media-browser";

export const metadata = { title: "Media library" };

export default async function MediaPage() {
  await requirePermission("media:read");
  return (
    <>
      <h1 className="mb-10 text-4xl">Media library</h1>
      <MediaBrowser mode="manage" />
    </>
  );
}
