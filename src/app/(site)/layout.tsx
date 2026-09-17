import { Cursor } from "@/components/motion/cursor";

/**
 * Shell for the public marketing site.
 *
 * `.site-root` carries the dark palette. It is applied here rather than through
 * next-themes so the admin panel's light/dark toggle — which writes `.dark` to
 * <html> — cannot affect the public site in either direction.
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="site-root min-h-screen font-sans">
      <Cursor />
      {children}
    </div>
  );
}
