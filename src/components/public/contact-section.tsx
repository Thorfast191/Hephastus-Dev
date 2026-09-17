"use client";

import { useState } from "react";
import { ContactForm } from "./contact-form";
import { Scheduler } from "./scheduler";
import { Reveal } from "@/components/motion/reveal";
import { Blobs } from "@/components/motion/blobs";

const TABS = [
  { id: "message", label: "Send a message" },
  { id: "call", label: "Book a call" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ContactSection({
  services,
  budgetRanges,
}: {
  services: { id: string; title: string }[];
  budgetRanges: string[];
}) {
  const [tab, setTab] = useState<TabId>("message");

  return (
    <section id="contact" className="relative overflow-hidden px-6 py-28 sm:py-36">
      <Blobs />

      <div className="relative z-10 mx-auto max-w-4xl">
        <Reveal>
          <div className="rounded-[2rem] border border-site-border bg-site-surface p-8 backdrop-blur-xl sm:p-14">
            <div className="text-center">
              <span className="site-eyebrow">04 — Start your journey</span>
              <h2 className="site-h2 mt-4 text-site-text">Let&apos;s build something</h2>
              <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-site-muted">
                Tell us what you&apos;re working on, or grab a slot and talk it through
                with us directly.
              </p>
            </div>

            {/* Tabs rather than stacking: the form and the scheduler are each
                tall enough that together they push the card past 2000px. */}
            <div
              role="tablist"
              aria-label="Contact method"
              className="mx-auto mt-10 flex w-fit gap-1 rounded-full border border-site-border p-1.5"
            >
              {TABS.map((item) => (
                <button
                  key={item.id}
                  role="tab"
                  type="button"
                  id={`contact-tab-${item.id}`}
                  aria-selected={tab === item.id}
                  aria-controls={`contact-panel-${item.id}`}
                  onClick={() => setTab(item.id)}
                  className={`rounded-full px-6 py-2.5 text-xs font-bold uppercase tracking-[0.1em] transition-all duration-500 ease-site ${
                    tab === item.id
                      ? "bg-white text-[#050505]"
                      : "text-site-muted hover:text-site-text"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div
              className="mt-12"
              role="tabpanel"
              id={`contact-panel-${tab}`}
              aria-labelledby={`contact-tab-${tab}`}
            >
              {tab === "message" ? (
                <ContactForm services={services} budgetRanges={budgetRanges} />
              ) : (
                <Scheduler />
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
