"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Status = "loading" | "ready" | "booking" | "booked" | "error";

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
    () => new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }),
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
      <p className="text-muted-foreground">
        Meeting confirmed — check your email for the calendar invite.
      </p>
    );
  }

  if (status === "loading") {
    return <p className="text-muted-foreground">Loading availability...</p>;
  }

  if (slots.length === 0) {
    return (
      <p className="text-muted-foreground">
        No open slots right now — please check back soon.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {dayGroups.map((day) => (
          <Button
            key={day.key}
            type="button"
            variant={activeDay?.key === day.key ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectedDay(day.key);
              setSelectedSlot(null);
            }}
          >
            {day.label}
          </Button>
        ))}
      </div>
      {activeDay && (
        <div className="flex flex-wrap gap-2">
          {activeDay.slots.map((slot) => (
            <Button
              key={slot.toISOString()}
              type="button"
              variant={selectedSlot?.getTime() === slot.getTime() ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSlot(slot)}
            >
              {timeFormatter.format(slot)}
            </Button>
          ))}
        </div>
      )}
      {selectedSlot && (
        <form onSubmit={handleBook} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meeting-name">Name</Label>
            <Input id="meeting-name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meeting-email">Email</Label>
            <Input id="meeting-email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meeting-topic">Topic</Label>
            <Textarea id="meeting-topic" name="topic" required />
          </div>
          <Button type="submit" className="w-full" disabled={status === "booking"}>
            {status === "booking" ? "Booking..." : `Book ${timeFormatter.format(selectedSlot)}`}
          </Button>
        </form>
      )}
    </div>
  );
}
