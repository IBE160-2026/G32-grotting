import type { Metadata } from "next";
import { messages } from "@/shared/ui/messages.nb";
import { pageTitle } from "@/shared/ui/page-title";

export const metadata: Metadata = { title: pageTitle(messages.nav.home) };

// The real Hjem arrives with Story 1.8; the layout owns <main>.
export default function Home() {
  return (
    <h1 className="text-display max-640:text-display-mobile">
      {messages.siteName}
    </h1>
  );
}
