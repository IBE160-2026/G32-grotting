"use client";

import { useRef } from "react";
import { selectContents } from "@/shared/ui/clipboard";
import { CopyButton } from "@/shared/ui/components/copy-button";
import { messages } from "@/shared/ui/messages.nb";

// The rewording suggestion of a Rewordable gap (FR-16, UX-DR13): a raised box
// headed «Omformuleringsforslag» with the suggestion as it was given and a
// small «Kopier» that copies only that text. There is no action that adds it
// to the CV (P3): the Student pastes it where they choose. When the clipboard
// is blocked the text is selected so Ctrl+C or a long press can copy it.
export function SuggestionBox({
  suggestion,
  keyword,
}: {
  suggestion: string;
  keyword: string;
}) {
  const textRef = useRef<HTMLParagraphElement>(null);
  return (
    <div className="border border-edge bg-lift">
      <h4 className="caps m-0 border-rule border-b px-4 py-3 text-ink-2">
        {messages.gaps.suggestion.heading}
      </h4>
      <div className="flex flex-col items-start gap-4 px-4 py-4">
        <p ref={textRef} className="m-0 whitespace-pre-line text-body text-ink">
          {suggestion}
        </p>
        <CopyButton
          text={suggestion}
          small
          ariaLabel={messages.gaps.suggestion.copyLabel(keyword)}
          onBlocked={() => selectContents(textRef.current)}
        />
      </div>
    </div>
  );
}
