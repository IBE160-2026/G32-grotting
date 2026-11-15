// Two polite live regions sit in the root layout, outside the page content
// (UX-DR19). `phase` speaks the two lines per Application; `action` carries
// copy confirmations, «Lagret.» and retry outcomes.
export const LIVE_REGION_IDS = {
  phase: "live-phase",
  action: "live-action",
} as const;

export type LiveRegion = keyof typeof LIVE_REGION_IDS;

const pending: Partial<Record<LiveRegion, number>> = {};

// Replaces the region's text, never appends. The region is emptied first and
// filled in the next frame, so the same text twice in a row is spoken twice.
export function announce(region: LiveRegion, text: string): void {
  const element = document.getElementById(LIVE_REGION_IDS[region]);
  if (!element) return;
  const waiting = pending[region];
  if (waiting !== undefined) cancelAnimationFrame(waiting);
  element.textContent = "";
  pending[region] = requestAnimationFrame(() => {
    element.textContent = text;
    delete pending[region];
  });
}
