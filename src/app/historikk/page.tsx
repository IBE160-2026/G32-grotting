import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { HistoryPage } from "@/modules/application/ui";
import { requireStudentPage } from "@/modules/identity";
import { getConfig } from "@/shared/server/config";
import { messages } from "@/shared/ui/messages.nb";
import { pageTitle } from "@/shared/ui/page-title";

export const metadata: Metadata = { title: pageTitle(messages.history.title) };

// Historikk (Story 6.8): the register of the Student's Applications. It exists
// only while accounts are on, as the flag is read per request and never at
// build time (AD-4); a logged-out visitor is sent to Logg inn.
export default async function HistorikkPage() {
  await connection();
  if (!getConfig().features.accounts) notFound();
  await requireStudentPage();
  return <HistoryPage />;
}
