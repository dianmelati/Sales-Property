import { PrismaClient, RoleName } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { DEFAULT_HOME } from "../src/lib/cms/defaults";
import { PERMISSIONS, ROLE_PERMISSIONS } from "../src/lib/auth/permissions";

const prisma = new PrismaClient();

async function main() {
  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  }
  for (const name of Object.values(RoleName)) {
    const role = await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    const perms = await prisma.permission.findMany({ where: { key: { in: [...ROLE_PERMISSIONS[name]] } } });
    await prisma.rolePermission.createMany({ data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })) });
  }
  const email = process.env.ADMIN_SEED_EMAIL;
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (!email || !password) throw new Error("Set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD in .env");
  if (password.length < 10) throw new Error("ADMIN_SEED_PASSWORD must be at least 10 characters. Change it after the first login in Admin > My account.");
  const role = await prisma.role.findUniqueOrThrow({ where: { name: "SUPER_ADMIN" } });
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Administrator", passwordHash: await hashPassword(password), roleId: role.id },
  });

  const cats = ["House", "Villa", "Apartment", "Townhouse", "Land"];
  for (const [i, name] of cats.entries()) {
    await prisma.propertyCategory.upsert({
      where: { slug: name.toLowerCase() }, update: {}, create: { name, slug: name.toLowerCase(), sortOrder: i },
    });
  }
  const locs = [
    ["Jakarta Selatan", "jakarta-selatan", "Jakarta"], ["Bali", "bali", "Bali"],
    ["BSD City", "bsd-city", "Tangerang"], ["Bandung", "bandung", "Bandung"],
  ];
  for (const [name, slug, city] of locs) {
    await prisma.propertyLocation.upsert({ where: { slug }, update: {}, create: { name, slug, city } });
  }
  // Nomor WhatsApp: hanya diisi bila kosong. Nilai dari env WHATSAPP_SEED_NUMBER; ubah kapan saja di Admin > Settings.
  const wa = await prisma.siteSetting.findUnique({ where: { key: "whatsapp.number" } });
  if (!wa || !wa.value) {
    await prisma.siteSetting.upsert({
      where: { key: "whatsapp.number" }, update: { value: process.env.WHATSAPP_SEED_NUMBER ?? "" }, create: { key: "whatsapp.number", value: process.env.WHATSAPP_SEED_NUMBER ?? "" },
    });
  }

  // Beranda bawaan: hanya dibuat bila belum ada seksi sama sekali.
  const home = await prisma.page.upsert({ where: { key: "home" }, update: {}, create: { key: "home", title: "Home" } });
  if ((await prisma.pageSection.count({ where: { pageId: home.id } })) === 0) {
    await prisma.pageSection.createMany({ data: DEFAULT_HOME.map((d, i) => ({ pageId: home.id, type: d.type, content: d.content as object, sortOrder: i })) });
  }
  console.log("Seed selesai.");
}

main().finally(() => prisma.$disconnect());
