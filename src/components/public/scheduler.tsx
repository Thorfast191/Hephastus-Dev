"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { Magnetic } from "@/components/motion/magnetic";

type Status = "loading" | "ready" | "booking" | "booked" | "error";

/** Shared look for the day and time chips. */
function chipClass(active: boolean) {
  return `rounded-full border px-5 py-2.5 text-sm transition-all duration-500 ease-site ${
    active
      ? "border-site-accent bg-[rgb(99_102_241/0.18)] text-site-text"
      : "border-site-border text-site-muted hover:border-site-border-strong hover:text-site-text"
  }`;
}

export function Scheduler() {
  const [slots, setSlots] = useState<Date[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);

  async function loadSlots() {
    setStatus("loading");
    setError(null);
    try {
      const response = await fetch("/api/meetings/availability");
      const data = await response.json();
      setSlots((data.slots as string[]).map((s) => new Date(s)));
      setStatus("ready");
    } catch {
      setError("Couldn't load availability. Please try again.");
      setStatus("error");
    }
  }

  useEffect(() => {
    loadSlots();
  }, []);

  const dayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    []
  );
  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }),
    []
  );

  const dayGroups = useMemo(() => {
    const groups = new Map<string, Date[]>();
    for (const slot of slots) {
      const key = slot.toDateString();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(slot);
    }
    return Array.from(groups.entries()).map(([key, daySlots]) => ({
      key,
      label: dayFormatter.format(daySlots[0]),
      slots: daySlots,
    }));
  }, [slots, dayFormatter]);

  const activeDay = dayGroups.find((d) => d.key === selectedDay) ?? dayGroups[0];

  async function handleBook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSlot) return;
    setStatus("booking");
    setError(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/meetings/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledAt: selectedSlot.toISOString(),
        name: formData.get("name"),
        email: formData.get("email"),
        topic: formData.get("topic"),
      }),
    });

    if (response.ok) {
      setStatus("booked");
      return;
    }

    const data = await response.json().catch(() => ({}));
    setError(data.error ?? "Something went wrong — please try again.");
    setSelectedSlot(null);
    await loadSlots();
  }

  if (status === "booked") {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <CalendarCheck className="h-12 w-12 text-site-accent" />
        <p className="site-h3 text-2xl text-site-text">Meeting confirmed</p>
        <p className="max-w-sm text-sm text-site-muted">
          Check your email for the calendar invite.
        </p>
      </div>
    );
  }

  if (status === "loading") {
    return <p className="py-12 text-center text-sm text-site-muted">Loading availability…</p>;
  }

  if (slots.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-site-muted">
        No open slots right now — please check back soon.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="space-y-3">
        <p className="text-sm font-medium text-site-accent">Pick a day</p>
        <div className="flex flex-wrap gap-3">
          {dayGroups.map((day) => (
            <button
              key={day.key}
              type="button"
              className={chipClass(activeDay?.key === day.key)}
              onClick={() => {
                setSelectedDay(day.key);
                setSelectedSlot(null);
              }}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {activeDay && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-site-accent">Pick a time</p>
          <div className="flex flex-wrap gap-3">
            {activeDay.slots.map((slot) => (
              <button
                key={slot.toISOString()}
                type="button"
                className={chipClass(selectedSlot?.getTime() === slot.getTime())}
                onClick={() => setSelectedSlot(slot)}
              >
                {timeFormatter.format(slot)}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedSlot && (
        <form onSubmit={handleBook} className="space-y-6 border-t border-site-border pt-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2.5">
              <label
                htmlFor="meeting-name"
                className="block text-sm font-medium text-site-accent"
              >
                Full name
              </label>
              <input id="meeting-name" name="name" required className="site-field" />
            </div>
            <div className="space-y-2.5">
              <label
                htmlFor="meeting-email"
                className="block text-sm font-medium text-site-accent"
              >
                Email address
              </label>
              <input
                id="meeting-email"
                name="email"
                type="email"
                required
                className="site-field"
              />
            </div>
          </div>
          <div className="space-y-2.5">
            <label
              htmlFor="meeting-topic"
              className="block text-sm font-medium text-site-accent"
            >
              What would you like to discuss?
            </label>
            <textarea
              id="meeting-topic"
              name="topic"
              required
              rows={4}
              className="site-field resize-y"
            />
          </div>

          <Magnetic className="block w-full">
            <button
              type="submit"
              disabled={status === "booking"}
              className="site-pill w-full bg-white px-10 py-4.5 text-[#050505] hover:shadow-[0_20px_40px_var(--site-glow)] disabled:opacity-60"
            >
              {status === "booking"
                ? "Booking…"
                : `Book ${timeFormatter.format(selectedSlot)}`}
            </button>
          </Magnetic>
        </form>
      )}
    </div>
  );
}
