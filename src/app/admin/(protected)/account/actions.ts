"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/admin-guard";

export type FormState = { error?: string; ok?: boolean } | undefined;

export async function updateMyName(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await assertAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required" };

  await prisma.adminUser.update({ where: { id: me.id }, data: { name } });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function changeMyPassword(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const me = await assertAdmin();
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  const user = await prisma.adminUser.findUniqueOrThrow({
    where: { id: me.id },
    select: { passwordHash: true },
  });
  if (!(await bcrypt.compare(current, user.passwordHash))) {
    return { error: "Your current password is incorrect" };
  }
  if (next.length < 10) return { error: "New password must be at least 10 characters" };
  if (next !== confirm) return { error: "The new passwords don't match" };

  await prisma.adminUser.update({
    where: { id: me.id },
    data: { passwordHash: await bcrypt.hash(next, 10) },
  });
  return { ok: true };
}
