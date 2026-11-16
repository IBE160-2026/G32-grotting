"use client";

import { type RefObject, useEffect, useRef, useState } from "react";
import { formatCount } from "@/shared/core/format-count";
import { Button } from "@/shared/ui/components/button";
import { TextArea } from "@/shared/ui/components/text-field";
import { messages } from "@/shared/ui/messages.nb";
import { CV_MAX } from "../contracts";

type CvInputProps = {
  draft: string;
  confirmed: boolean;
  // The error text for the field, already in bokmål.
  error: string | undefined;
  // Every call is an edit: the value changed.
  onChange: (value: string) => void;
  onBlur: () => void;
  // Returns true when the text was confirmed, so the slot can collapse.
  onConfirm: () => boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
};

// The before-S6 CV slot (UX-DR26): the editable text with «Bekreft CV-teksten»,
// collapsing to the confirmed line with a way back. The form owns the text, the
// confirmation and the session; this part owns what is open and where focus
// goes (UX-DR36).
export function CvInput({
  draft,
  confirmed,
  error,
  onChange,
  onBlur,
  onConfirm,
  inputRef,
}: CvInputProps) {
  const reopenRef = useRef<HTMLButtonElement>(null);
  // Reopening a confirmed text does not clear the confirmation; an edit does.
  const [reopened, setReopened] = useState(false);
  const [moveFocusTo, setMoveFocusTo] = useState<"field" | "reopen" | null>(
    null,
  );
  const collapsed = confirmed && !reopened;

  // The control that had focus is gone after a collapse or a reopen, so focus
  // is placed once the other control has rendered.
  useEffect(() => {
    if (moveFocusTo === "field") inputRef.current?.focus();
    if (moveFocusTo === "reopen") reopenRef.current?.focus();
    if (moveFocusTo !== null) setMoveFocusTo(null);
  }, [moveFocusTo, inputRef]);

  if (collapsed) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border border-edge px-3.5 py-3">
        <p className="font-mono text-mono-meta text-ink">
          {messages.cv.confirmed(formatCount(draft.length))}
        </p>
        <Button
          ref={reopenRef}
          variant="secondary"
          small
          onClick={() => {
            setReopened(true);
            setMoveFocusTo("field");
          }}
        >
          {messages.cv.reopen}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <TextArea
        ref={inputRef}
        label={messages.cv.label}
        counter={messages.counter(
          formatCount(draft.length),
          formatCount(CV_MAX),
        )}
        error={error}
        name="cvText"
        rows={14}
        autoComplete="off"
        className="font-mono text-mono-cv"
        value={draft}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
      <div>
        <Button
          variant="secondary"
          // Pressing the button must not blur the field first: its error would
          // clear, the button would move up, and the click would be lost.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (onConfirm()) {
              setReopened(false);
              setMoveFocusTo("reopen");
            }
          }}
        >
          {messages.cv.confirm}
        </Button>
      </div>
    </div>
  );
}
