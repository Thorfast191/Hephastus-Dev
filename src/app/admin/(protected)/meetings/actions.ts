"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import { assertAdmin, assertRegionAccess } from "@/lib/admin-guard";
import { meetingCancellation } from "@/lib/email-templates";
import { isLocale } from "@/lib/site/config";

async function assertOwnMeeting(id: string) {
  await assertAdmin();
  const { region } = await prisma.meeting.findUniqueOrThrow({
    where: { id },
    select: { region: true },
  });
  await assertRegionAccess(region);
}

export async function cancelMeeting(id: string) {
  await assertOwnMeeting(id);
  const meeting = await prisma.meeting.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  const settings = await prisma.siteSettings.findUnique({ where: { region: meeting.region } });
  const fromName = settings?.smtpSenderName || settings?.agencyName || "Agency";

  try {
    await sendMail({
      to: meeting.email,
      ...meetingCancellation({
        locale: isLocale(meeting.locale) ? meeting.locale : "en",
        name: meeting.name,
        topic: meeting.topic,
        scheduledAt: meeting.scheduledAt,
        timeZone: settings?.businessTimezone ?? "UTC",
        signature: fromName,
      }),
      fromName,
    });
  } catch (error) {
    console.error("[meetings] failed to send cancellation email", error);
  }

  revalidatePath("/admin/meetings");
  revalidatePath("/admin");
}

export async function deleteMeeting(id: string) {
  await assertOwnMeeting(id);
  await prisma.meeting.delete({ where: { id } });
  revalidatePath("/admin/meetings");
  revalidatePath("/admin");
}
