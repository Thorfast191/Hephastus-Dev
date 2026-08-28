const LINKS = [
  { href: "#services", label: "Services" },
  { href: "#portfolio", label: "Portfolio" },
  { href: "#team", label: "Team" },
  { href: "#contact", label: "Contact" },
];

export function SiteNav({ agencyName }: { agencyName: string }) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <a href="#top" className="font-semibold">
          {agencyName}
        </a>
        <div className="flex flex-wrap gap-6 text-sm">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>
      </nav>
    </header>
  );
}
