"use client";

import type { MouseEvent } from "react";
import { Button } from "@/shared/ui/components/button";
import { Notice } from "@/shared/ui/components/notice";
import { messages } from "@/shared/ui/messages.nb";
import type { LetterFlagWire } from "../contracts";

// Where the integrity check of the Letter on screen stands (FR-11). `pending`
// shows nothing: the Letter is on screen at once, the flags are added when the
// check returns. `failed` keeps the Letter and offers a retry of the check only.
export type LetterCheckState =
  | { readonly kind: "pending" }
  | { readonly kind: "done"; readonly flags: readonly LetterFlagWire[] }
  | { readonly kind: "failed"; readonly busy: boolean };

export const letterFlagId = (index: number) => `letter-flag-${index}`;

function flagText(flag: LetterFlagWire): string {
  return flag.kind === "UNSUPPORTED_CLAIM"
    ? messages.letter.check.unsupported(flag.word)
    : messages.letter.check.upgrade(flag.word);
}

/**
 * The warning list between the AI label and the Letter: one line per flagged
 * word, in a rust-outlined box on the alert ground. It is not an alert and has
 * no live region: the Student reads it as part of the page. A click on a
 * flagged word in the Letter focuses its line.
 */
export function LetterFlagList({
  flags,
}: {
  flags: readonly LetterFlagWire[];
}) {
  return (
    <section
      aria-label={messages.letter.check.sectionName}
      className="mb-3 flex items-baseline gap-3 border border-rust bg-alert-ground px-4 py-3 text-body text-ink"
    >
      <span className="code border border-rust px-1.5 text-rust">
        {messages.letter.check.strip}
      </span>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {flags.map((flag, index) => (
          <li
            key={`${flag.kind}-${flag.term}`}
            id={letterFlagId(index)}
            tabIndex={-1}
          >
            {flagText(flag)}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A flagged word in the Letter: dashed rust underline, linked to its line. */
export function FlaggedWord({
  flag,
  children,
}: {
  flag: number;
  children: string;
}) {
  const id = letterFlagId(flag);
  function open(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    document.getElementById(id)?.focus();
  }
  return (
    <a
      href={`#${id}`}
      onClick={open}
      className="text-ink underline decoration-rust decoration-2 decoration-dashed underline-offset-4"
    >
      {children}
    </a>
  );
}

/**
 * The check could not be made: the Letter stays, and the Student is told to
 * read it with extra care. A notice, never an alert; the retry sends the check
 * only.
 */
export function LetterUnchecked({
  busy,
  onRetry,
}: {
  busy: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="mb-3 flex flex-col items-start gap-3 max-640:items-stretch">
      <Notice label={messages.letter.check.strip}>
        {messages.letter.check.unchecked}
      </Notice>
      <Button variant="secondary" busy={busy} onClick={onRetry}>
        {messages.letter.check.retry}
      </Button>
    </div>
  );
}
