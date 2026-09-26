"use client";

import type { Region, SiteSettings } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalizedField } from "@/components/admin/localized-field";
import { REGION_LOCALES, regionSlugFromEnum } from "@/lib/site/config";
import { updateSettings } from "./actions";

const EXAMPLES: Record<Region, { budgets: string; timezone: string; whatsapp: string }> = {
  EU: {
    budgets: "€5k – €10k, €10k – €25k, €25k – €50k, €50k+",
    timezone: "Europe/Paris",
    whatsapp: "+33 6 12 34 56 78",
  },
  BD: {
    budgets: "৳50k – ৳1.5L, ৳1.5L – ৳5L, ৳5L – ৳10L, ৳10L+",
    timezone: "Asia/Dhaka",
    whatsapp: "+880 1711-000000",
  },
};

export function SettingsForm({
  region,
  settings,
  timezones,
}: {
  region: Region;
  settings: SiteSettings | null;
  /** Built on the server: the browser's own list can differ and break hydration. */
  timezones: string[];
}) {
  const socialLinks = (settings?.socialLinks as Record<string, string> | null) ?? {};
  const locales = REGION_LOCALES[regionSlugFromEnum(region)];
  const examples = EXAMPLES[region];

  return (
    <form action={updateSettings.bind(null, region)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="agencyName">Agency name</Label>
        <Input id="agencyName" name="agencyName" defaultValue={settings?.agencyName} required />
      </div>
      <LocalizedField
        name="tagline"
        label="Tagline"
        value={settings?.tagline}
        locales={locales}
        required
      />

      <div className="rounded-lg border p-4 space-y-4">
        <p className="text-sm font-medium">Hero section</p>
        <p className="text-xs text-muted-foreground">
          Controls the largest text on this site&apos;s homepage. Leave blank to fall back
          to the agency name and tagline above.
        </p>
        <LocalizedField
          name="heroEyebrow"
          label="Hero eyebrow"
          value={settings?.heroEyebrow}
          locales={locales}
          placeholder="e.g. Full service digital agency"
        />
        <LocalizedField
          name="heroHeadline"
          label="Headline — first part"
          value={settings?.heroHeadline}
          locales={locales}
          placeholder="Software that"
          hint="Shown in white."
        />
        <LocalizedField
          name="heroHeadlineAccent"
          label="Headline — highlighted part"
          value={settings?.heroHeadlineAccent}
          locales={locales}
          placeholder="drives revenue"
          hint="Shown in the purple highlight colour. Leave blank for a single-colour headline."
        />
        <LocalizedField
          name="heroSubtitle"
          label="Hero subtitle"
          value={settings?.heroSubtitle}
          locales={locales}
          multiline
          rows={2}
          placeholder="One or two sentences under the headline."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <LocalizedField
            name="heroPrimaryLabel"
            label="Main button text"
            value={settings?.heroPrimaryLabel}
            locales={locales}
            placeholder="View our work"
          />
          <div className="space-y-2">
            <Label htmlFor="heroPrimaryHref">Main button link</Label>
            <Input
              id="heroPrimaryHref"
              name="heroPrimaryHref"
              defaultValue={settings?.heroPrimaryHref ?? ""}
              placeholder="#portfolio"
            />
          </div>
          <LocalizedField
            name="heroSecondaryLabel"
            label="Second button text"
            value={settings?.heroSecondaryLabel}
            locales={locales}
            placeholder="Get in touch"
          />
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
        <p className="text-sm font-medium">Contact</p>
        <div className="space-y-2">
          <Label htmlFor="budgetRanges">Budget options</Label>
          <Input
            id="budgetRanges"
            name="budgetRanges"
            defaultValue={settings?.budgetRanges.join(", ") ?? ""}
            placeholder={examples.budgets}
          />
          <p className="text-xs text-muted-foreground">
            In this site&apos;s currency. Separate each option with a comma. Leave blank to
            hide the budget question entirely.
          </p>
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
          <p className="text-xs text-muted-foreground">
            Lead and meeting notifications from this site go here.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactPhone">Contact phone</Label>
          <Input
            id="contactPhone"
            name="contactPhone"
            defaultValue={settings?.contactPhone}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="whatsapp">WhatsApp number</Label>
          <Input
            id="whatsapp"
            name="whatsapp"
            defaultValue={settings?.whatsapp ?? ""}
            placeholder={examples.whatsapp}
          />
          <p className="text-xs text-muted-foreground">
            With country code. When set, a &ldquo;Chat on WhatsApp&rdquo; button appears in
            the contact section and footer. Leave blank to hide it.
          </p>
        </div>
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
        <Label htmlFor="smtpSenderName">Email sender name</Label>
        <Input
          id="smtpSenderName"
          name="smtpSenderName"
          defaultValue={settings?.smtpSenderName}
          required
        />
      </div>

      <div className="rounded-lg border p-4 space-y-4">
        <p className="text-sm font-medium">Booking</p>
        <div className="space-y-2">
          <Label htmlFor="businessTimezone">Business timezone</Label>
          {/* A list rather than free text: a typo'd zone would break booking. */}
          <select
            id="businessTimezone"
            name="businessTimezone"
            defaultValue={settings?.businessTimezone ?? examples.timezone}
            required
            className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            {timezones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            This site&apos;s weekly availability hours are read in this timezone.
          </p>
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
      </div>
      <Button type="submit">Save changes</Button>
    </form>
  );
}
