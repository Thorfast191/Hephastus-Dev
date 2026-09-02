import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-heading text-6xl font-bold">404</p>
      <h1 className="text-xl font-semibold">This page doesn&apos;t exist</h1>
      <p className="max-w-sm text-muted-foreground">
        The page you&apos;re looking for may have been moved or removed.
      </p>
      <Link href="/" className={buttonVariants({ variant: "default" })}>
        Back to home
      </Link>
    </main>
  );
}
