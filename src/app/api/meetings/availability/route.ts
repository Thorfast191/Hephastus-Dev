import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeAvailableSlots } from "@/lib/availability";
import { REGION_ENUM } from "@/lib/site/config";
import { getRegionSettings } from "@/lib/site/content";
import { regionFromRequest } from "@/lib/site/request";

// Must stay dynamic: slot availability is `now`-dependent and per-request,
// and Next.js would otherwise be free to statically cache this GET route
// at build time (it has no cookies/headers usage to trigger dynamic
// rendering automatically).
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const region = regionFromRequest(request);
  const settings = await getRegionSettings(region);
  if (!settings) {
    return NextResponse.json({ slots: [] });
  }

  const [rules, blackouts, meetings] = await Promise.all([
    prisma.availabilityRule.findMany({ where: { active: true, region: REGION_ENUM[region] } }),
    prisma.blackoutDate.findMany({ where: { region: REGION_ENUM[region] } }),
    // Booked slots from *every* region: both sites book the same people, so a
    // BD meeting must block the overlapping EU slot too.
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
