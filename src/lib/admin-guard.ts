import { auth } from "@/auth";

/**
 * Guard for admin-only Server Actions. The `(protected)` layout only guards
 * *page renders* — Server Actions are POST endpoints that can be invoked
 * directly, so every mutating action must assert a session itself.
 */
export async function assertAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}
