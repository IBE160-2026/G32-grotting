import { describe, expect, it, vi } from "vitest";
import { COPIED_MS, writeLazyToClipboard, writeToClipboard } from "./clipboard";

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

describe("Story 6.8 the clipboard write of a text fetched first", () => {
  class FakeItem {
    readonly parts: Record<string, Promise<Blob>>;
    constructor(parts: Record<string, Promise<Blob>>) {
      this.parts = parts;
    }
  }
  const asItem = FakeItem as unknown as typeof ClipboardItem;

  it("hands the promised text to ClipboardItem at once, so the write starts inside the press", async () => {
    let written = "";
    const write = vi.fn(async (items: ClipboardItem[]) => {
      const part = (items[0] as unknown as FakeItem).parts["text/plain"];
      written = await (await part).text();
    });
    const writeText = vi.fn(async () => {});
    const outcome = await writeLazyToClipboard(
      async () => "Brevet",
      { write, writeText } as unknown as Clipboard,
      asItem,
    );
    expect(outcome).toBe("copied");
    expect(written).toBe("Brevet");
    expect(write).toHaveBeenCalledTimes(1);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("answers unavailable when the fetch gives no text, or throws, and writes nothing", async () => {
    for (const fetchText of [
      async () => null,
      async (): Promise<string | null> => {
        throw new Error("network");
      },
    ]) {
      const write = vi.fn(async (items: ClipboardItem[]) => {
        await (items[0] as unknown as FakeItem).parts["text/plain"];
      });
      const writeText = vi.fn(async () => {});
      const outcome = await writeLazyToClipboard(
        fetchText,
        { write, writeText } as unknown as Clipboard,
        asItem,
      );
      expect(outcome).toBe("unavailable");
      expect(writeText).not.toHaveBeenCalled();
    }
  });

  it("falls back to the plain text write where ClipboardItem is missing or refused", async () => {
    const writeText = vi.fn(async () => {});
    expect(
      await writeLazyToClipboard(
        async () => "Hei",
        { writeText } as Pick<Clipboard, "writeText">,
        undefined,
      ),
    ).toBe("copied");
    expect(writeText).toHaveBeenCalledWith("Hei");

    const refused = vi.fn(async () => {
      throw new DOMException("denied", "NotAllowedError");
    });
    const second = vi.fn(async () => {});
    expect(
      await writeLazyToClipboard(
        async () => "Hei",
        { write: refused, writeText: second } as unknown as Clipboard,
        asItem,
      ),
    ).toBe("copied");
    expect(second).toHaveBeenCalledWith("Hei");
  });

  it("reports blocked when every way of writing is refused, and blocked for no clipboard", async () => {
    const refuse = vi.fn(async () => {
      throw new DOMException("denied", "NotAllowedError");
    });
    expect(
      await writeLazyToClipboard(
        async () => "Hei",
        { write: refuse, writeText: refuse } as unknown as Clipboard,
        asItem,
      ),
    ).toBe("blocked");
    expect(
      await writeLazyToClipboard(async () => "Hei", undefined, undefined),
    ).toBe("blocked");
  });
});
