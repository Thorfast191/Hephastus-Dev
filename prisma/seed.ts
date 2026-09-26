import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Localized text is { en, fr }. English is required; French is a first draft
// for review. Everything is placeholder copy to be replaced in /admin.

const SERVICES: Prisma.ServiceCreateManyInput[] = [
  {
    title: { en: "Web Development", fr: "Développement web" },
    icon: "Globe",
    description: {
      en: "[Placeholder] Custom web applications built with modern, scalable frameworks — replace this copy in /admin.",
      fr: "[Exemple] Applications web sur mesure, construites avec des frameworks modernes et évolutifs — à remplacer dans /admin.",
    },
    order: 0,
  },
  {
    title: { en: "Desktop Apps", fr: "Applications de bureau" },
    icon: "Monitor",
    description: {
      en: "[Placeholder] Cross-platform desktop software tailored to your workflow — replace this copy in /admin.",
      fr: "[Exemple] Logiciels de bureau multiplateformes adaptés à vos processus — à remplacer dans /admin.",
    },
    order: 1,
  },
  {
    title: { en: "Mobile Apps", fr: "Applications mobiles" },
    icon: "Smartphone",
    description: {
      en: "[Placeholder] Native and cross-platform mobile apps for iOS and Android — replace this copy in /admin.",
      fr: "[Exemple] Applications mobiles natives et multiplateformes pour iOS et Android — à remplacer dans /admin.",
    },
    order: 2,
  },
  {
    title: { en: "Machine Learning", fr: "Machine learning" },
    icon: "Cpu",
    description: {
      en: "[Placeholder] Predictive models and data pipelines that turn data into decisions — replace this copy in /admin.",
      fr: "[Exemple] Modèles prédictifs et pipelines de données qui transforment vos données en décisions — à remplacer dans /admin.",
    },
    order: 3,
  },
  {
    title: { en: "Deep Learning", fr: "Deep learning" },
    icon: "Network",
    description: {
      en: "[Placeholder] Neural network solutions for complex pattern recognition tasks — replace this copy in /admin.",
      fr: "[Exemple] Solutions à base de réseaux de neurones pour la reconnaissance de motifs complexes — à remplacer dans /admin.",
    },
    order: 4,
  },
  {
    title: { en: "LLM / Generative AI", fr: "LLM / IA générative" },
    icon: "Sparkles",
    description: {
      en: "[Placeholder] Custom generative AI and LLM-powered products and integrations — replace this copy in /admin.",
      fr: "[Exemple] Produits et intégrations sur mesure propulsés par l'IA générative et les LLM — à remplacer dans /admin.",
    },
    order: 5,
  },
  {
    title: { en: "Computer Vision", fr: "Vision par ordinateur" },
    icon: "Eye",
    description: {
      en: "[Placeholder] Image and video analysis systems for automation and insight — replace this copy in /admin.",
      fr: "[Exemple] Systèmes d'analyse d'images et de vidéos pour l'automatisation et l'aide à la décision — à remplacer dans /admin.",
    },
    order: 6,
  },
];

const PORTFOLIO_ITEMS: Prisma.PortfolioItemCreateManyInput[] = [
  {
    title: { en: "Placeholder Project One", fr: "Projet exemple n°1" },
    description: {
      en: "[Placeholder] A short case study description goes here — replace via /admin.",
      fr: "[Exemple] Une courte description de l'étude de cas — à remplacer dans /admin.",
    },
    images: [],
    tags: ["Next.js", "PostgreSQL"],
    externalLink: null,
    order: 0,
    featured: true,
  },
  {
    title: { en: "Placeholder Project Two", fr: "Projet exemple n°2" },
    description: {
      en: "[Placeholder] A short case study description goes here — replace via /admin.",
      fr: "[Exemple] Une courte description de l'étude de cas — à remplacer dans /admin.",
    },
    images: [],
    tags: ["Python", "TensorFlow"],
    externalLink: null,
    order: 1,
    featured: false,
  },
];

const TESTIMONIALS: Prisma.TestimonialCreateManyInput[] = [
  {
    quote: {
      en: "[Placeholder] This is where a great client quote will go — replace via /admin.",
      fr: "[Exemple] Ici figurera le témoignage d'un client satisfait — à remplacer dans /admin.",
    },
    authorName: "Placeholder Client",
    company: "Placeholder Co.",
    photo: null,
    order: 0,
  },
  {
    quote: {
      en: "[Placeholder] Another example client testimonial — replace via /admin.",
      fr: "[Exemple] Un autre exemple de témoignage client — à remplacer dans /admin.",
    },
    authorName: "Placeholder Client Two",
    company: "Placeholder Inc.",
    photo: null,
    order: 1,
  },
];

