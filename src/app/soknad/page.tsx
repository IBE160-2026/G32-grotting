import type { Metadata } from "next";
import { ApplicationForm } from "@/modules/application/ui";
import { messages } from "@/shared/ui/messages.nb";
import { pageTitle } from "@/shared/ui/page-title";

export const metadata: Metadata = {
  title: pageTitle(messages.nav.application),
};

// Søknad before accounts: the heading is the text alone, with no entry number
// (UX-DR18). The form owns the `h1`, since the result takes its place.
export default function SoknadPage() {
  return (
    <div className="max-w-measure">
      <ApplicationForm />
    </div>
  );
}
