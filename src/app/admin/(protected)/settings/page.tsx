import { prisma } from "@/lib/prisma";
import { getAdminRegion } from "@/lib/admin/region-server";
import { ADMIN_REGION_LABELS } from "@/lib/admin/region";
import { RegionRequired } from "@/components/admin/region-required";
import { SettingsForm } from "./settings-form";

/** Every IANA zone the runtime knows, plus the saved one if it's an alias (e.g. UTC). */
function timezoneOptions(current: string | undefined) {
  const zones = Intl.supportedValuesOf("timeZone");
  return current && !zones.includes(current) ? [current, ...zones] : zones;
}

export default async function SettingsPage() {
  const region = await getAdminRegion();

  if (region === "ALL") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Site Settings</h1>
        <RegionRequired what="settings (hero text, contact details, prices, booking hours)" />
      </div>
    );
  }

  const settings = await prisma.siteSettings.findUnique({ where: { region } });

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">
        Site Settings — {ADMIN_REGION_LABELS[region]}
      </h1>
      <SettingsForm
        key={`${region}-${settings?.updatedAt.toISOString() ?? "new"}`}
        region={region}
        settings={settings}
        timezones={timezoneOptions(settings?.businessTimezone)}
      />
    </div>
  );
}
