"use client";

import NextLink from "next/link";
import { useState } from "react";
import { downloadLetter, renderLetter } from "@/modules/letter/ui";
import { Alert } from "@/shared/ui/components/alert";
import { Button, buttonClasses } from "@/shared/ui/components/button";
import { CopyButton } from "@/shared/ui/components/copy-button";
import { messages } from "@/shared/ui/messages.nb";
import type { ApplicationEntry } from "../contracts";
import { formatCatalogueNumber } from "../core/catalogue-number";
import { fetchLetterText } from "./use-applications";

// «Åpne», «Kopier brev» and «Last ned (.docx)» of one Historikk row (Story 6.8).
// Each has the entry in its accessible name. The Letter is not in the list: it
// is fetched on the press, from the server, for this row only, and put through
// the same `renderLetter` and `downloadLetter` as the Letter on Søknad. A row
// without a Letter has the two buttons switched off and says why. `name` is the
// Profile name that signs the Letter.
export function RegisterActions({
  entry,
  name,
}: {
  entry: ApplicationEntry;
  name: string | null;
}) {
  const number = formatCatalogueNumber(entry.seq);
  const [downloading, setDownloading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copyText(): Promise<string | null> {
    setFailed(false);
    const text = await fetchLetterText(entry.id);
    return text === null ? null : renderLetter(text, name);
  }

  async function download() {
    if (downloading) return;
    setDownloading(true);
    setFailed(false);
    try {
      const text = await fetchLetterText(entry.id);
      if (text === null) {
        setFailed(true);
        return;
      }
      await downloadLetter(
        text,
        entry.employer ?? "",
        name,
        new Date(entry.createdAt).getFullYear(),
      );
    } catch {
      setFailed(true);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2 max-640:items-start">
      <div className="flex flex-wrap justify-end gap-2 max-640:justify-start">
        <NextLink
          href={`/historikk/${entry.id}`}
          // Story 6.9 builds the page behind the link; nothing is loaded ahead.
          prefetch={false}
          aria-label={messages.history.openEntry(number)}
          className={buttonClasses("secondary", { small: true })}
        >
          {messages.history.open}
        </NextLink>
        {entry.hasLetter ? (
          <>
            <CopyButton
              small
              text={copyText}
              label={messages.history.copyLabel}
              ariaLabel={messages.history.copyEntry(number)}
              blockedText={messages.history.copyBlocked}
              onUnavailable={() => setFailed(true)}
            />
            <Button
              small
              variant="secondary"
              busy={downloading}
              aria-label={messages.history.downloadEntry(number)}
              onClick={download}
            >
              {messages.letter.actions.download}
            </Button>
          </>
        ) : (
          <>
            <Button
              small
              variant="secondary"
              disabled
              aria-label={messages.history.copyEntry(number)}
            >
              {messages.history.copyLabel}
            </Button>
            <Button
              small
              variant="secondary"
              disabled
              aria-label={messages.history.downloadEntry(number)}
            >
              {messages.letter.actions.download}
            </Button>
          </>
        )}
      </div>
      {entry.hasLetter ? null : (
        <p className="m-0 text-hint text-ink-2">{messages.history.noLetter}</p>
      )}
      {failed ? <Alert>{messages.history.letterFailed}</Alert> : null}
    </div>
  );
}
