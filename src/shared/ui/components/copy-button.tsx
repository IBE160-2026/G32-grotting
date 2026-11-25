"use client";

import { useEffect, useRef, useState } from "react";
import { announce } from "../announce";
import {
  COPIED_MS,
  type LazyCopyOutcome,
  writeLazyToClipboard,
  writeToClipboard,
} from "../clipboard";
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
 * `ariaLabel` gives an entry-specific name where several buttons share a page,
 * and `label` a visible label of its own («Kopier brev» in Historikk).
 *
 * `text` may also be a function that fetches the text on the press (a Historikk
 * row, whose Letter is not on the page until asked for): the button is busy
 * meanwhile, and `null` (or a thrown error) calls `onUnavailable` instead of
 * copying.
 */
export function CopyButton({
  text,
  variant = "secondary",
  small,
  ariaLabel,
  className,
  label,
  blockedText = messages.copy.blocked,
  onBlocked,
  onUnavailable,
}: {
  text: string | (() => Promise<string | null>);
  variant?: "primary" | "secondary";
  small?: boolean;
  ariaLabel?: string;
  className?: string;
  label?: string;
  // What a blocked clipboard says; the default tells the Student to select the
  // text, so a place with no text on the page gives its own sentence.
  blockedText?: string;
  onBlocked?: () => void;
  onUnavailable?: () => void;
}) {
  // What happened belongs to the text it happened for: a new text starts idle.
  // A text fetched on the press has no key to change.
  const key = typeof text === "string" ? text : null;
  const [result, setResult] = useState<{
    state: "copied" | "blocked";
    key: string | null;
  } | null>(null);
  const [fetching, setFetching] = useState(false);
  const state = result?.key === key ? result.state : "idle";
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    if (fetching) return;
    clearTimeout(timer.current);
    let outcome: LazyCopyOutcome;
    if (typeof text === "string") {
      outcome = (await writeToClipboard(text)) ? "copied" : "blocked";
    } else {
      setFetching(true);
      try {
        outcome = await writeLazyToClipboard(text);
      } finally {
        setFetching(false);
      }
    }
    if (outcome === "unavailable") {
      onUnavailable?.();
      return;
    }
    if (outcome === "copied") {
      setResult({ state: "copied", key });
      announce("action", messages.copy.live);
      timer.current = setTimeout(() => setResult(null), COPIED_MS);
      return;
    }
    setResult({ state: "blocked", key });
    onBlocked?.();
    announce("action", blockedText);
  }

  return (
    <>
      <Button
        variant={variant}
        small={small}
        busy={fetching}
        className={className}
        aria-label={ariaLabel}
        onClick={copy}
      >
        <CopyGlyph />
        {state === "copied"
          ? messages.copy.copied
          : (label ?? messages.copy.label)}
      </Button>
      {state === "blocked" ? (
        <p className="m-0 border border-edge px-4 py-3 text-body text-ink">
          {blockedText}
        </p>
      ) : null}
    </>
  );
}
