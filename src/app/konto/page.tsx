import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireStudentPage } from "@/modules/identity";
import { getConfig } from "@/shared/server/config";
import { Link } from "@/shared/ui/components/link";
import { messages } from "@/shared/ui/messages.nb";
import { pageTitle } from "@/shared/ui/page-title";

export const metadata: Metadata = {
  title: pageTitle(messages.placeholderPage.account),
};

// Konto stands as a plain page until its own story builds it. It exists only
// while accounts are on, and a logged-out visitor is sent to Logg inn.
export default async function KontoPage() {
  await connection();
  if (!getConfig().features.accounts) notFound();
  await requireStudentPage();
  return (
    <div className="max-w-measure">
      <h1 className="text-title max-640:text-title-mobile">
        {messages.placeholderPage.account}
      </h1>
      <p className="mt-4 text-lede text-ink-2">
        {messages.placeholderPage.body}
      </p>
      <p className="mt-6">
        <Link href="/soknad" kind="standalone">
          {messages.placeholderPage.toApplication}
        </Link>
      </p>
    </div>
  );
}
