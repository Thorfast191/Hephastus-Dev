import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SERVICES: Prisma.ServiceCreateManyInput[] = [
  {
    title: "Web Development",
    icon: "Globe",
    description:
      "[Placeholder] Custom web applications built with modern, scalable frameworks — replace this copy in /admin.",
    order: 0,
  },
  {
    title: "Desktop Apps",
    icon: "Monitor",
    description:
      "[Placeholder] Cross-platform desktop software tailored to your workflow — replace this copy in /admin.",
    order: 1,
  },
  {
    title: "Mobile Apps",
    icon: "Smartphone",
    description:
      "[Placeholder] Native and cross-platform mobile apps for iOS and Android — replace this copy in /admin.",
    order: 2,
  },
  {
    title: "Machine Learning",
    icon: "Cpu",
    description:
      "[Placeholder] Predictive models and data pipelines that turn data into decisions — replace this copy in /admin.",
    order: 3,
  },
  {
    title: "Deep Learning",
    icon: "Network",
    description:
      "[Placeholder] Neural network solutions for complex pattern recognition tasks — replace this copy in /admin.",
    order: 4,
  },
  {
    title: "LLM / Generative AI",
    icon: "Sparkles",
    description:
      "[Placeholder] Custom generative AI and LLM-powered products and integrations — replace this copy in /admin.",
    order: 5,
  },
  {
    title: "Computer Vision",
    icon: "Eye",
    description:
      "[Placeholder] Image and video analysis systems for automation and insight — replace this copy in /admin.",
    order: 6,
  },
];

const PORTFOLIO_ITEMS: Prisma.PortfolioItemCreateManyInput[] = [
  {
    title: "Placeholder Project One",
    description:
      "[Placeholder] A short case study description goes here — replace via /admin.",
    images: [],
    tags: ["Next.js", "PostgreSQL"],
    externalLink: null,
    order: 0,
    featured: true,
  },
  {
    title: "Placeholder Project Two",
    description:
      "[Placeholder] A short case study description goes here — replace via /admin.",
    images: [],
    tags: ["Python", "TensorFlow"],
    externalLink: null,
    order: 1,
    featured: false,
  },
];

const TESTIMONIALS: Prisma.TestimonialCreateManyInput[] = [
  {
    quote:
      "[Placeholder] This is where a great client quote will go — replace via /admin.",
    authorName: "Placeholder Client",
    company: "Placeholder Co.",
    photo: null,
    order: 0,
  },
  {
    quote:
      "[Placeholder] Another example client testimonial — replace via /admin.",
    authorName: "Placeholder Client Two",
    company: "Placeholder Inc.",
    photo: null,
    order: 1,
  },
];

const FAQS: Prisma.FaqCreateManyInput[] = [
  {
    question: "How long does a typical project take?",
    answer:
      "[Placeholder] Describe your usual delivery timeline here — replace via /admin.",
    order: 0,
  },
  {
    question: "Do you offer post-launch support?",
    answer:
      "[Placeholder] Describe your support and maintenance offering — replace via /admin.",
    order: 1,
  },
  {
    question: "What technologies do you work with?",
    answer:
      "[Placeholder] List the stack you build on — replace via /admin.",
    order: 2,
  },
];

const TEAM_MEMBERS: Prisma.TeamMemberCreateManyInput[] = [
  {
    name: "Placeholder Name",
    role: "Founder",
    photo: null,
    bio: "[Placeholder] Short bio goes here — replace via /admin.",
    order: 0,
    active: true,
  },
  {
    name: "Placeholder Name Two",
    role: "Lead Engineer",
    photo: null,
    bio: "[Placeholder] Short bio goes here — replace via /admin.",
    order: 1,
    active: true,
  },
];

async function main() {
  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      agencyName: "[Placeholder Agency Name]",
      tagline: "[Placeholder] One-line value proposition — replace via /admin.",
      heroEyebrow: "[Placeholder] Full service software agency",
      heroHeadline: "Software that",
      heroHeadlineAccent: "drives revenue",
      heroPrimaryLabel: "View our work",
      heroPrimaryHref: "#portfolio",
      heroSecondaryLabel: "Get in touch",
      heroSecondaryHref: "#contact",
      budgetRanges: ["$5k – $10k", "$10k – $25k", "$25k – $50k", "$50k+"],
      heroSubtitle:
        "[Placeholder] One or two sentences under the headline — replace via /admin.",
      contactEmail: "hello@example.com",
      contactPhone: "+1 (555) 555-5555",
      socialLinks: {},
      smtpSenderName: "[Placeholder Agency Name]",
      businessTimezone: "UTC",
      slotDurationMinutes: 30,
      minNoticeHours: 24,
      bookingWindowDays: 30,
    },
  });

  if ((await prisma.service.count()) === 0) {
    await prisma.service.createMany({ data: SERVICES });
  }

  if ((await prisma.portfolioItem.count()) === 0) {
    await prisma.portfolioItem.createMany({ data: PORTFOLIO_ITEMS });
  }

  if ((await prisma.testimonial.count()) === 0) {
    await prisma.testimonial.createMany({ data: TESTIMONIALS });
  }

  if ((await prisma.faq.count()) === 0) {
    await prisma.faq.createMany({ data: FAQS });
  }

  if ((await prisma.teamMember.count()) === 0) {
    await prisma.teamMember.createMany({ data: TEAM_MEMBERS });
  }

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
