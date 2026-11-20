import type { Ref } from "react";
import { messages } from "@/shared/ui/messages.nb";
import type { Letter } from "../contracts";
import { renderLetter } from "../core/render-letter";

export const LETTER_HEADING_ID = "letter-h2";
export const LETTER_LABEL_ID = "letter-ai-label";

// The Letter, read-only (FR-9, UX-DR28): an `<article>` tied to the section
// heading and to the AI label, never a textarea or `contenteditable`, so the
// Student edits it in their own program. The sign-off is rendered here by
// `renderLetter`; before accounts there is no name, so the placeholder shows.
export function LetterView({
  letter,
  articleRef,
}: {
  letter: Letter;
  // Lets the owner select the text when the clipboard is blocked (FR-12).
  articleRef?: Ref<HTMLElement>;
}) {
  const paragraphs = renderLetter(letter.text, null)
    .split(/\n{2,}/)
    .filter((paragraph) => paragraph.trim() !== "");
  return (
    <>
      <p id={LETTER_LABEL_ID} className="mb-3 text-hint text-ink-2">
        {messages.letter.aiLabel}
      </p>
      <article
        ref={articleRef}
        aria-labelledby={LETTER_HEADING_ID}
        aria-describedby={LETTER_LABEL_ID}
        className="flex max-w-letter flex-col gap-4 border border-rule bg-lift px-10 py-9 text-letter max-640:px-[18px] max-640:py-5"
      >
        {paragraphs.map((paragraph, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: the text is fixed once the Letter has arrived and two paragraphs can be equal, so the index is the stable key
          <p key={index} className="m-0 whitespace-pre-line text-ink">
            {paragraph}
          </p>
        ))}
      </article>
    </>
  );
}
