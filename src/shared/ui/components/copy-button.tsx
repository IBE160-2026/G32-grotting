"use client";

import { useEffect, useRef, useState } from "react";
import { announce } from "../announce";
import { COPIED_MS, writeToClipboard } from "../clipboard";
import { messages } from "../messages.nb";
import { Button } from "./button";

// A 18 px copy glyph, 1.6 stroke, square caps (DESIGN.md, copy-button).
function CopyGlyph() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="square"
    >
      <path d="M9 9h11v11H9z" />
      <path d="M5 15V4h11" />
    </svg>
  );
}

/**
 * Copies plain text (FR-12, UX-DR13): the label reads «Kopiert» for 1.8 s, the
 * second live region says «Kopiert til utklippstavlen.», and focus stays on the
 * button. When the clipboard is blocked, `onBlocked` lets the owner select the
 * text, and the notice «Kopier med Ctrl+C, eller hold inne på mobil.» shows and
 * is announced. The owner decides what the text is, so each place (the Letter,
 * a suggestion, a Historikk row) renders it the way it should look when pasted.
 * `ariaLabel` gives an entry-specific name where several buttons share a page.
 */
export function CopyButton({
  text,
  variant = "secondary",
  small,
  ariaLabel,
  className,
  onBlocked,
}: {
  text: string;
  variant?: "primary" | "secondary";
  small?: boolean;
  ariaLabel?: string;
  className?: string;
  onBlocked?: () => void;
}) {
  // What happened belongs to the text it happened for: a new text starts idle.
  const [result, setResult] = useState<{
    state: "copied" | "blocked";
    text: string;
  } | null>(null);
  const state = result?.text === text ? result.state : "idle";
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    clearTimeout(timer.current);
    if (await writeToClipboard(text)) {
      setResult({ state: "copied", text });
      announce("action", messages.copy.live);
      timer.current = setTimeout(() => setResult(null), COPIED_MS);
      return;
    }
    setResult({ state: "blocked", text });
    onBlocked?.();
    announce("action", messages.copy.blocked);
  }

  return (
    <>
      <Button
        variant={variant}
        small={small}
        className={className}
        aria-label={ariaLabel}
        onClick={copy}
      >
        <CopyGlyph />
        {state === "copied" ? messages.copy.copied : messages.copy.label}
      </Button>
      {state === "blocked" ? (
        <p className="m-0 border border-edge px-4 py-3 text-body text-ink">
          {messages.copy.blocked}
        </p>
      ) : null}
    </>
  );
}
