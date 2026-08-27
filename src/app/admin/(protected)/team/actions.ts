"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const teamMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  bio: z.string().min(1, "Bio is required"),
  photo: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v)),
});

function readForm(formData: FormData) {
  return teamMemberSchema.parse({
    name: formData.get("name"),
    role: formData.get("role"),
    bio: formData.get("bio"),
    photo: formData.get("photo"),
  });
}

export async function createTeamMember(formData: FormData) {
  const parsed = readForm(formData);
  const maxOrder = await prisma.teamMember.aggregate({ _max: { order: true } });

  await prisma.teamMember.create({
    data: { ...parsed, order: (maxOrder._max.order ?? -1) + 1 },
  });

  revalidatePath("/admin/team");
}

export async function updateTeamMember(id: string, formData: FormData) {
  const parsed = readForm(formData);
  await prisma.teamMember.update({ where: { id }, data: parsed });
  revalidatePath("/admin/team");
}

export async function deleteTeamMember(id: string) {
  await prisma.teamMember.delete({ where: { id } });
  revalidatePath("/admin/team");
}

export async function toggleTeamMemberActive(id: string, active: boolean) {
  await prisma.teamMember.update({ where: { id }, data: { active } });
  revalidatePath("/admin/team");
}

export async function moveTeamMemberUp(id: string) {
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
}

export async function moveTeamMemberDown(id: string) {
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
}
