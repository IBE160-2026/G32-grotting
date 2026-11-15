import type { Metadata } from "next";
import { Link } from "@/shared/ui/components/link";
import { messages } from "@/shared/ui/messages.nb";
import { pageTitle } from "@/shared/ui/page-title";

export const metadata: Metadata = {
  title: pageTitle(messages.notFound.heading),
};

// One message for an unknown URL and for another Student's record (FR-19).
export default function NotFound() {
  return (
    <>
      <h1 className="text-title max-640:text-title-mobile">
        {messages.notFound.heading}
      </h1>
      <p className="mt-4 max-w-measure text-lede text-ink-2">
        {messages.notFound.body}
      </p>
      <p className="mt-6">
        <Link href="/" kind="standalone">
          {messages.notFound.home}
        </Link>
      </p>
    </>
  );
}
