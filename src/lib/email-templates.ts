import type { Locale } from "@/lib/site/config";

/**
 * Client-facing emails, in the language the client was using on the site.
 * Staff notifications stay in English and live next to their senders.
 */

function formatWhen(date: Date, locale: Locale, timeZone: string) {
  const formatted = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone,
  }).format(date);
  return `${formatted} (${timeZone})`;
}

type Email = { subject: string; text: string };

export function leadAutoReply(params: {
  locale: Locale;
  name: string;
  signature: string;
}): Email {
  const { name, signature } = params;
  if (params.locale === "fr") {
    return {
      subject: "Merci pour votre message",
      text: `Bonjour ${name},\n\nMerci pour votre message — nous revenons vers vous très rapidement.\n\n${signature}`,
    };
  }
  return {
    subject: "Thanks for reaching out",
    text: `Hi ${name},\n\nThanks for your message — we'll get back to you soon.\n\n${signature}`,
  };
}

export function meetingConfirmation(params: {
  locale: Locale;
  name: string;
  topic: string;
  scheduledAt: Date;
  timeZone: string;
  signature: string;
}): Email {
  const { name, topic, signature } = params;
  const when = formatWhen(params.scheduledAt, params.locale, params.timeZone);
  if (params.locale === "fr") {
    return {
      subject: `Rendez-vous confirmé : ${topic}`,
      text: `Bonjour ${name},\n\nVotre rendez-vous est confirmé pour le ${when}.\n\nSujet : ${topic}\n\nL'invitation calendrier est jointe à cet e-mail.\n\n${signature}`,
    };
  }
  return {
    subject: `Meeting confirmed: ${topic}`,
    text: `Hi ${name},\n\nYour meeting is confirmed for ${when}.\n\nTopic: ${topic}\n\nThe calendar invite is attached.\n\n${signature}`,
  };
}

export function meetingCancellation(params: {
  locale: Locale;
  name: string;
  topic: string;
  scheduledAt: Date;
  timeZone: string;
  signature: string;
}): Email {
  const { name, topic, signature } = params;
  const when = formatWhen(params.scheduledAt, params.locale, params.timeZone);
  if (params.locale === "fr") {
    return {
      subject: `Rendez-vous annulé : ${topic}`,
      text: `Bonjour ${name},\n\nVotre rendez-vous prévu le ${when} a été annulé. N'hésitez pas à réserver un nouveau créneau si vous souhaitez toujours échanger avec nous.\n\n${signature}`,
    };
  }
  return {
    subject: `Meeting cancelled: ${topic}`,
    text: `Hi ${name},\n\nYour meeting scheduled for ${when} has been cancelled. Please book a new time if you'd still like to meet.\n\n${signature}`,
  };
}

/** For staff emails: the UTC instant plus the region's local time. */
export function staffWhen(date: Date, timeZone: string) {
  return formatWhen(date, "en", timeZone);
}
