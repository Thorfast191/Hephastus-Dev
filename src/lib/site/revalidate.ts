import { revalidatePath } from "next/cache";

/**
 * Drop every cached public page after an admin edit.
 *
 * This revalidates by route *pattern*, not by URL. Cached pages are tagged with
 * the public path the visitor requested (`/fr`) — the path before the
 * middleware's host rewrite to `/eu/fr` — so `revalidatePath("/eu/fr")` never
 * matches, and a URL like `/en` would be ambiguous between eu. and bd. anyway.
 * The layout pattern is shared by every region/locale variant.
 */
export function revalidatePublicSite() {
  revalidatePath("/(site)/[region]/[locale]", "layout");
}
