import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin-guard";
import { ADMIN_REGION_LABELS } from "@/lib/admin/region";
import { ROLE_LABELS } from "@/lib/admin/permissions";
import { NameForm, PasswordForm } from "./account-forms";

export default async function AccountPage() {
  const me = await getAdminContext();
  if (!me) redirect("/admin/login");

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My account</h1>
        <p className="text-sm text-muted-foreground">
          {me.email} · {ROLE_LABELS[me.role]}
          {me.region && ` · ${ADMIN_REGION_LABELS[me.region]}`}
        </p>
      </div>
      <NameForm name={me.name} />
      <PasswordForm />
    </div>
  );
}
