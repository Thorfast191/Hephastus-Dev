import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "./reveal";

export function Hero({
  agencyName,
  tagline,
}: {
  agencyName: string;
  tagline: string;
}) {
  return (
    <section id="top" className="mx-auto max-w-4xl px-6 py-24 text-center">
      <Reveal>
        <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
          {agencyName}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{tagline}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <a href="#portfolio" className={buttonVariants({ size: "lg" })}>
            View our work
          </a>
          <a href="#contact" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Get in touch
          </a>
        </div>
      </Reveal>
    </section>
  );
}
