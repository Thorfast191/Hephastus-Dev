const STEPS = [
  {
    title: "Discover",
    description: "Understand your goals, constraints, and users before writing a line of code.",
  },
  {
    title: "Design",
    description: "Architect the solution and validate the approach with you before building.",
  },
  {
    title: "Build",
    description: "Iterative development with regular check-ins, not a black box until launch.",
  },
  {
    title: "Deliver",
    description: "Ship, support, and iterate based on how the product performs in the real world.",
  },
];

export function ProcessSection() {
  return (
    <section id="process" className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="font-heading text-3xl font-semibold">How we work</h2>
      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <div key={step.title}>
            <span className="text-sm font-medium text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="font-heading mt-2 text-lg font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
