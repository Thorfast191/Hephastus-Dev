"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertSuperAdmin } from "@/lib/admin-guard";

/**
 * Admin account management — super admins only. Actions return
 * `{ error }` instead of throwing so the dialog can show what went wrong
 * (email taken, weak password) without dropping the admin on an error page.
 */

export type FormState = { error?: string; ok?: boolean } | undefined;

const MIN_PASSWORD = 10;

const accessSchema = z
  .object({
    role: z.enum(["SUPER_ADMIN", "REGION_ADMIN"]),
    region: z.enum(["EU", "BD"]).nullable(),
  })
  .transform(({ role, region }) => ({
    role,
    // Super admins have no region; region admins must have one.
    region: role === "SUPER_ADMIN" ? null : region,
  }))
  .refine((v) => v.role === "SUPER_ADMIN" || v.region !== null, {
    message: "Choose which site this region admin manages",
  });

const passwordSchema = z
  .string()
  .min(MIN_PASSWORD, `Password must be at least ${MIN_PASSWORD} characters`);

function readAccess(formData: FormData) {
  return accessSchema.safeParse({
    role: formData.get("role"),
    region: formData.get("region") || null,
  });
}

function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid input";
}

/** Refuse changes that would leave nobody able to manage admins. */
async function wouldRemoveLastSuperAdmin(id: string) {
  const user = await prisma.adminUser.findUnique({ where: { id }, select: { role: true } });
  if (user?.role !== "SUPER_ADMIN") return false;
  const supers = await prisma.adminUser.count({ where: { role: "SUPER_ADMIN" } });
  return supers <= 1;
}

export async function createAdmin(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertSuperAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = passwordSchema.safeParse(formData.get("password"));
  const access = readAccess(formData);

  if (!name) return { error: "Name is required" };
  if (!z.string().email().safeParse(email).success) return { error: "Enter a valid email" };
  if (!password.success) return { error: firstError(password.error) };
  if (!access.success) return { error: firstError(access.error) };

  try {
    await prisma.adminUser.create({
      data: {
        name,
        email,
        passwordHash: await bcrypt.hash(password.data, 10),
        ...access.data,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "An admin with that email already exists" };
    }
    throw error;
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function updateAdmin(
  id: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const me = await assertSuperAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const access = readAccess(formData);
  if (!name) return { error: "Name is required" };
  if (!access.success) return { error: firstError(access.error) };

  const target = await prisma.adminUser.findUniqueOrThrow({ where: { id } });
  const roleChanges = target.role !== access.data.role || target.region !== access.data.region;

  if (roleChanges && id === me.id) {
    return { error: "You can't change your own access — ask another super admin" };
  }
  if (access.data.role !== "SUPER_ADMIN" && (await wouldRemoveLastSuperAdmin(id))) {
    return { error: "This is the last super admin — promote someone else first" };
  }

  await prisma.adminUser.update({ where: { id }, data: { name, ...access.data } });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function resetAdminPassword(
  id: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await assertSuperAdmin();

  const password = passwordSchema.safeParse(formData.get("password"));
  if (!password.success) return { error: firstError(password.error) };

  await prisma.adminUser.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(password.data, 10) },
  });
  return { ok: true };
}

export async function deleteAdmin(id: string): Promise<FormState> {
  const me = await assertSuperAdmin();

  if (id === me.id) return { error: "You can't delete your own account" };
  if (await wouldRemoveLastSuperAdmin(id)) {
    return { error: "This is the last super admin — promote someone else first" };
  }

  await prisma.adminUser.delete({ where: { id } });
  revalidatePath("/admin/users");
  return { ok: true };
}
