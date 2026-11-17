import type { ReactNode, Ref } from "react";

// The page's single `h1` on Søknad and, later, on a result, Profil and a Saved
// Application (UX-DR18). Without accounts there is no entry number, so it is
// the text alone; the number and its muted «·» arrive with Epic 6.
//
// With a `ref` it can be given focus by script (`tabindex="-1"`), which the
// Søknad page does when the form and the result trade places. `employer` is
// the result's heading: on a phone it is set smaller, on its own line.
export function CatalogueHeading({
  children,
  ref,
  employer = false,
}: {
  children: ReactNode;
  ref?: Ref<HTMLHeadingElement>;
  employer?: boolean;
}) {
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
      {children}
    </h1>
  );
}
