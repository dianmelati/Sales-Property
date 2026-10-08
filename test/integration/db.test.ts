// Tes integrasi dengan database PostgreSQL sungguhan. Dilewati kecuali TEST_DATABASE_URL diisi.
//   TEST_DATABASE_URL=postgresql://.../estate_test npx prisma db push && npm run test:integration
// Tidak dijalankan di lingkungan pembuatan (tidak ada PostgreSQL di sana).
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

const url = process.env.TEST_DATABASE_URL;
const unsafe = url && !/test/i.test(new URL(url).pathname); // jangan pernah menyentuh database yang bukan database tes
if (unsafe) throw new Error("TEST_DATABASE_URL harus menunjuk ke database yang namanya memuat 'test'.");

describe("database", { skip: !url }, () => {
  let prisma: typeof import("@/lib/prisma")["prisma"];
  let listLeads: typeof import("@/server/leads/queries")["listLeads"];
  let leadScope: typeof import("@/server/leads/scope")["leadScope"];
  let cardsByWhere: typeof import("@/server/properties/public")["cardsByWhere"];
  const tag = `t${Date.now()}`;
  const ids: { agentA?: string; agentB?: string; userA?: string; loc?: string; cat?: string } = {};

  before(async () => {
    process.env.DATABASE_URL = url;
    ({ prisma } = await import("@/lib/prisma"));
    ({ listLeads } = await import("@/server/leads/queries"));
    ({ leadScope } = await import("@/server/leads/scope"));
    ({ cardsByWhere } = await import("@/server/properties/public"));

    const role = await prisma.role.upsert({ where: { name: "AGENT" }, update: {}, create: { name: "AGENT" } });
    const userA = await prisma.user.create({ data: { email: `${tag}-a@test.id`, name: "Agen A", passwordHash: "x", roleId: role.id } });
    const a = await prisma.agent.create({ data: { name: `Agen A ${tag}`, slug: `${tag}-a`, userId: userA.id } });
    const b = await prisma.agent.create({ data: { name: `Agen B ${tag}`, slug: `${tag}-b` } });
    Object.assign(ids, { userA: userA.id, agentA: a.id, agentB: b.id });
    await prisma.lead.createMany({ data: [
      { name: `${tag} milik A`, phone: "081300000001", source: "phone", agentId: a.id },
      { name: `${tag} milik B`, phone: "081300000002", source: "phone", agentId: b.id },
      { name: `${tag} tanpa agen`, phone: "081300000003", source: "phone" },
    ] });
    const cat = await prisma.propertyCategory.create({ data: { name: `Kat ${tag}`, slug: `kat-${tag}` } });
    const loc = await prisma.propertyLocation.create({ data: { name: `Lok ${tag}`, slug: `lok-${tag}`, city: "Kota" } });
    Object.assign(ids, { cat: cat.id, loc: loc.id });
    const mk = (n: string, extra: object) => prisma.property.create({ data: { code: `${tag}-${n}`, title: `Rumah ${n} ${tag}`, slug: `${tag}-${n}`, categoryId: cat.id, locationId: loc.id, transaction: "SALE", price: 1_000_000_000, ...extra } });
    await mk("terbit", { status: "PUBLISHED", publishedAt: new Date() });
    await mk("draf", { status: "DRAFT" });
    await mk("dihapus", { status: "PUBLISHED", publishedAt: new Date(), deletedAt: new Date() });
    await mk("terjual", { status: "SOLD", publishedAt: new Date() });
  });

  after(async () => {
    if (!prisma) return;
    await prisma.lead.deleteMany({ where: { name: { startsWith: tag } } });
    await prisma.property.deleteMany({ where: { code: { startsWith: tag } } });
    await prisma.propertyLocation.deleteMany({ where: { slug: `lok-${tag}` } });
    await prisma.propertyCategory.deleteMany({ where: { slug: `kat-${tag}` } });
    await prisma.agent.deleteMany({ where: { slug: { startsWith: tag } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
    await prisma.$disconnect();
  });

  test("role AGENT hanya melihat lead miliknya", async () => {
    const scope = await leadScope({ id: ids.userA!, role: "AGENT" });
    const { items } = await listLeads({ q: tag }, scope, 1);
    assert.deepEqual(items.map((l) => l.name), [`${tag} milik A`]);
  });

  test("agen tidak bisa memperluas lingkup lewat filter agen", async () => {
    const scope = await leadScope({ id: ids.userA!, role: "AGENT" });
    assert.equal((await listLeads({ q: tag, agent: ids.agentB }, scope, 1)).total, 0);
    assert.equal((await listLeads({ q: tag, agent: "unassigned" }, scope, 1)).total, 0);
  });

  test("akun AGENT tanpa profil agen tidak melihat apa pun", async () => {
    const scope = await leadScope({ id: "tidak-ada", role: "AGENT" });
    assert.equal((await listLeads({ q: tag }, scope, 1)).total, 0);
  });

  test("role lain melihat semua lead", async () => {
    const scope = await leadScope({ id: ids.userA!, role: "ADMIN" });
    assert.equal((await listLeads({ q: tag }, scope, 1)).total, 3);
    assert.equal((await listLeads({ q: tag, agent: "unassigned" }, scope, 1)).total, 1);
  });

  test("situs publik hanya menampilkan properti terbit dan tidak terhapus", async () => {
    const { items, total } = await cardsByWhere({ locationId: ids.loc }, 20);
    assert.equal(total, 1);
    assert.deepEqual(items.map((p) => p.slug), [`${tag}-terbit`]);
    assert.equal(typeof items[0].price, "number");
  });
});
