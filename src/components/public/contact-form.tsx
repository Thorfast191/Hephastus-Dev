"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
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
  const t = useTranslations("form");
  const locale = useLocale();

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
        locale,
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
        <p className="site-h3 text-2xl text-site-text">{t("sentTitle")}</p>
        <p className="max-w-sm text-sm text-site-muted">{t("sentBody")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2.5">
          <label htmlFor="name" className="block text-sm font-medium text-site-accent">
            {t("name")}
          </label>
          <input
            id="name"
            name="name"
            required
            className="site-field"
            placeholder={t("namePlaceholder")}
          />
        </div>
        <div className="space-y-2.5">
          <label htmlFor="email" className="block text-sm font-medium text-site-accent">
            {t("email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="site-field"
            placeholder={t("emailPlaceholder")}
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2.5">
          <label htmlFor="company" className="block text-sm font-medium text-site-accent">
            {t("company")} <span className="text-site-muted">{t("optional")}</span>
          </label>
          <input
            id="company"
            name="company"
            className="site-field"
            placeholder={t("companyPlaceholder")}
          />
        </div>
        <div className="space-y-2.5">
          <label htmlFor="serviceId" className="block text-sm font-medium text-site-accent">
            {t("projectType")}
          </label>
          <select id="serviceId" name="serviceId" className="site-field" defaultValue="">
            <option value="">{t("selectService")}</option>
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
        <legend className="text-sm font-medium text-site-accent">{t("budget")}</legend>
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
          {t("message")}
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="site-field resize-y"
          placeholder={t("messagePlaceholder")}
        />
      </div>

      {status === "error" && (
        <p className="text-sm text-red-400">{t("error")}</p>
      )}

      <Magnetic className="block w-full">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="site-pill w-full bg-white px-10 py-4.5 text-[#050505] hover:shadow-[0_20px_40px_var(--site-glow)] disabled:opacity-60"
        >
          {status === "submitting" ? t("submitting") : t("submit")}
        </button>
      </Magnetic>
    </form>
  );
}
