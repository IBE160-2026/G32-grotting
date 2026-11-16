import type { Metadata } from "next";
import { ApplicationForm } from "@/modules/application/ui";
import { CatalogueHeading } from "@/shared/ui/components/catalogue-heading";
import { messages } from "@/shared/ui/messages.nb";
import { pageTitle } from "@/shared/ui/page-title";

export const metadata: Metadata = {
  title: pageTitle(messages.nav.application),
};

// Søknad before accounts: the heading is the text alone, with no entry number
// (UX-DR18). The CV slot above the job fields arrives with Story 1.10.
export default function SoknadPage() {
  return (
    <div className="max-w-measure">
      <CatalogueHeading>{messages.application.heading}</CatalogueHeading>
      <div className="mt-8">
        <ApplicationForm />
      </div>
    </div>
  );
}
