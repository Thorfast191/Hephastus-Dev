import { PrismaClient, type AdminRole, type Region } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main() {
  const email = (getArg("--email") ?? process.env.ADMIN_EMAIL)?.trim().toLowerCase();
  const password = getArg("--password") ?? process.env.ADMIN_PASSWORD;
  const name = getArg("--name") ?? process.env.ADMIN_NAME ?? "Admin";
  const roleArg = getArg("--role") ?? process.env.ADMIN_ROLE;
  const regionArg = (getArg("--region") ?? process.env.ADMIN_REGION)?.toUpperCase();

  const usage =
    'Usage: pnpm seed:admin --email you@example.com --password secret [--name "Your Name"]\n' +
    "                       [--role super|region] [--region EU|BD]\n" +
    "Or set ADMIN_EMAIL / ADMIN_PASSWORD (/ ADMIN_NAME / ADMIN_ROLE / ADMIN_REGION).\n" +
    "New accounts default to super admin. On an existing account the role only\n" +
    "changes when --role is given, so resetting a password never changes access.";

  if (!email || !password) {
    console.error(usage);
    process.exit(1);
  }
  if (roleArg && roleArg !== "super" && roleArg !== "region") {
    console.error(`--role must be "super" or "region"\n\n${usage}`);
    process.exit(1);
  }
  if (roleArg === "region" && regionArg !== "EU" && regionArg !== "BD") {
    console.error(`A region admin needs --region EU or --region BD\n\n${usage}`);
    process.exit(1);
  }

  const access: { role: AdminRole; region: Region | null } | undefined =
    roleArg === "region"
      ? { role: "REGION_ADMIN", region: regionArg as Region }
      : roleArg === "super"
        ? { role: "SUPER_ADMIN", region: null }
        : undefined;

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash, name, ...access },
    create: { email, passwordHash, name, ...(access ?? { role: "SUPER_ADMIN", region: null }) },
  });

  const scope = user.region ? ` (${user.region})` : "";
  console.log(`Admin user ready: ${user.email} — ${user.role}${scope}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
