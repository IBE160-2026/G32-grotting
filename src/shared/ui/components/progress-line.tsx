import type { ReactNode } from "react";

// Shown while an AI section is pending (UX-DR30): an outlined box with a small
// amber pulse trace over an ink-2 baseline, then the sentence. Plain text with
// no role and no `aria-live`: a `role="status"` would make it a live region, and
// the first live region has already announced phase 2 (NFR-2). The trace is
// drawn by `.progress-trace` in globals.css: it runs for 5 s at most, then
// holds, and does not move under `prefers-reduced-motion` (WCAG 2.2.2).
export function ProgressLine({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 border border-edge px-5 py-[18px]">
      <svg
        aria-hidden="true"
        width="120"
        height="30"
        viewBox="0 0 120 30"
        fill="none"
        className="shrink-0"
      >
        <path d="M0 15 H120" stroke="var(--color-ink-2)" strokeWidth="1" />
        <path
          className="progress-trace"
          d="M0 15 H36 L42 4 L49 26 L56 8 L61 15 H120"
          pathLength="100"
          strokeDasharray="100"
          stroke="var(--color-amber)"
          strokeWidth="1.8"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>
      <p className="m-0 text-body text-ink">{children}</p>
    </div>
  );
}
