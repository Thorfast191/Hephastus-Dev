import { prisma } from "@/lib/prisma";
import { ContactForm } from "@/components/public/contact-form";

export default async function Home() {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    select: { id: true, title: true },
  });

  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="mb-6 text-2xl font-semibold">Contact us</h1>
      <ContactForm services={services} />
    </div>
  );
}
