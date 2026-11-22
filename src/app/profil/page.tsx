import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ProfilePage } from "@/modules/profile/ui";
import { getConfig } from "@/shared/server/config";
import { messages } from "@/shared/ui/messages.nb";
import { pageTitle } from "@/shared/ui/page-title";

export const metadata: Metadata = { title: pageTitle(messages.profile.title) };

// Profil (Story 6.3): where the Student keeps the CV. It exists only while
// accounts are on; the flag is read per request, never at build time (AD-4).
// Profil is not in the app bar yet (Story 6.4).
export default async function ProfilRoute() {
  await connection();
  if (!getConfig().features.accounts) notFound();
  return (
    <div className="max-w-measure">
      <ProfilePage />
    </div>
  );
}
