import { ContactForm } from "./contact-form";
import { Scheduler } from "./scheduler";

export function ContactSection({
  services,
}: {
  services: { id: string; title: string }[];
}) {
  return (
    <section id="contact" className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="font-heading text-3xl font-semibold">Get in touch</h2>
      <div className="mt-8 grid gap-12 lg:grid-cols-2">
        <div>
          <h3 className="font-heading text-lg font-medium">Send a message</h3>
          <div className="mt-4">
            <ContactForm services={services} />
          </div>
        </div>
        <div>
          <h3 className="font-heading text-lg font-medium">Book a meeting</h3>
          <div className="mt-4">
            <Scheduler />
          </div>
        </div>
      </div>
    </section>
  );
}
