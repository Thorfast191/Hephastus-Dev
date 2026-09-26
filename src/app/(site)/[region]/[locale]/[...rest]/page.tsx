import { notFound } from "next/navigation";

/**
 * Any unknown path under a site (`eu.<domain>/fr/nope`) lands here so the
 * 404 renders inside the site layout — in the visitor's language — rather
 * than as the framework's unstyled default.
 */
export default function CatchAll() {
  notFound();
}