const FAQS: Prisma.FaqCreateManyInput[] = [
  {
    question: {
      en: "How long does a typical project take?",
      fr: "Combien de temps dure un projet type ?",
    },
    answer: {
      en: "[Placeholder] Describe your usual delivery timeline here — replace via /admin.",
      fr: "[Exemple] Décrivez ici vos délais de livraison habituels — à remplacer dans /admin.",
    },
    order: 0,
  },
  {
    question: {
      en: "Do you offer post-launch support?",
      fr: "Proposez-vous un accompagnement après la mise en ligne ?",
    },
    answer: {
      en: "[Placeholder] Describe your support and maintenance offering — replace via /admin.",
      fr: "[Exemple] Décrivez votre offre de support et de maintenance — à remplacer dans /admin.",
    },
    order: 1,
  },
  {
    question: {
      en: "What technologies do you work with?",
      fr: "Avec quelles technologies travaillez-vous ?",
    },
    answer: {
      en: "[Placeholder] List the stack you build on — replace via /admin.",
      fr: "[Exemple] Listez les technologies que vous utilisez — à remplacer dans /admin.",
    },
    order: 2,
  },
];

const TEAM_MEMBERS: Prisma.TeamMemberCreateManyInput[] = [
  {
    name: "Placeholder Name",
    role: { en: "Founder", fr: "Fondateur" },
    photo: null,
    bio: {
      en: "[Placeholder] Short bio goes here — replace via /admin.",
      fr: "[Exemple] Une courte biographie — à remplacer dans /admin.",
    },
    order: 0,
    active: true,
  },
  {
    name: "Placeholder Name Two",
    role: { en: "Lead Engineer", fr: "Ingénieur principal" },
    photo: null,
    bio: {
      en: "[Placeholder] Short bio goes here — replace via /admin.",
      fr: "[Exemple] Une courte biographie — à remplacer dans /admin.",
    },
    order: 1,
    active: true,
  },
];

const SHARED_SETTINGS = {
  agencyName: "[Placeholder Agency Name]",
  heroHeadline: { en: "Software that", fr: "Des logiciels qui" },
  heroHeadlineAccent: { en: "drives revenue", fr: "font croître vos revenus" },
  heroPrimaryLabel: { en: "View our work", fr: "Voir nos réalisations" },
  heroPrimaryHref: "#portfolio",
  heroSecondaryLabel: { en: "Get in touch", fr: "Nous contacter" },
  heroSecondaryHref: "#contact",
  contactEmail: "hello@example.com",
  socialLinks: {},
  smtpSenderName: "[Placeholder Agency Name]",
  slotDurationMinutes: 30,
  minNoticeHours: 24,
  bookingWindowDays: 30,
} satisfies Partial<Prisma.SiteSettingsCreateInput>;

const SETTINGS: Prisma.SiteSettingsCreateInput[] = [
  {
    ...SHARED_SETTINGS,
    region: "EU",
    tagline: {
      en: "[Placeholder] One-line value proposition — replace via /admin.",
      fr: "[Exemple] Votre proposition de valeur en une phrase — à remplacer dans /admin.",
    },
    heroEyebrow: {
      en: "[Placeholder] Full service software agency",
      fr: "[Exemple] Agence logicielle full-service",
    },
    heroSubtitle: {
      en: "[Placeholder] One or two sentences under the headline — replace via /admin.",
      fr: "[Exemple] Une ou deux phrases sous le titre — à remplacer dans /admin.",
    },
    budgetRanges: ["€5k – €10k", "€10k – €25k", "€25k – €50k", "€50k+"],
    contactPhone: "+33 1 23 45 67 89",
    businessTimezone: "Europe/Paris",
  },
  {
    ...SHARED_SETTINGS,
    region: "BD",
    tagline: { en: "[Placeholder] One-line value proposition — replace via /admin." },
    heroEyebrow: { en: "[Placeholder] Full service software agency in Dhaka" },
    heroSubtitle: {
      en: "[Placeholder] One or two sentences under the headline — replace via /admin.",
    },
    budgetRanges: ["৳50k – ৳1.5L", "৳1.5L – ৳5L", "৳5L – ৳10L", "৳10L+"],
    contactPhone: "+880 1711-000000",
    whatsapp: "+880 1711-000000",
    businessTimezone: "Asia/Dhaka",
  },
];

/** Weekday 09:00–17:00 in each region's own timezone. */
const AVAILABILITY: Prisma.AvailabilityRuleCreateManyInput[] = (["EU", "BD"] as const).flatMap(
  (region) =>
    // BD's working week is Sunday–Thursday; EU's Monday–Friday.
    (region === "BD" ? [0, 1, 2, 3, 4] : [1, 2, 3, 4, 5]).map((dayOfWeek) => ({
      region,
      dayOfWeek,
      startTime: "09:00",
      endTime: "17:00",
    }))
);

async function main() {
  for (const settings of SETTINGS) {
    await prisma.siteSettings.upsert({
      where: { region: settings.region },
      update: {},
      create: settings,
    });
  }

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

  if ((await prisma.availabilityRule.count()) === 0) {
    await prisma.availabilityRule.createMany({ data: AVAILABILITY });
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
