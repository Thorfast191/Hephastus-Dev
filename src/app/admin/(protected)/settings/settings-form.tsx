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
      <div className="rounded-lg border p-4 space-y-4">
        <p className="text-sm font-medium">Hero section</p>
        <p className="text-xs text-muted-foreground">
          Controls the largest text on the public homepage. Leave blank to fall back to
          the agency name and tagline above.
        </p>
        <div className="space-y-2">
          <Label htmlFor="heroEyebrow">Hero eyebrow</Label>
          <Input
            id="heroEyebrow"
            name="heroEyebrow"
            defaultValue={settings?.heroEyebrow ?? ""}
            placeholder="e.g. Full service digital agency"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="heroHeadline">Headline — first part</Label>
            <Input
              id="heroHeadline"
              name="heroHeadline"
              defaultValue={settings?.heroHeadline ?? ""}
              placeholder="Software that"
            />
            <p className="text-xs text-muted-foreground">Shown in white.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="heroHeadlineAccent">Headline — highlighted part</Label>
            <Input
              id="heroHeadlineAccent"
              name="heroHeadlineAccent"
              defaultValue={settings?.heroHeadlineAccent ?? ""}
              placeholder="drives revenue"
            />
            <p className="text-xs text-muted-foreground">
              Shown in the purple highlight colour. Leave blank for a single-colour
              headline.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="heroSubtitle">Hero subtitle</Label>
          <Input
            id="heroSubtitle"
            name="heroSubtitle"
            defaultValue={settings?.heroSubtitle ?? ""}
            placeholder="One or two sentences under the headline."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="heroPrimaryLabel">Main button text</Label>
            <Input
              id="heroPrimaryLabel"
              name="heroPrimaryLabel"
              defaultValue={settings?.heroPrimaryLabel ?? ""}
              placeholder="View our work"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="heroPrimaryHref">Main button link</Label>
            <Input
              id="heroPrimaryHref"
              name="heroPrimaryHref"
              defaultValue={settings?.heroPrimaryHref ?? ""}
              placeholder="#portfolio"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="heroSecondaryLabel">Second button text</Label>
            <Input
              id="heroSecondaryLabel"
              name="heroSecondaryLabel"
              defaultValue={settings?.heroSecondaryLabel ?? ""}
              placeholder="Get in touch"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="heroSecondaryHref">Second button link</Label>
            <Input
              id="heroSecondaryHref"
              name="heroSecondaryHref"
              defaultValue={settings?.heroSecondaryHref ?? ""}
              placeholder="#contact"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Button links can point to a section on this page (such as{" "}
          <code>#portfolio</code>) or to a full web address.
        </p>
      </div>

      <div className="rounded-lg border p-4 space-y-4">
        <p className="text-sm font-medium">Contact form</p>
        <div className="space-y-2">
          <Label htmlFor="budgetRanges">Budget options</Label>
          <Input
            id="budgetRanges"
            name="budgetRanges"
            defaultValue={settings?.budgetRanges.join(", ") ?? ""}
            placeholder="$5k – $10k, $10k – $25k, $25k – $50k, $50k+"
          />
          <p className="text-xs text-muted-foreground">
            Separate each option with a comma. These appear as the budget buttons on
            the contact form. Leave blank to hide the budget question entirely.
          </p>
        </div>
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
