import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { getApplicationMeta } from "@/modules/application";
import { SavedApplication } from "@/modules/application/ui";
import { getPageSession, requireStudentPage } from "@/modules/identity";
import { getConfig } from "@/shared/server/config";
import { getDb } from "@/shared/server/db";
import { messages } from "@/shared/ui/messages.nb";
import { pageTitle } from "@/shared/ui/page-title";

// A static title: the number and the employer are personal and stay out of it.
export const metadata: Metadata = { title: pageTitle(messages.saved.title) };

type Props = { params: Promise<{ id: string }> };

// A saved Application, read-only (Story 6.9). It exists only while accounts are
// on (the flag is read per request, AD-4). A logged-out visitor is sent to Logg
// inn. Another Student's id, an unknown id and a malformed id all end in the
// same Ikke funnet page (FR-19): the row is looked up by `(id, studentId)`
// before anything is rendered, and the page then fetches the content through
// `GET /api/applications/[id]`.
export default async function SavedApplicationPage({ params }: Props) {
  await connection();
  if (!getConfig().features.accounts) notFound();
  await requireStudentPage();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const session = await getPageSession();
  if (session === null) notFound();
  const meta = await getApplicationMeta(session.studentId, await getDb(), id);
  if (meta === null) notFound();
  return <SavedApplication id={id} />;
}
