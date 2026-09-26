import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { signOut } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RegionSwitcher } from "@/components/admin/region-switcher";
import { ViewerProvider } from "@/components/admin/viewer-context";
import { getAdminContext } from "@/lib/admin-guard";
import { ADMIN_REGION_LABELS } from "@/lib/admin/region";
import { getAdminRegion } from "@/lib/admin/region-server";
import { isSuperAdmin, lockedRegion } from "@/lib/admin/permissions";
import { regionOrigin } from "@/lib/site/env";

const NAV: { href: string; label: string; superOnly?: boolean }[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/portfolio", label: "Portfolio" },
  { href: "/admin/testimonials", label: "Testimonials" },
  // Team members appear on both sites, so only super admins manage them.
  { href: "/admin/team", label: "Team", superOnly: true },
  { href: "/admin/faqs", label: "FAQ" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/availability", label: "Availability" },
  { href: "/admin/meetings", label: "Meetings" },
  { href: "/admin/users", label: "Admins", superOnly: true },
  { href: "/admin/account", label: "My account" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Role and region are read from the database on every request, so a
  // removed admin is shut out immediately, not when their session expires.
  const admin = await getAdminContext();

  if (!admin) {
    redirect("/admin/login");
  }

  const region = await getAdminRegion();
  const superAdmin = isSuperAdmin(admin);
  const locked = lockedRegion(admin);
  const sites = [
    { slug: "eu", enum: "EU", label: "EU site" },
    { slug: "bd", enum: "BD", label: "BD site" },
  ] as const;

  return (
    <ViewerProvider viewer={{ role: admin.role, region: admin.region }}>
      <div className="min-h-screen bg-muted/20">
        <header className="flex items-center justify-between border-b bg-background px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-medium">Admin</span>
            {superAdmin ? (
              <RegionSwitcher value={region} />
            ) : (
              <Badge variant="secondary">{ADMIN_REGION_LABELS[locked!]} admin</Badge>
            )}
            <div className="flex gap-3 text-xs text-muted-foreground">
              {sites
                .filter((site) => superAdmin || site.enum === locked)
                .map((site) => (
                  <a
                    key={site.slug}
                    href={`${regionOrigin(site.slug)}/en`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    {site.label} <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{admin.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/admin/login" });
              }}
            >
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </header>
        <nav className="flex flex-wrap gap-4 border-b bg-background px-6 py-2 text-sm">
          {NAV.filter((item) => superAdmin || !item.superOnly).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="p-6">{children}</main>
      </div>
    </ViewerProvider>
  );
}
