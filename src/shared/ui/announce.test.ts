import { afterEach, describe, expect, it, vi } from "vitest";
import { announce, LIVE_REGION_IDS } from "./announce";

function stubRegions() {
  const regions = {
    [LIVE_REGION_IDS.phase]: { textContent: "" },
    [LIVE_REGION_IDS.action]: { textContent: "" },
  };
  vi.stubGlobal("document", {
    getElementById: (id: string) => regions[id as keyof typeof regions],
  });
  return regions;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("UX-DR19 announce", () => {
  it("replaces the text of the chosen region and never appends", () => {
    const regions = stubRegions();
    announce("action", "Kopiert til utklippstavlen.");
    announce("action", "Lagret.");
    expect(regions[LIVE_REGION_IDS.action].textContent).toBe("Lagret.");
  });

  it("leaves the other region alone", () => {
    const regions = stubRegions();
    announce("phase", "Samsvaret er klart.");
    expect(regions[LIVE_REGION_IDS.phase].textContent).toBe(
      "Samsvaret er klart.",
    );
    expect(regions[LIVE_REGION_IDS.action].textContent).toBe("");
  });

  it("does nothing when the region is missing", () => {
    vi.stubGlobal("document", { getElementById: () => null });
    expect(() => announce("phase", "x")).not.toThrow();
  });
});
