import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { LoginForm } from "@/modules/identity/ui";
import { getConfig } from "@/shared/server/config";
import { messages } from "@/shared/ui/messages.nb";
import { pageTitle } from "@/shared/ui/page-title";

export const metadata: Metadata = { title: pageTitle(messages.login.title) };

// Logg inn (Story 6.4): where a logged-out Student is sent from Søknad, Profil,
// Historikk and Konto. Exists only while accounts are on.
export default async function LoggInnPage() {
  await connection();
  if (!getConfig().features.accounts) notFound();
  return (
    <div className="max-w-measure">
      <h1 className="text-title max-640:text-title-mobile">
        {messages.login.title}
      </h1>
      <div className="mt-8">
        <LoginForm />
      </div>
    </div>
  );
}
