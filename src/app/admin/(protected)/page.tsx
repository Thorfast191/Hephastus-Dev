import { auth } from "@/auth";

export default async function AdminDashboardPage() {
  const session = await auth();

  return (
    <div>
      <h1 className="text-2xl font-semibold">
        Welcome, {session?.user?.name}
      </h1>
      <p className="mt-2 text-muted-foreground">
        The dashboard will show recent leads and meetings once those
        features are built.
      </p>
    </div>
  );
}
