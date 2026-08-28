import { createEvent } from "ics";

export function buildMeetingIcs(params: {
  uid: string;
  title: string;
  description: string;
  scheduledAt: Date;
  durationMinutes: number;
  organizerEmail: string;
  organizerName: string;
  attendeeEmail: string;
  attendeeName: string;
}): string {
  const {
    uid,
    title,
    description,
    scheduledAt,
    durationMinutes,
    organizerEmail,
    organizerName,
    attendeeEmail,
    attendeeName,
  } = params;

  const { error, value } = createEvent({
    uid,
    title,
    description,
    start: [
      scheduledAt.getUTCFullYear(),
      scheduledAt.getUTCMonth() + 1,
      scheduledAt.getUTCDate(),
      scheduledAt.getUTCHours(),
      scheduledAt.getUTCMinutes(),
    ],
    startInputType: "utc",
    startOutputType: "utc",
    duration: { minutes: durationMinutes },
    organizer: { name: organizerName, email: organizerEmail },
    attendees: [{ name: attendeeName, email: attendeeEmail, rsvp: true }],
  });

  if (error || !value) {
    throw error ?? new Error("Failed to build ICS event");
  }

  return value;
}
