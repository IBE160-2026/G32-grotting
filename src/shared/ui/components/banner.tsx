"use client";

import { messages } from "../messages.nb";
import { useRunMode } from "../run-mode";
import { CodeStrip } from "./code-strip";

// The Test-mode banner (FR-27, UX-DR16): under the app bar, inside the header,
// on every page while `testMode`. A note, not an alert: it says nothing new
// when it appears, so it is not spoken. It has no close button.
export function Banner() {
  const { testMode } = useRunMode();
  if (!testMode) return null;
  return (
    <div
      role="note"
      className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-rule bg-lift px-page-x py-3 max-640:px-page-x-mobile"
    >
      <CodeStrip kind="sand">{messages.testBanner.strip}</CodeStrip>
      <p className="m-0 text-label text-ink">{messages.testBanner.text}</p>
      <p className="m-0 text-hint text-ink-2">{messages.testBanner.note}</p>
    </div>
  );
}
