"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import { assertAdmin } from "@/lib/admin-guard";

export async function cancelMeeting(id: string) {
  await assertAdmin();
  const meeting = await prisma.meeting.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  const settings = await prisma.siteSettings.findFirst();
  const fromName = settings?.smtpSenderName || settings?.agencyName || "Agency";

  try {
    await sendMail({
      to: meeting.email,
      subject: `Meeting cancelled: ${meeting.topic}`,
      text: `Hi ${meeting.name},\n\nYour meeting scheduled for ${meeting.scheduledAt.toISOString()} has been cancelled. Please book a new time if you'd still like to meet.\n\n${fromName}`,
      fromName,
    });
  } catch (error) {
    console.error("[meetings] failed to send cancellation email", error);
  }

  revalidatePath("/admin/meetings");
  revalidatePath("/admin");
}

export async function deleteMeeting(id: string) {
  await assertAdmin();
  await prisma.meeting.delete({ where: { id } });
  revalidatePath("/admin/meetings");
  revalidatePath("/admin");
}
