import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import { leadAutoReply } from "@/lib/email-templates";
import { REGION_ENUM } from "@/lib/site/config";
import { getRegionSettings } from "@/lib/site/content";
import { countryFromRequest, localeFor, regionFromRequest } from "@/lib/site/request";

const leadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().trim().optional(),
  message: z.string().min(1),
  serviceId: z.string().optional(),
  projectType: z.string().trim().optional(),
  budgetRange: z.string().trim().optional(),
  locale: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = leadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { name, email, company, message, serviceId, projectType, budgetRange } =
    parsed.data;
  const region = regionFromRequest(request);
  const locale = localeFor(region, parsed.data.locale);
  const country = countryFromRequest(request);

  const lead = await prisma.lead.create({
    data: {
      name,
      email,
      company: company || null,
      message,
      serviceId: serviceId || null,
      projectType: projectType || null,
      budgetRange: budgetRange || null,
      region: REGION_ENUM[region],
      locale,
      country,
    },
  });

  try {
    const settings = await getRegionSettings(region);
    const fromName = settings?.smtpSenderName ?? settings?.agencyName ?? "Agency";

    if (settings?.contactEmail) {
      await sendMail({
        to: settings.contactEmail,
        subject: `[${region.toUpperCase()}] New lead: ${name}`,
        text: [
          `Site: ${region.toUpperCase()} (${locale})`,
          `Country: ${country ?? "-"}`,
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
      ...leadAutoReply({ locale, name, signature: fromName }),
      fromName,
    });
  } catch (error) {
    console.error("[leads] failed to send notification emails", error);
  }

  return NextResponse.json({ id: lead.id }, { status: 201 });
}
