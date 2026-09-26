import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminPage } from "@/lib/admin-guard";
import { AdminFormDialog } from "./admin-dialogs";
import { AdminTable } from "./admin-table";

export default async function AdminsPage() {
  const me = await requireSuperAdminPage();
  const admins = await prisma.adminUser.findMany({
    select: { id: true, name: true, email: true, role: true, region: true, createdAt: true },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admins</h1>
          <p className="text-sm text-muted-foreground">
            Super admins manage both sites. Region admins see only their own site.
          </p>
        </div>
        <AdminFormDialog>
          <Plus className="mr-2 h-4 w-4" />
          Add admin
        </AdminFormDialog>
      </div>
      <AdminTable admins={admins} currentId={me.id} />
    </div>
  );
}
