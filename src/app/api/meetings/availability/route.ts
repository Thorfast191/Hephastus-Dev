import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeAvailableSlots } from "@/lib/availability";

// Must stay dynamic: slot availability is `now`-dependent and per-request,
// and Next.js would otherwise be free to statically cache this GET route
// at build time (it has no cookies/headers usage to trigger dynamic
// rendering automatically).
export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await prisma.siteSettings.findFirst();
  if (!settings) {
    return NextResponse.json({ slots: [] });
  }

  const [rules, blackouts, meetings] = await Promise.all([
    prisma.availabilityRule.findMany({ where: { active: true } }),
    prisma.blackoutDate.findMany(),
    prisma.meeting.findMany({
      where: { status: "CONFIRMED" },
      select: { scheduledAt: true },
    }),
  ]);

  const slots = computeAvailableSlots({
    config: {
      businessTimezone: settings.businessTimezone,
      slotDurationMinutes: settings.slotDurationMinutes,
      minNoticeHours: settings.minNoticeHours,
      bookingWindowDays: settings.bookingWindowDays,
    },
    rules,
    blackoutDates: blackouts.map((b) => b.date),
    bookedSlots: meetings.map((m) => m.scheduledAt),
    now: new Date(),
  });

  return NextResponse.json({ slots: slots.map((s) => s.toISOString()) });
}
