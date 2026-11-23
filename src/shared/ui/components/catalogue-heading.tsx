import type { ReactNode, Ref } from "react";

// The page's single `h1` on Søknad and, later, on a result, Profil and a Saved
// Application (UX-DR18). Without a `number` (accounts off, or a number not yet
// known) it is the text alone.
//
// With a `ref` it can be given focus by script (`tabindex="-1"`), which the
// Søknad page does when the form and the result trade places. `employer` is
// the result's heading: on a phone it is set smaller, on its own line.
//
// With a `lead` (Profil: «CV · Kari Nordmann») the heading is the lead, a muted
// dot that is hidden from assistive technology, a comma that only it hears, and
// the children. The children may be missing while the name is still loading.
//
// A `number` (Story 6.7: «JA-002 · Nordic Digital») is the same construction,
// with the entry number in DM Mono as the lead; `dim` sets it in the quieter
// ink the Søknad form uses for the number the next Application will get.
export function CatalogueHeading({
  children,
  ref,
  employer = false,
  lead,
  number,
  dim = false,
}: {
  children?: ReactNode;
  ref?: Ref<HTMLHeadingElement>;
  employer?: boolean;
  lead?: string;
  number?: string;
  dim?: boolean;
}) {
  const leadText = number ?? lead;
  return (
    <h1
      ref={ref}
      tabIndex={ref ? -1 : undefined}
      className={[
        "text-catalogue",
        employer
          ? "max-640:text-catalogue-employer-mobile"
          : "max-640:text-catalogue-mobile",
      ].join(" ")}
    >
      {leadText === undefined ? (
        children
      ) : (
        <>
          <span
            className={
              number === undefined
                ? undefined
                : ["catalogue-number", dim ? "text-ink-2" : ""]
                    .filter(Boolean)
                    .join(" ")
            }
          >
            {leadText}
          </span>
          {children === undefined ? null : (
            <>
              <span aria-hidden="true" className="mx-[0.4em] text-mute">
                ·
              </span>
              <span className="sr-only">, </span>
              {children}
            </>
          )}
        </>
      )}
    </h1>
  );
}
