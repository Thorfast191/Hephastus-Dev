import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="flex items-center justify-between border-b bg-background px-6 py-4">
        <span className="font-medium">Admin</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {session.user?.email}
          </span>
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
      <nav className="flex gap-4 border-b bg-background px-6 py-2 text-sm">
        <a href="/admin" className="text-muted-foreground hover:text-foreground">
          Dashboard
        </a>
        <a
          href="/admin/services"
          className="text-muted-foreground hover:text-foreground"
        >
          Services
        </a>
        <a
          href="/admin/portfolio"
          className="text-muted-foreground hover:text-foreground"
        >
          Portfolio
        </a>
        <a
          href="/admin/testimonials"
          className="text-muted-foreground hover:text-foreground"
        >
          Testimonials
        </a>
        <a
          href="/admin/team"
          className="text-muted-foreground hover:text-foreground"
        >
          Team
        </a>
        <a
          href="/admin/settings"
          className="text-muted-foreground hover:text-foreground"
        >
          Settings
        </a>
        <a
          href="/admin/leads"
          className="text-muted-foreground hover:text-foreground"
        >
          Leads
        </a>
        <a
          href="/admin/availability"
          className="text-muted-foreground hover:text-foreground"
        >
          Availability
        </a>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
