import type { ReactNode, Ref } from "react";
import { messages } from "../messages.nb";
import { CodeStrip } from "./code-strip";

// The slot of an AI section (UX-DR30). Until the answer is in it shows the real
// `h2`, an outline «Skrives» strip, ruled lines and a hint, and
// `aria-busy="true"` says the section is still being written. Once the owner
// passes `children`, the same slot holds the answer: the section and its `h2`
// stay the same elements, so focus put on the heading survives the change.
// Each AI section has its own slot and resolves on its own (AD-6).
export function AiPlaceholder({
  title,
  headingId,
  headingRef,
  strip,
  children,
}: {
  title: string;
  headingId: string;
  // Lets the owner move focus to the heading by script (a retry).
  headingRef?: Ref<HTMLHeadingElement>;
  // Shown beside the `h2` (the sand «Skrevet med KI» strip); without it the
  // markup is the plain heading.
  strip?: ReactNode;
  // The settled section: the answer, or its failure.
  children?: ReactNode;
}) {
  const pending = children === undefined;
  const heading = (
    <h2
      ref={headingRef}
      id={headingId}
      tabIndex={headingRef ? -1 : undefined}
      className={`${strip === undefined ? "mb-3" : "m-0"} text-heading ${pending ? "text-ink-2" : "text-ink"}`}
    >
      {title}
    </h2>
  );
  return (
    <section
      aria-labelledby={headingId}
      aria-busy={pending ? "true" : undefined}
    >
      {strip === undefined ? (
        heading
      ) : (
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-2">
          {heading}
          {strip}
        </div>
      )}
      {pending ? (
        <div className="border border-rule px-5 py-4">
          <CodeStrip kind="outline">{messages.letter.pendingStrip}</CodeStrip>
          <div
            aria-hidden="true"
            className="mt-4 h-28 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_21px,var(--color-rule)_21px,var(--color-rule)_22px)]"
          />
          <p className="mt-3 mb-0 text-hint text-ink-2">
            {messages.letter.placeholderHint}
          </p>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
