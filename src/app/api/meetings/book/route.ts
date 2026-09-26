import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import { isSlotAvailable } from "@/lib/availability";
import { buildMeetingIcs } from "@/lib/ics";
import { meetingConfirmation, staffWhen } from "@/lib/email-templates";
import { REGION_ENUM } from "@/lib/site/config";
import { getRegionSettings } from "@/lib/site/content";
import { countryFromRequest, localeFor, regionFromRequest } from "@/lib/site/request";

const bookSchema = z.object({
  scheduledAt: z.string().datetime(),
  name: z.string().min(1),
  email: z.string().email(),
  topic: z.string().min(1),
  locale: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bookSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { name, email, topic } = parsed.data;
  const scheduledAt = new Date(parsed.data.scheduledAt);

  const region = regionFromRequest(request);
  const locale = localeFor(region, parsed.data.locale);
  const settings = await getRegionSettings(region);
  if (!settings) {
    return NextResponse.json({ error: "Scheduling is not configured" }, { status: 503 });
  }

  const [rules, blackouts] = await Promise.all([
    prisma.availabilityRule.findMany({ where: { active: true, region: REGION_ENUM[region] } }),
    prisma.blackoutDate.findMany({ where: { region: REGION_ENUM[region] } }),
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
        region: REGION_ENUM[region],
        locale,
        country: countryFromRequest(request),
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
      ...meetingConfirmation({
        locale,
        name,
        topic,
        scheduledAt,
        timeZone: settings.businessTimezone,
        signature: fromName,
      }),
      fromName,
      attachments,
    });

    await sendMail({
      to: settings.contactEmail,
      subject: `[${region.toUpperCase()}] New meeting booked: ${topic}`,
      text: `${name} (${email}) booked a meeting on the ${region.toUpperCase()} site (${locale}).\n\nTopic: ${topic}\nWhen: ${staffWhen(scheduledAt, settings.businessTimezone)}`,
      fromName,
      attachments,
    });
  } catch (error) {
    console.error("[meetings] failed to send confirmation emails", error);
  }

  return NextResponse.json({ id: meeting.id, scheduledAt: meeting.scheduledAt }, { status: 201 });
}
