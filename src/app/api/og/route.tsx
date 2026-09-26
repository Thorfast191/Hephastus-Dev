import { ImageResponse } from "next/og";
import { localeFor, regionFromRequest } from "@/lib/site/request";
import { getSettingsView } from "@/lib/site/content";

/**
 * Social-share image for each site, at `<region host>/api/og?locale=fr`.
 *
 * A route handler rather than an `opengraph-image.tsx` file: Next builds that
 * file's URL from the internal route path (`/eu/fr/opengraph-image`), which
 * the host rewrite would turn into a 404. `/api/*` passes through the
 * middleware untouched, tagged with the calling region.
 */
export const runtime = "nodejs";

const size = { width: 1200, height: 630 };

export async function GET(request: Request) {
  const region = regionFromRequest(request);
  const locale = localeFor(region, new URL(request.url).searchParams.get("locale"));
  const settings = await getSettingsView(region, locale);
  const agencyName = settings?.agencyName ?? "Agency";
  const tagline = settings?.tagline ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1a1530",
          color: "#f5f3ff",
          padding: "80px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 700, display: "flex" }}>{agencyName}</div>
        {tagline && (
          <div style={{ fontSize: 32, marginTop: 24, color: "#c4b5fd", display: "flex" }}>
            {tagline}
          </div>
        )}
      </div>
    ),
    {
      ...size,
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
    }
  );
}
