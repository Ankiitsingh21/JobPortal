import "dotenv/config";
import { prisma } from "../src/config/db";
import { Password } from "../src/utils/password";

const seedAdmin = async () => {
  const email = process.env.ADMIN_EMAIL!;
  const password = process.env.ADMIN_PASSWORD!;

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Admin already exists, skipping");
    return;
  }

  const passwordHash = await Password.toHash(password);
  await prisma.user.create({
    data: { email, passwordHash, role: "super_admin", phoneVerified: true },
  });

  console.log("Super admin created:", email);
};

seedAdmin()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });