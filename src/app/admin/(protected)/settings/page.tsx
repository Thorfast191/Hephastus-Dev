import { prisma } from "@/lib/prisma";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const settings = await prisma.siteSettings.findFirst();

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Site Settings</h1>
      <SettingsForm key={settings?.updatedAt.toISOString() ?? "new"} settings={settings} />
    </div>
  );
}
