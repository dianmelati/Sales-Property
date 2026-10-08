/**
 * Data contoh UNTUK PENGEMBANGAN: agen, delapan properti fiktif, beberapa lead, dan FAQ.
 * Semua nama, harga, dan teks fiktif. Tanpa foto (halaman memakai placeholder sampai Anda mengunggah foto).
 * Jalankan setelah seed dasar: npm run db:seed && npm run db:seed:demo. Menolak berjalan di produksi.
 */
import { PrismaClient } from "@prisma/client";

if (process.env.NODE_ENV === "production") throw new Error("Seed demo tidak boleh dijalankan di produksi.");
const prisma = new PrismaClient();

const agents = [
  { slug: "demo-maya-pratama", name: "Maya Pratama", title: "Senior Property Consultant", phone: "081200000001", email: "maya@demo.example", isFeatured: true },
  { slug: "demo-raka-wijaya", name: "Raka Wijaya", title: "Property Consultant", phone: "081200000002", email: "raka@demo.example", isFeatured: true },
  { slug: "demo-dewi-lestari", name: "Dewi Lestari", title: "Leasing Specialist", phone: "081200000003", email: "dewi@demo.example", isFeatured: false },
];

type P = { n: number; title: string; cat: string; loc: string; tx: "SALE" | "RENT"; price: number; beds: number; baths: number; land: number; bld: number; floors: number; parking: number; cert: "SHM" | "HGB" | "STRATA"; pool?: boolean; garden?: boolean; garage?: boolean; furnished?: boolean; featured?: boolean; premium?: boolean; lat: number; lng: number; agent: number; features: string[] };
const props: P[] = [
  { n: 1, title: "Courtyard House with Pool", cat: "house", loc: "bsd-city", tx: "SALE", price: 8_900_000_000, beds: 4, baths: 4, land: 420, bld: 360, floors: 2, parking: 3, cert: "SHM", pool: true, garden: true, garage: true, featured: true, lat: -6.3017, lng: 106.6427, agent: 0, features: ["Central courtyard", "Home office", "Solar water heater", "Smart lock"] },
  { n: 2, title: "Ridge Villa above the Rice Terraces", cat: "villa", loc: "bali", tx: "SALE", price: 14_500_000_000, beds: 5, baths: 5, land: 1100, bld: 520, floors: 2, parking: 4, cert: "HGB", pool: true, garden: true, furnished: true, featured: true, premium: true, lat: -8.5069, lng: 115.2625, agent: 1, features: ["Infinity pool", "Open-air pavilion", "Staff quarters", "Rice terrace view"] },
  { n: 3, title: "Corner Residence, High Floor", cat: "apartment", loc: "jakarta-selatan", tx: "RENT", price: 38_000_000, beds: 2, baths: 2, land: 0, bld: 128, floors: 1, parking: 2, cert: "STRATA", furnished: true, lat: -6.2297, lng: 106.8105, agent: 2, features: ["City view", "24-hour security", "Gym and pool access"] },
  { n: 4, title: "Hillside House with Garden", cat: "house", loc: "bandung", tx: "SALE", price: 6_250_000_000, beds: 4, baths: 3, land: 600, bld: 310, floors: 2, parking: 2, cert: "SHM", garden: true, garage: true, premium: true, lat: -6.8695, lng: 107.615, agent: 0, features: ["Valley view", "Fireplace", "Large terrace"] },
  { n: 5, title: "Corner Townhouse, Quiet Street", cat: "townhouse", loc: "jakarta-selatan", tx: "SALE", price: 11_200_000_000, beds: 3, baths: 3, land: 240, bld: 290, floors: 3, parking: 2, cert: "SHM", garage: true, lat: -6.2615, lng: 106.8136, agent: 1, features: ["Private lift", "Rooftop terrace", "Gated cluster"] },
  { n: 6, title: "Garden Villa near the Beach", cat: "villa", loc: "bali", tx: "RENT", price: 95_000_000, beds: 3, baths: 3, land: 480, bld: 260, floors: 1, parking: 2, cert: "HGB", pool: true, garden: true, furnished: true, lat: -8.6478, lng: 115.1385, agent: 2, features: ["Private pool", "Walk to the beach", "Daily housekeeping"] },
  { n: 7, title: "Compact Family Home", cat: "house", loc: "bsd-city", tx: "SALE", price: 2_450_000_000, beds: 3, baths: 2, land: 120, bld: 105, floors: 2, parking: 1, cert: "SHM", lat: -6.31, lng: 106.65, agent: 0, features: ["Near international school", "Cluster with 24-hour security"] },
  { n: 8, title: "Two-Bedroom Apartment with Park View", cat: "apartment", loc: "bandung", tx: "SALE", price: 1_650_000_000, beds: 2, baths: 1, land: 0, bld: 68, floors: 1, parking: 1, cert: "STRATA", lat: -6.9, lng: 107.61, agent: 2, features: ["Park view", "Direct access to mall"] },
];

