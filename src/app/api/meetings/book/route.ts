import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import { isSlotAvailable } from "@/lib/availability";
import { buildMeetingIcs } from "@/lib/ics";

const bookSchema = z.object({
  scheduledAt: z.string().datetime(),
  name: z.string().min(1),
  email: z.string().email(),
  topic: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bookSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { name, email, topic } = parsed.data;
  const scheduledAt = new Date(parsed.data.scheduledAt);

  const settings = await prisma.siteSettings.findFirst();
  if (!settings) {
    return NextResponse.json({ error: "Scheduling is not configured" }, { status: 503 });
  }

  const [rules, blackouts] = await Promise.all([
    prisma.availabilityRule.findMany({ where: { active: true } }),
    prisma.blackoutDate.findMany(),
  ]);

  const legal = isSlotAvailable({
    scheduledAt,
    config: {
      businessTimezone: settings.businessTimezone,
      slotDurationMinutes: settings.slotDurationMinutes,
      minNoticeHours: settings.minNoticeHours,
      bookingWindowDays: settings.bookingWindowDays,
    },
    rules,
    blackoutDates: blackouts.map((b) => b.date),
    now: new Date(),
  });

  if (!legal) {
    return NextResponse.json(
      { error: "That slot is no longer available — please pick another." },
      { status: 409 }
    );
  }

  const icsUid = `${randomUUID()}@${new URL(request.url).hostname}`;

  let meeting;
  try {
    meeting = await prisma.meeting.create({
      data: {
        name,
        email,
        topic,
        scheduledAt,
        durationMinutes: settings.slotDurationMinutes,
        icsUid,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "That slot was just taken — please pick another." },
        { status: 409 }
      );
    }
    throw error;
  }

  try {
    const fromName = settings.smtpSenderName || settings.agencyName;
    const icsContent = buildMeetingIcs({
      uid: icsUid,
      title: `Meeting: ${topic}`,
      description: `Meeting with ${name} (${email})\nTopic: ${topic}`,
      scheduledAt,
      durationMinutes: settings.slotDurationMinutes,
      organizerEmail: settings.contactEmail,
      organizerName: settings.agencyName,
      attendeeEmail: email,
      attendeeName: name,
    });
    const attachments = [
      { filename: "meeting.ics", content: icsContent, contentType: "text/calendar" },
    ];

    await sendMail({
      to: email,
      subject: `Meeting confirmed: ${topic}`,
      text: `Hi ${name},\n\nYour meeting is confirmed for ${scheduledAt.toISOString()}.\n\nTopic: ${topic}\n\n${fromName}`,
      fromName,
      attachments,
    });

    await sendMail({
      to: settings.contactEmail,
      subject: `New meeting booked: ${topic}`,
      text: `${name} (${email}) booked a meeting.\n\nTopic: ${topic}\nWhen: ${scheduledAt.toISOString()}`,
      fromName,
      attachments,
    });
  } catch (error) {
    console.error("[meetings] failed to send confirmation emails", error);
  }

  return NextResponse.json({ id: meeting.id, scheduledAt: meeting.scheduledAt }, { status: 201 });
}
