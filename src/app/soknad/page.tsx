import type { Metadata } from "next";
import { ApplicationForm } from "@/modules/application/ui";
import { requireStudentPage } from "@/modules/identity";
import { type ExamplePair, loadExamplePair } from "@/shared/server/data-files";
import { log } from "@/shared/server/log";
import { messages } from "@/shared/ui/messages.nb";
import { pageTitle } from "@/shared/ui/page-title";

export const metadata: Metadata = {
  title: pageTitle(messages.nav.application),
};

// Søknad before accounts: the heading is the text alone, with no entry number
// (UX-DR18). The form owns the `h1`, since the result takes its place, and the
// reading measure, since the pulse plot on the result is wider than it. The
// server reads the Example pair and hands it over as a plain prop, so
// «Bruk eksempelet» needs no request from the browser (FR-27, AD-15).
export default async function SoknadPage() {
  // With accounts on, a logged-out visitor is sent to Logg inn (FR-18); with
  // accounts off this does nothing.
  await requireStudentPage();
  // The button is a convenience: an unreadable Example pair costs the form its
  // button, not the page.
  let example: ExamplePair | undefined;
  try {
    example = await loadExamplePair();
  } catch (error) {
    log({
      kind: "error",
      code: "UNEXPECTED",
      errorName: error instanceof Error ? error.name : "Error",
      route: "/soknad",
    });
  }
  return <ApplicationForm example={example} />;
}
