"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Magnetic } from "@/components/motion/magnetic";

export function ContactForm({
  services,
  budgetRanges,
}: {
  services: { id: string; title: string }[];
  /** Managed in admin under Settings, so price bands never need a code change. */
  budgetRanges: string[];
}) {
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");
  const [budget, setBudget] = useState<string>("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const serviceId = String(formData.get("serviceId") ?? "");

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        company: formData.get("company"),
        message: formData.get("message"),
        serviceId: serviceId || undefined,
        projectType:
          services.find((s) => s.id === serviceId)?.title || undefined,
        budgetRange: budget || undefined,
      }),
    });

    if (response.ok) {
      setStatus("sent");
      form.reset();
      setBudget("");
    } else {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <CheckCircle2 className="h-12 w-12 text-site-accent" />
        <p className="site-h3 text-2xl text-site-text">Message received</p>
        <p className="max-w-sm text-sm text-site-muted">
          Thanks for reaching out — we&apos;ll get back to you shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2.5">
          <label htmlFor="name" className="block text-sm font-medium text-site-accent">
            Full name
          </label>
          <input id="name" name="name" required className="site-field" placeholder="Jane Doe" />
        </div>
        <div className="space-y-2.5">
          <label htmlFor="email" className="block text-sm font-medium text-site-accent">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="site-field"
            placeholder="jane@example.com"
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2.5">
          <label htmlFor="company" className="block text-sm font-medium text-site-accent">
            Company <span className="text-site-muted">(optional)</span>
          </label>
          <input id="company" name="company" className="site-field" placeholder="Acme Inc." />
        </div>
        <div className="space-y-2.5">
          <label htmlFor="serviceId" className="block text-sm font-medium text-site-accent">
            Project type
          </label>
          <select id="serviceId" name="serviceId" className="site-field" defaultValue="">
            <option value="">Select a service</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {budgetRanges.length > 0 && (
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-site-accent">Budget range</legend>
        <div className="flex flex-wrap gap-3">
          {budgetRanges.map((option) => {
            const active = budget === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => setBudget(active ? "" : option)}
                className={`rounded-full border px-5 py-2.5 text-sm transition-all duration-500 ease-site ${
                  active
                    ? "border-site-accent bg-[rgb(99_102_241/0.18)] text-site-text"
                    : "border-site-border text-site-muted hover:border-site-border-strong hover:text-site-text"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </fieldset>
      )}

      <div className="space-y-2.5">
        <label htmlFor="message" className="block text-sm font-medium text-site-accent">
          Project vision
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="site-field resize-y"
          placeholder="Tell us about the problem you're solving and the impact you want to create..."
        />
      </div>

      {status === "error" && (
        <p className="text-sm text-red-400">Something went wrong — please try again.</p>
      )}

      <Magnetic className="block w-full">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="site-pill w-full bg-white px-10 py-4.5 text-[#050505] hover:shadow-[0_20px_40px_var(--site-glow)] disabled:opacity-60"
        >
          {status === "submitting" ? "Sending…" : "Initiate project"}
        </button>
      </Magnetic>
    </form>
  );
}
