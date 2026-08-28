import type { SiteSettings } from "@prisma/client";

export function Footer({ settings }: { settings: SiteSettings }) {
  const socialLinks = (settings.socialLinks ?? {}) as {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };

  return (
    <footer id="footer" className="border-t">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="font-medium text-foreground">{settings.agencyName}</p>
          <p>
            <a href={`mailto:${settings.contactEmail}`} className="hover:text-foreground">
              {settings.contactEmail}
            </a>
            {" · "}
            <a href={`tel:${settings.contactPhone}`} className="hover:text-foreground">
              {settings.contactPhone}
            </a>
          </p>
        </div>
        <div className="flex items-center gap-4">
          {socialLinks.twitter && (
            <a
              href={socialLinks.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              Twitter
            </a>
          )}
          {socialLinks.linkedin && (
            <a
              href={socialLinks.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              LinkedIn
            </a>
          )}
          {socialLinks.github && (
            <a
              href={socialLinks.github}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              GitHub
            </a>
          )}
        </div>
      </div>
      <p className="border-t px-6 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {settings.agencyName}. All rights reserved.
      </p>
    </footer>
  );
}
