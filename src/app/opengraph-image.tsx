import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const alt = "Agency";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const settings = await prisma.siteSettings.findFirst();
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
    { ...size }
  );
}
