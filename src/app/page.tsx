import type { Metadata } from "next";
import { analyseExample, type ExampleAnalysis } from "@/modules/application";
import { PulsePlot } from "@/modules/match/ui";
import { log } from "@/shared/server/log";
import { Link } from "@/shared/ui/components/link";
import { messages } from "@/shared/ui/messages.nb";
import { pageTitle } from "@/shared/ui/page-title";

export const metadata: Metadata = { title: pageTitle(messages.nav.home) };

// Hjem before S6: what the app does, then one way into Søknad. The layout owns
// <main>. The pulse plot draws the Example ad from phase-1 data the server
// computes, so the browser makes no request for it (FR-8, UX-DR34).
export default async function Home() {
  const { home } = messages;
  // The plot is decoration: an unreadable Example pair costs Hjem the plot,
  // not the page.
  let example: ExampleAnalysis | undefined;
  try {
    example = await analyseExample();
  } catch (error) {
    log({
      kind: "error",
      code: "UNEXPECTED",
      errorName: error instanceof Error ? error.name : "Error",
      route: "/",
    });
  }
  return (
    <>
      <div className="max-w-measure">
        <h1 className="text-display max-640:text-display-mobile">
          {home.headline}
        </h1>
        <p className="mt-5 text-lede text-ink-2">{home.lede}</p>
        <div className="mt-7">
          <Link kind="button" href="/soknad">
            {home.primaryAction}
          </Link>
        </div>
        <p className="mt-4 text-ink-2">{home.tryExample}</p>
      </div>

      {example ? (
        <div className="mt-section max-640:mt-section-mobile">
          <p className="mb-5 max-w-measure text-ink-2">
            {messages.plot.homeIntro}
          </p>
          <PulsePlot
            placement="home"
            paragraphs={example.paragraphs}
            matched={example.matched}
            missing={example.missing}
          />
        </div>
      ) : null}

      <section className="mt-section max-640:mt-section-mobile">
        <h2 className="text-heading">{home.outputsHeading}</h2>
        <ol className="mt-4">
          {home.outputs.map((output) => (
            <li
              key={output.title}
              className="grid grid-cols-[minmax(0,15rem)_minmax(0,1fr)] items-baseline gap-x-6 border-rule border-t py-5 last:border-b max-640:grid-cols-1 max-640:gap-y-1.5"
            >
              <h3 className="text-subheading">{output.title}</h3>
              <p className="max-w-measure text-ink-2">{output.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-section grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-column-gap max-640:mt-section-mobile max-640:grid-cols-1 max-640:gap-column-gap-mobile">
        <h2 className="text-statement">{home.stanceHeading}</h2>
        <ul>
          {home.stancePoints.map((point) => (
            <li
              key={point}
              className="max-w-measure border-rule border-t py-3.5"
            >
              {point}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
