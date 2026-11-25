"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert } from "@/shared/ui/components/alert";
import { Button } from "@/shared/ui/components/button";
import { CreditsList } from "@/shared/ui/components/credits-list";
import { messages } from "@/shared/ui/messages.nb";
import { logOutNow } from "./log-out";

type AccountProps = {
  // The email of the logged-in Student and the number of entries in the
  // catalogue, both read on the server from the session.
  email: string;
  entries: number;
};

// Konto (Story 6.10, FR-21, FR-23, UX-DR43): the email, the catalogue count,
// «Logg ut» and how the data is stored. No password change and no account
// deletion; «Logg ut» asks for no confirmation (FR-18, «one click»).
export function Account({ email, entries }: AccountProps) {
  const text = messages.account;
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function logOut() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    const result = await logOutNow(queryClient);
    if (!result.ok) {
      setBusy(false);
      // An ended session is on its way to Logg inn (`callApi`).
      if (result.error.code !== "SESSION_EXPIRED") setFailed(true);
      return;
    }
    // Stays busy: the page is leaving, for Hjem, logged out. A full page load
    // gives the logged-out app bar and an empty cache.
    window.location.replace("/");
  }

  return (
    <div>
      <h1 className="text-title max-640:text-title-mobile">{text.title}</h1>
      <div className="mt-8 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-column-gap max-640:grid-cols-1 max-640:gap-column-gap-mobile">
        <div>
          <CreditsList
            stacked
            items={[
              { term: text.email, value: email },
              { term: text.catalogue, value: text.entries(entries) },
            ]}
          />
          {failed ? (
            <div className="mt-6">
              <Alert>{messages.networkFailure}</Alert>
            </div>
          ) : null}
          <div className="mt-6">
            <Button busy={busy} onClick={logOut}>
              {text.logOut}
            </Button>
          </div>
        </div>
        <section aria-labelledby="konto-lagring" className="max-w-measure">
          <h2 id="konto-lagring" className="text-heading">
            {text.storageTitle}
          </h2>
          <ul className="mt-4">
            {text.storageLines.map((line, index) => (
              <li
                key={line}
                className={`border-rule border-t py-3.5 last:border-b ${
                  index === text.storageLines.length - 1 ? "text-ink-2" : ""
                }`}
              >
                {line}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
