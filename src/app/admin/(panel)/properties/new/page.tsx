import { requirePermission } from "@/lib/auth/session";
import { getFormOptions } from "@/server/properties/queries";
import { PropertyForm } from "../property-form";

export const metadata = { title: "Add property" };

export default async function NewProperty() {
  await requirePermission("property:write");
  const options = await getFormOptions();
  return (
    <>
      <h1 className="mb-10 text-4xl">Add property</h1>
      <PropertyForm id={null} options={options} />
    </>
  );
}
