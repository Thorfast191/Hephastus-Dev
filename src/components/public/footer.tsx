import { Reveal } from "@/components/motion/reveal";
import type { SiteSettings } from "@prisma/client";

const NAV_LINKS = [
  { href: "#services", label: "Services" },
  { href: "#portfolio", label: "Portfolio" },
  { href: "#process", label: "Process" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact" },
];

export function Footer({ settings }: { settings: SiteSettings }) {
  const socialLinks = (settings.socialLinks ?? {}) as {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };

  const socials = [
    { href: socialLinks.twitter, label: "Twitter" },
    { href: socialLinks.linkedin, label: "LinkedIn" },
    { href: socialLinks.github, label: "GitHub" },
  ].filter((s): s is { href: string; label: string } => Boolean(s.href));

  return (
    <footer id="footer" className="relative border-t border-site-border px-6">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="grid gap-12 py-20 md:grid-cols-2">
            <div>
              <p className="site-h3 text-xl text-site-text">{settings.agencyName}</p>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-site-muted">
                {settings.tagline}
              </p>
              <div className="mt-8 space-y-2 text-sm">
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="block text-site-muted transition-colors duration-500 ease-site hover:text-site-text"
                >
                  {settings.contactEmail}
                </a>
                <a
                  href={`tel:${settings.contactPhone}`}
                  className="block text-site-muted transition-colors duration-500 ease-site hover:text-site-text"
                >
                  {settings.contactPhone}
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 md:justify-items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-site-accent">
                  Navigate
                </p>
                <ul className="mt-5 space-y-3 text-sm">
                  {NAV_LINKS.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="text-site-muted transition-colors duration-500 ease-site hover:text-site-text"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {socials.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-site-accent">
                    Elsewhere
                  </p>
                  <ul className="mt-5 space-y-3 text-sm">
                    {socials.map((social) => (
                      <li key={social.label}>
                        <a
                          href={social.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-site-muted transition-colors duration-500 ease-site hover:text-site-text"
                        >
                          {social.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Reveal>

        <div className="flex flex-col gap-4 border-t border-site-border py-8 text-xs text-site-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {settings.agencyName}. All rights reserved.
          </p>
          <a
            href="/admin"
            className="transition-colors duration-500 ease-site hover:text-site-text"
          >
            Admin
          </a>
        </div>
      </div>
    </footer>
  );
}
