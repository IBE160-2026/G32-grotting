import type { ReactNode } from "react";

// The page's single `h1` on Søknad and, later, on a result, Profil and a Saved
// Application (UX-DR18). Without accounts there is no entry number, so it is
// the text alone; the number and its muted «·» arrive with Epic 6.
export function CatalogueHeading({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-catalogue max-640:text-catalogue-mobile">{children}</h1>
  );
}
