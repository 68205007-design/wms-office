import "dotenv/config";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient, RoleName } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  for (const name of Object.values(RoleName)) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }
  const productUnits = await prisma.product.findMany({ select: { unit: true }, distinct: ["unit"] });
  const unitNames = new Set(["ชิ้น", "กล่อง", "แพ็ค", "กิโลกรัม", "ลิตร", ...productUnits.map(({ unit }) => unit.trim()).filter(Boolean)]);
  for (const name of unitNames) {
    const unit = await prisma.unit.upsert({ where: { name }, update: {}, create: { name } });
    await prisma.product.updateMany({ where: { unit: name, unitCatalogId: null }, data: { unitCatalogId: unit.id } });
  }
  const { SUPER_ADMIN_EMAIL: email = "admin@wms.local", SUPER_ADMIN_NAME: name = "System Administrator" } = process.env;
  let password = process.env.SUPER_ADMIN_PASSWORD;
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  // บนเซิร์ฟเวอร์ที่ไม่ได้กำหนดรหัสผ่าน: สุ่มรหัสครั้งแรกแล้วแสดงใน log ครั้งเดียว
  if (!password && !existing) {
    password = `Wms-${crypto.randomBytes(9).toString("base64url")}`;
    console.log(`SUPER_ADMIN_LOGIN email=${email.toLowerCase()} password=${password}`);
  }
  if (existing) {
    console.log("Roles ready; Super Admin already exists.");
    return;
  }
  if (!email || !password || password.length < 12) {
    throw new Error("กำหนด SUPER_ADMIN_EMAIL และ SUPER_ADMIN_PASSWORD อย่างน้อย 12 ตัวอักษรก่อน seed");
  }
  const role = await prisma.role.findUniqueOrThrow({ where: { name: "SUPER_ADMIN" } });
  await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {},
    create: { name, email: email.toLowerCase(), passwordHash: await bcrypt.hash(password, 12), roleId: role.id }
  });
  console.log("Roles and initial Super Admin are ready.");
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
