import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { RegisterForm } from "@/modules/identity/ui";
import { getConfig } from "@/shared/server/config";
import { messages } from "@/shared/ui/messages.nb";
import { pageTitle } from "@/shared/ui/page-title";

export const metadata: Metadata = { title: pageTitle(messages.register.title) };

// Registrer deg (Story 6.4): exists only while accounts are on, read per
// request (AD-4). On Hosted the form also asks for the Access code (FR-31).
export default async function RegistrerPage() {
  await connection();
  if (!getConfig().features.accounts) notFound();
  return (
    <div className="max-w-measure">
      <h1 className="text-title max-640:text-title-mobile">
        {messages.register.title}
      </h1>
      <div className="mt-8">
        <RegisterForm />
      </div>
    </div>
  );
}
