import { toZonedTime, fromZonedTime } from "date-fns-tz";

export type AvailabilityRuleInput = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active: boolean;
};

export type AvailabilityConfig = {
  businessTimezone: string;
  slotDurationMinutes: number;
  minNoticeHours: number;
  bookingWindowDays: number;
};

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

// toZonedTime returns a Date whose LOCAL getters (getFullYear, getHours, ...)
// reflect the wall-clock time in `businessTimezone` -- verified against the
// date-fns-tz v3 source, which round-trips through local Date setters. Reading
// it with UTC getters instead silently shifts by the server's own system
// timezone offset. Always use local getters here.
function businessDateParts(instant: Date, businessTimezone: string) {
  const zoned = toZonedTime(instant, businessTimezone);
  return {
    year: zoned.getFullYear(),
    month: zoned.getMonth(),
    day: zoned.getDate(),
    dayOfWeek: zoned.getDay(),
    minutesSinceMidnight: zoned.getHours() * 60 + zoned.getMinutes(),
  };
}

function dateStringFromParts(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function blackoutDateStrings(blackoutDates: Date[]): Set<string> {
  // BlackoutDate.date is stored as new Date("YYYY-MM-DD") (UTC midnight for
  // that calendar date) -- UTC getters give back that same calendar date.
  return new Set(
    blackoutDates.map((d) =>
      dateStringFromParts(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    )
  );
}

export function computeAvailableSlots(params: {
  config: AvailabilityConfig;
  rules: AvailabilityRuleInput[];
  blackoutDates: Date[];
  bookedSlots: Date[];
  now: Date;
}): Date[] {
  const { config, rules, blackoutDates, bookedSlots, now } = params;
  const blackoutSet = blackoutDateStrings(blackoutDates);
  const bookedSet = new Set(bookedSlots.map((d) => d.getTime()));
  const noticeCutoff = now.getTime() + config.minNoticeHours * 60 * 60 * 1000;
  const today = businessDateParts(now, config.businessTimezone);
  const activeRules = rules.filter((r) => r.active);

  const seen = new Set<number>();
  const slots: Date[] = [];

  for (let offset = 0; offset <= config.bookingWindowDays; offset++) {
    // Plain calendar arithmetic (no toZonedTime involved) -- Date.UTC/UTC
    // getters are TZ-independent here, unlike the businessDateParts contract.
    const dateAtOffset = new Date(Date.UTC(today.year, today.month, today.day + offset));
    const dateStr = dateStringFromParts(
      dateAtOffset.getUTCFullYear(),
      dateAtOffset.getUTCMonth(),
      dateAtOffset.getUTCDate()
    );
    const dayOfWeek = dateAtOffset.getUTCDay();

    if (blackoutSet.has(dateStr)) continue;

    const dayRules = activeRules.filter((r) => r.dayOfWeek === dayOfWeek);

    for (const rule of dayRules) {
      const startMinutes = parseTimeToMinutes(rule.startTime);
      const endMinutes = parseTimeToMinutes(rule.endTime);

      for (
        let slotStart = startMinutes;
        slotStart + config.slotDurationMinutes <= endMinutes;
        slotStart += config.slotDurationMinutes
      ) {
        const wallClock = `${dateStr}T${pad(Math.floor(slotStart / 60))}:${pad(
          slotStart % 60
        )}:00`;
        const instant = fromZonedTime(wallClock, config.businessTimezone);

        if (instant.getTime() < noticeCutoff) continue;
        if (bookedSet.has(instant.getTime())) continue;
        if (seen.has(instant.getTime())) continue;

        seen.add(instant.getTime());
        slots.push(instant);
      }
    }
  }

  slots.sort((a, b) => a.getTime() - b.getTime());
  return slots;
}

export function isSlotAvailable(params: {
  scheduledAt: Date;
  config: AvailabilityConfig;
  rules: AvailabilityRuleInput[];
  blackoutDates: Date[];
  now: Date;
}): boolean {
  const { scheduledAt, config, rules, blackoutDates, now } = params;

  const noticeCutoff = now.getTime() + config.minNoticeHours * 60 * 60 * 1000;
  if (scheduledAt.getTime() < noticeCutoff) return false;

  const parts = businessDateParts(scheduledAt, config.businessTimezone);
  const dateStr = dateStringFromParts(parts.year, parts.month, parts.day);

  if (blackoutDateStrings(blackoutDates).has(dateStr)) return false;

  const activeRules = rules.filter((r) => r.active && r.dayOfWeek === parts.dayOfWeek);

  return activeRules.some((rule) => {
    const startMinutes = parseTimeToMinutes(rule.startTime);
    const endMinutes = parseTimeToMinutes(rule.endTime);
    if (parts.minutesSinceMidnight < startMinutes) return false;
    if (parts.minutesSinceMidnight + config.slotDurationMinutes > endMinutes) return false;
    return (parts.minutesSinceMidnight - startMinutes) % config.slotDurationMinutes === 0;
  });
}
