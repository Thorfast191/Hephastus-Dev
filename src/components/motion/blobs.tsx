/**
 * Two oversized, heavily-blurred gradient circles drifting behind the content.
 * They are what stop a near-black page from reading as flat.
 *
 * Deliberately not a client component: the drift is pure CSS keyframes, so
 * this ships no JavaScript. `prefers-reduced-motion` freezes them in globals.css.
 */
export function Blobs({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div className="site-blob site-blob-a -top-[20vw] -left-[15vw]" />
      <div className="site-blob site-blob-b -bottom-[25vw] -right-[20vw]" />
    </div>
  );
}
