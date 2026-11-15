// Two polite live regions sit in the root layout, outside the page content
// (UX-DR19). `phase` speaks the two lines per Application; `action` carries
// copy confirmations, «Lagret.» and retry outcomes.
export const LIVE_REGION_IDS = {
  phase: "live-phase",
  action: "live-action",
} as const;

export type LiveRegion = keyof typeof LIVE_REGION_IDS;

// Replaces the region's text, never appends.
export function announce(region: LiveRegion, text: string): void {
  const element = document.getElementById(LIVE_REGION_IDS[region]);
  if (element) element.textContent = text;
}
