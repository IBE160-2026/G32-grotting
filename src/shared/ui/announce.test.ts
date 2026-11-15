import { afterEach, describe, expect, it, vi } from "vitest";
import { announce, LIVE_REGION_IDS } from "./announce";

function stubRegions() {
  const regions = {
    [LIVE_REGION_IDS.phase]: { textContent: "" },
    [LIVE_REGION_IDS.action]: { textContent: "" },
  };
  const frames = new Map<number, () => void>();
  let next = 1;
  vi.stubGlobal("document", {
    getElementById: (id: string) => regions[id as keyof typeof regions],
  });
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => {
    frames.set(next, callback);
    return next++;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  const nextFrame = () => {
    for (const [id, callback] of [...frames]) {
      frames.delete(id);
      callback();
    }
  };
  return { regions, nextFrame };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("UX-DR19 announce", () => {
  it("replaces the text of the chosen region and never appends", () => {
    const { regions, nextFrame } = stubRegions();
    announce("action", "Kopiert til utklippstavlen.");
    announce("action", "Lagret.");
    nextFrame();
    expect(regions[LIVE_REGION_IDS.action].textContent).toBe("Lagret.");
  });

  it("empties the region first and fills it in the next frame", () => {
    const { regions, nextFrame } = stubRegions();
    announce("action", "Feil tilgangskode.");
    nextFrame();
    announce("action", "Feil tilgangskode.");
    expect(regions[LIVE_REGION_IDS.action].textContent).toBe("");
    nextFrame();
    expect(regions[LIVE_REGION_IDS.action].textContent).toBe(
      "Feil tilgangskode.",
    );
  });

  it("leaves the other region alone", () => {
    const { regions, nextFrame } = stubRegions();
    announce("phase", "Samsvaret er klart.");
    nextFrame();
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
