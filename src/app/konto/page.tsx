import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { countApplications } from "@/modules/application";
import {
  getPageSession,
  getStudentEmail,
  LOGIN_PATH,
  requireStudentPage,
} from "@/modules/identity";
import { Account } from "@/modules/identity/ui";
import { getConfig } from "@/shared/server/config";
import { getDb } from "@/shared/server/db";
import { messages } from "@/shared/ui/messages.nb";
import { pageTitle } from "@/shared/ui/page-title";

export const metadata: Metadata = { title: pageTitle(messages.account.title) };

// Konto (Story 6.10): the Student's email, the catalogue count, «Logg ut» and
// how the data is stored. It exists only while accounts are on; the flag is
// read per request, never at build time (AD-4). Both values come from the
// session's `studentId`, nothing is decrypted, and a logged-out visitor is sent
// to Logg inn.
export default async function KontoPage() {
  await connection();
  if (!getConfig().features.accounts) notFound();
  await requireStudentPage();
  const session = await getPageSession();
  if (session === null) redirect(LOGIN_PATH);
  const db = await getDb();
  const [email, entries] = await Promise.all([
    getStudentEmail(session.studentId, db),
    countApplications(session.studentId, db),
  ]);
  // A Student without an email cannot exist; a miss reads as a gone session.
  if (email === null) redirect(LOGIN_PATH);
  return <Account email={email} entries={entries} />;
}
