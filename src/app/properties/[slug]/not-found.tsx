import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-page px-6 py-24 lg:px-12">
        <h1 className="text-5xl">This property is no longer listed</h1>
        <p className="mt-4 max-w-md text-mist">It may have been sold or taken off the market. Similar properties are waiting in the listings.</p>
        <Link href="/properties" className="btn-primary mt-8">Browse properties</Link>
      </main>
      <SiteFooter />
    </>
  );
}