async function main() {
  const ag = [];
  for (const a of agents) ag.push(await prisma.agent.upsert({ where: { slug: a.slug }, update: {}, create: a }));

  for (const p of props) {
    const [category, location] = await Promise.all([
      prisma.propertyCategory.findUniqueOrThrow({ where: { slug: p.cat } }),
      prisma.propertyLocation.findUniqueOrThrow({ where: { slug: p.loc } }),
    ]);
    const code = `DEMO-${String(p.n).padStart(4, "0")}`;
    const slug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (await prisma.property.findUnique({ where: { code } })) continue;
    await prisma.property.create({
      data: {
        code, title: p.title, slug: `demo-${slug}`, categoryId: category.id, locationId: location.id, agentId: ag[p.agent].id,
        transaction: p.tx, price: p.price, currency: "IDR", address: `Demo address ${p.n}, ${location.name}`, latitude: p.lat, longitude: p.lng,
        landArea: p.land || null, buildingArea: p.bld, bedrooms: p.beds, bathrooms: p.baths, floors: p.floors, parking: p.parking, certificate: p.cert,
        furnished: !!p.furnished, hasPool: !!p.pool, hasGarage: !!p.garage, hasGarden: !!p.garden, isFeatured: !!p.featured, isPremium: !!p.premium,
        description: `<p>${p.title} in ${location.name}: ${p.beds} bedrooms and ${p.baths} bathrooms across ${p.bld} m² of living space.</p><p>This is demo content for development. Replace it with the real description of the property.</p>`,
        status: "PUBLISHED", publishedAt: new Date(Date.now() - p.n * 864e5),
        features: { create: p.features.map((label, i) => ({ label, sortOrder: i })) },
        seo: p.n <= 2 ? { create: { title: `${p.title} in ${location.name}`, description: `${p.beds}-bedroom ${p.cat} for ${p.tx === "RENT" ? "rent" : "sale"} in ${location.name}. Demo listing.` } } : undefined,
      },
    });
  }

  const some = await prisma.property.findMany({ where: { code: { startsWith: "DEMO-" } }, take: 4, orderBy: { code: "asc" } });
  if ((await prisma.lead.count({ where: { name: { startsWith: "Demo " } } })) === 0 && some.length) {
    const rows = [
      ["Demo Budi Santoso", "NEW", "inquiry_form"], ["Demo Sari Utami", "CONTACTED", "viewing_request"], ["Demo Andi Pratama", "VIEWING", "viewing_request"],
      ["Demo Lina Hartono", "NEGOTIATION", "inquiry_form"], ["Demo Joko Susilo", "CLOSED", "phone"], ["Demo Rina Kusuma", "LOST", "contact_page"],
    ] as const;
    for (const [i, [name, status, source]] of rows.entries()) {
      await prisma.lead.create({ data: { name, phone: `08130000010${i}`, source, status, propertyId: some[i % some.length].id, agentId: ag[i % 3].id, message: "Demo inquiry." } });
    }
  }

  if ((await prisma.fAQ.count()) === 0) {
    await prisma.fAQ.createMany({ data: [
      { question: "How do I arrange a viewing?", answer: "Use the viewing request form on any property page, or message us on WhatsApp.", sortOrder: 0 },
      { question: "Can foreigners buy property?", answer: "Rules depend on the property type and certificate. Ask an agent and confirm with a licensed notary.", sortOrder: 1 },
      { question: "Are the listed prices negotiable?", answer: "Prices are set by the owners. Your agent can tell you how much room there is.", sortOrder: 2 },
    ] });
  }
  console.log("Seed demo selesai: 3 agen, 8 properti, 6 lead, FAQ. Tanpa foto.");
}
main().finally(() => prisma.$disconnect());
