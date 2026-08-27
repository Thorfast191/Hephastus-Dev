import nodemailer from "nodemailer";

function getTransport() {
  if (!process.env.SMTP_HOST) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

export async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
  fromName?: string;
}) {
  const transport = getTransport();

  if (!transport) {
    console.log(
      `[email] SMTP not configured, skipping send to ${options.to}: "${options.subject}"`
    );
    return;
  }

  const fromName = options.fromName ?? "Agency";
  const fromAddress = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "no-reply@example.com";

  await transport.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
  });
}
