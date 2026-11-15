import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { gateIsActive, isValidAccessCookie } from "@/modules/identity";
import { ACCESS_COOKIE } from "@/modules/identity/contracts";
import { getConfig } from "@/shared/server/config";
import { messages } from "@/shared/ui/messages.nb";
import { pageTitle } from "@/shared/ui/page-title";
import { AccessForm } from "./access-form";

export const metadata: Metadata = { title: pageTitle(messages.access.heading) };

// Only where the gate is in use (Hosted, accounts off); elsewhere the screen
// does not exist (AD-12).
export default async function TilgangPage() {
  await connection();
  const config = getConfig();
  if (
    config.accessCode === undefined ||
    !gateIsActive({
      hosted: config.hosted,
      accountsOn: config.features.accounts,
    })
  ) {
    notFound();
  }
  // Asked once per browser session: with the cookie already set, go on.
  const cookie = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (isValidAccessCookie(cookie, config.accessCode)) redirect("/");

  return (
    <div className="max-w-measure">
      <h1 className="text-title max-640:text-title-mobile">
        {messages.access.heading}
      </h1>
      <p className="mt-4 text-lede text-ink-2">{messages.access.body}</p>
      <div className="mt-8">
        <AccessForm />
      </div>
    </div>
  );
}
