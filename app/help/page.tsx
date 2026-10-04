import Link from "next/link";

const STEPS = [
  {
    n: 1,
    title: "Import a recipe",
    body: "Paste a YouTube link on the Video page. Nouri structures the ingredients, steps and estimated nutrition for you to review.",
    href: "/",
    cta: "Go to Video",
  },
  {
    n: 2,
    title: "Plan it on the calendar",
    body: "Add the recipe to any day and meal. Switch between Day, Week, Month and Agenda views to see your plan.",
    href: "/calendar",
    cta: "Open Calendar",
  },
  {
    n: 3,
    title: "Shop the combined list",
    body: "Your planned meals become one grocery list, with repeated ingredients combined and grouped by aisle.",
    href: "/shopping",
    cta: "View Shopping",
  },
  {
    n: 4,
    title: "Cook & track",
    body: "Mark meals as eaten in one tap. Your nutrition, history and stats update automatically on the You page.",
    href: "/you",
    cta: "Open You",
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-10">
      <header className="mb-6">
        <h1 className="text-[30px] font-bold tracking-tight text-ink">Help</h1>
        <p className="mt-1 text-[15px] text-ink-soft">
          The Nouri workflow in four steps.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {STEPS.map((s) => (
          <div
            key={s.n}
            className="flex gap-4 rounded-2xl border border-line bg-surface p-5"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">
              {s.n}
            </span>
            <div>
              <h2 className="font-bold text-ink">{s.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{s.body}</p>
              <Link
                href={s.href}
                className="mt-2 inline-block text-sm font-semibold text-brand hover:underline"
              >
                {s.cta} →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
