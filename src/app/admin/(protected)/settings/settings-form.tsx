"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSettings } from "./actions";
import type { SiteSettings } from "@prisma/client";

export function SettingsForm({ settings }: { settings: SiteSettings | null }) {
  const socialLinks = (settings?.socialLinks as Record<string, string> | null) ?? {};

  return (
    <form action={updateSettings} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="agencyName">Agency name</Label>
        <Input id="agencyName" name="agencyName" defaultValue={settings?.agencyName} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tagline">Tagline</Label>
        <Input id="tagline" name="tagline" defaultValue={settings?.tagline} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contactEmail">Contact email</Label>
        <Input
          id="contactEmail"
          name="contactEmail"
          type="email"
          defaultValue={settings?.contactEmail}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contactPhone">Contact phone</Label>
        <Input id="contactPhone" name="contactPhone" defaultValue={settings?.contactPhone} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="twitter">Twitter/X URL</Label>
        <Input id="twitter" name="twitter" defaultValue={socialLinks.twitter ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="linkedin">LinkedIn URL</Label>
        <Input id="linkedin" name="linkedin" defaultValue={socialLinks.linkedin ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="github">GitHub URL</Label>
        <Input id="github" name="github" defaultValue={socialLinks.github ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="smtpSenderName">SMTP sender name</Label>
        <Input
          id="smtpSenderName"
          name="smtpSenderName"
          defaultValue={settings?.smtpSenderName}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="businessTimezone">Business timezone (IANA name)</Label>
        <Input
          id="businessTimezone"
          name="businessTimezone"
          defaultValue={settings?.businessTimezone}
          placeholder="e.g. America/New_York"
          required
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="slotDurationMinutes">Slot duration (min)</Label>
          <Input
            id="slotDurationMinutes"
            name="slotDurationMinutes"
            type="number"
            min={5}
            defaultValue={settings?.slotDurationMinutes ?? 30}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minNoticeHours">Min notice (hrs)</Label>
          <Input
            id="minNoticeHours"
            name="minNoticeHours"
            type="number"
            min={0}
            defaultValue={settings?.minNoticeHours ?? 24}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bookingWindowDays">Booking window (days)</Label>
          <Input
            id="bookingWindowDays"
            name="bookingWindowDays"
            type="number"
            min={1}
            defaultValue={settings?.bookingWindowDays ?? 30}
            required
          />
        </div>
      </div>
      <Button type="submit">Save changes</Button>
    </form>
  );
}
