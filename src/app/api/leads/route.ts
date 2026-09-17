import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";

const leadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().trim().optional(),
  message: z.string().min(1),
  serviceId: z.string().optional(),
  projectType: z.string().trim().optional(),
  budgetRange: z.string().trim().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = leadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { name, email, company, message, serviceId, projectType, budgetRange } =
    parsed.data;

  const lead = await prisma.lead.create({
    data: {
      name,
      email,
      company: company || null,
      message,
      serviceId: serviceId || null,
      projectType: projectType || null,
      budgetRange: budgetRange || null,
    },
  });

  try {
    const settings = await prisma.siteSettings.findFirst();
    const fromName = settings?.smtpSenderName ?? settings?.agencyName ?? "Agency";

    if (settings?.contactEmail) {
      await sendMail({
        to: settings.contactEmail,
        subject: `New lead: ${name}`,
        text: [
          `Name: ${name}`,
          `Email: ${email}`,
          `Company: ${company ?? "-"}`,
          `Project type: ${projectType ?? "-"}`,
          `Budget: ${budgetRange ?? "-"}`,
          "",
          message,
        ].join("\n"),
        fromName,
      });
    }

    await sendMail({
      to: email,
      subject: "Thanks for reaching out",
      text: `Hi ${name},\n\nThanks for your message — we'll get back to you soon.\n\n${fromName}`,
      fromName,
    });
  } catch (error) {
    console.error("[leads] failed to send notification emails", error);
  }

  return NextResponse.json({ id: lead.id }, { status: 201 });
}
