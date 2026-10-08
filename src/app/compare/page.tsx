import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { CompareTable } from "./compare-table";

export const metadata: Metadata = { title: "Compare properties", robots: { index: false, follow: false } };

export default function ComparePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[60vh] max-w-page px-6 py-12 lg:px-12 lg:py-16">
        <h1 className="text-5xl lg:text-6xl">Compare properties</h1>
        <p className="mt-4 text-sm text-mist">Up to 3 properties, side by side. Your selection stays on this device.</p>
        <CompareTable />
      </main>
      <SiteFooter />
    </>
  );
}
