import { Fragment, type Ref } from "react";
import { messages } from "@/shared/ui/messages.nb";
import type { Letter } from "../contracts";
import { segmentLetter } from "../core/segment-letter";
import {
  FlaggedWord,
  type LetterCheckState,
  LetterFlagList,
  LetterUnchecked,
} from "./letter-flags";

export const LETTER_HEADING_ID = "letter-h2";
export const LETTER_LABEL_ID = "letter-ai-label";

// The Letter, read-only (FR-9, UX-DR28): an `<article>` tied to the section
// heading and to the AI label, never a textarea or `contenteditable`, so the
// Student edits it in their own program. The sign-off is rendered here by
// `segmentLetter`: the Profile name with accounts on, else the placeholder.
// What the integrity check found (FR-11) sits between the label and the Letter:
// a warning list, with each flagged word underlined in the text. Nothing in
// the Letter is removed or rewritten.
export function LetterView({
  letter,
  articleRef,
  check = { kind: "pending" },
  onRetryCheck,
  name = null,
}: {
  letter: Letter;
  // Lets the owner select the text when the clipboard is blocked (FR-12).
  articleRef?: Ref<HTMLElement>;
  check?: LetterCheckState;
  onRetryCheck?: () => void;
  // The Profile name that signs the Letter (accounts on); null shows the
  // placeholder.
  name?: string | null;
}) {
  const flags = check.kind === "done" ? check.flags : [];
  const paragraphs = segmentLetter(letter.text, flags, name);
  return (
    <>
      <p id={LETTER_LABEL_ID} className="mb-3 text-hint text-ink-2">
        {messages.letter.aiLabel}
      </p>
      {check.kind === "done" && flags.length > 0 ? (
        <LetterFlagList flags={flags} />
      ) : null}
      {check.kind === "failed" ? (
        <LetterUnchecked busy={check.busy} onRetry={onRetryCheck} />
      ) : null}
      <article
        ref={articleRef}
        aria-labelledby={LETTER_HEADING_ID}
        aria-describedby={LETTER_LABEL_ID}
        className="flex max-w-letter flex-col gap-4 border border-rule bg-lift px-10 py-9 text-letter max-640:px-[18px] max-640:py-5"
      >
        {paragraphs.map((paragraph, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: the text is fixed once the Letter has arrived and two paragraphs can be equal, so the index is the stable key
          <p key={index} className="m-0 whitespace-pre-line text-ink">
            {paragraph.map((piece, at) =>
              piece.kind === "flagged" ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: pieces are fixed with the Letter and the flags
                <FlaggedWord key={at} flag={piece.flag}>
                  {piece.text}
                </FlaggedWord>
              ) : (
                // biome-ignore lint/suspicious/noArrayIndexKey: pieces are fixed with the Letter and the flags
                <Fragment key={at}>{piece.text}</Fragment>
              ),
            )}
          </p>
        ))}
      </article>
    </>
  );
}
