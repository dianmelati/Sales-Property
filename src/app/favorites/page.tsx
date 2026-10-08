import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { FavoritesList } from "./favorites-list";

export const metadata: Metadata = { title: "Saved properties", robots: { index: false, follow: false } };

export default function FavoritesPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[60vh] max-w-page px-6 py-12 lg:px-12 lg:py-16">
        <h1 className="text-5xl lg:text-6xl">Saved properties</h1>
        <FavoritesList />
      </main>
      <SiteFooter />
    </>
  );
}
