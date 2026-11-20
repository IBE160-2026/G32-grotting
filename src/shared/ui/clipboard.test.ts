import { describe, expect, it, vi } from "vitest";
import { COPIED_MS, writeToClipboard } from "./clipboard";

describe("FR-12 the clipboard write", () => {
  it("writes the plain text and says so", async () => {
    const writeText = vi.fn(async () => {});
    expect(await writeToClipboard("Hei", { writeText })).toBe(true);
    expect(writeText).toHaveBeenCalledWith("Hei");
  });

  it("reports a refused write as blocked, without throwing", async () => {
    const writeText = vi.fn(async () => {
      throw new DOMException("denied", "NotAllowedError");
    });
    expect(await writeToClipboard("Hei", { writeText })).toBe(false);
  });

  it("reports a missing clipboard as blocked", async () => {
    expect(await writeToClipboard("Hei", undefined)).toBe(false);
    expect(
      await writeToClipboard(
        "Hei",
        {} as unknown as Pick<Clipboard, "writeText">,
      ),
    ).toBe(false);
  });

  it("holds «Kopiert» for 1.8 s", () => {
    expect(COPIED_MS).toBe(1800);
  });
});
