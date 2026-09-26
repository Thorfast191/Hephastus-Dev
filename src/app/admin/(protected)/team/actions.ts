"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertSuperAdmin } from "@/lib/admin-guard";
import { revalidatePublicSite } from "@/lib/site/revalidate";
import { readLocalized } from "@/lib/admin/form";

const teamMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  photo: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v)),
});

function readForm(formData: FormData) {
  return {
    ...teamMemberSchema.parse({
      name: formData.get("name"),
      photo: formData.get("photo"),
    }),
    role: readLocalized(formData, "role"),
    bio: readLocalized(formData, "bio"),
  };
}

export async function createTeamMember(formData: FormData) {
  await assertSuperAdmin();
  const parsed = readForm(formData);
  const maxOrder = await prisma.teamMember.aggregate({ _max: { order: true } });

  await prisma.teamMember.create({
    data: { ...parsed, order: (maxOrder._max.order ?? -1) + 1 },
  });

  revalidatePath("/admin/team");
  revalidatePublicSite();
}

export async function updateTeamMember(id: string, formData: FormData) {
  await assertSuperAdmin();
  const parsed = readForm(formData);
  await prisma.teamMember.update({ where: { id }, data: parsed });
  revalidatePath("/admin/team");
  revalidatePublicSite();
}

export async function deleteTeamMember(id: string) {
  await assertSuperAdmin();
  await prisma.teamMember.delete({ where: { id } });
  revalidatePath("/admin/team");
  revalidatePublicSite();
}

export async function toggleTeamMemberActive(id: string, active: boolean) {
  await assertSuperAdmin();
  await prisma.teamMember.update({ where: { id }, data: { active } });
  revalidatePath("/admin/team");
  revalidatePublicSite();
}

export async function moveTeamMemberUp(id: string) {
  await assertSuperAdmin();
  const member = await prisma.teamMember.findUniqueOrThrow({ where: { id } });
  const prev = await prisma.teamMember.findFirst({
    where: { order: { lt: member.order } },
    orderBy: { order: "desc" },
  });
  if (!prev) return;

  await prisma.$transaction([
    prisma.teamMember.update({ where: { id: member.id }, data: { order: prev.order } }),
    prisma.teamMember.update({ where: { id: prev.id }, data: { order: member.order } }),
  ]);
  revalidatePath("/admin/team");
  revalidatePublicSite();
}

export async function moveTeamMemberDown(id: string) {
  await assertSuperAdmin();
  const member = await prisma.teamMember.findUniqueOrThrow({ where: { id } });
  const next = await prisma.teamMember.findFirst({
    where: { order: { gt: member.order } },
    orderBy: { order: "asc" },
  });
  if (!next) return;

  await prisma.$transaction([
    prisma.teamMember.update({ where: { id: member.id }, data: { order: next.order } }),
    prisma.teamMember.update({ where: { id: next.id }, data: { order: member.order } }),
  ]);
  revalidatePath("/admin/team");
  revalidatePublicSite();
}
