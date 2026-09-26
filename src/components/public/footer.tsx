import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/motion/reveal";
import type { SettingsView } from "@/lib/site/content";

const NAV_LINKS = [
  { href: "#services", key: "services" },
  { href: "#portfolio", key: "portfolio" },
  { href: "#process", key: "process" },
  { href: "#faq", key: "faq" },
  { href: "#contact", key: "contact" },
] as const;

export async function Footer({
  settings,
  adminUrl,
}: {
  settings: SettingsView;
  /** The admin lives on its own subdomain, so this has to be absolute. */
  adminUrl: string;
}) {
  const [t, tNav] = await Promise.all([getTranslations("footer"), getTranslations("nav")]);
  const socialLinks = settings.socialLinks;

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
                {settings.whatsapp && (
                  <a
                    href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-site-muted transition-colors duration-500 ease-site hover:text-site-text"
                  >
                    {t("whatsapp")} · {settings.whatsapp}
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 md:justify-items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-site-accent">
                  {t("navigate")}
                </p>
                <ul className="mt-5 space-y-3 text-sm">
                  {NAV_LINKS.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="text-site-muted transition-colors duration-500 ease-site hover:text-site-text"
                      >
                        {tNav(link.key)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {socials.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-site-accent">
                    {t("elsewhere")}
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
          <p>{t("rights", { year: new Date().getFullYear(), agency: settings.agencyName })}</p>
          <a
            href={`${adminUrl}/admin`}
            className="transition-colors duration-500 ease-site hover:text-site-text"
          >
            Admin
          </a>
        </div>
      </div>
    </footer>
  );
}
