import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { extractCvText } from "./extract";

function file(name: string): Uint8Array {
  return new Uint8Array(
    readFileSync(
      fileURLToPath(new URL(`../../../../e2e/files/${name}`, import.meta.url)),
    ),
  );
}

const bytes = (text: string) => new TextEncoder().encode(text);

describe("FR-1 extractCvText", () => {
  it("reads the text of a PDF", async () => {
    const result = await extractCvText("text-cv.pdf", file("text-cv.pdf"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.noText).toBe(false);
    expect(result.value.text).toContain("frontendutvikler med React");
    expect(result.value.text).not.toContain("\r");
  });

  it("reports a PDF without text as noText with empty text", async () => {
    const result = await extractCvText("scanned.pdf", file("scanned.pdf"));
    expect(result).toEqual({ ok: true, value: { text: "", noText: true } });
  });

  it("reads a TXT as UTF-8 and turns CRLF and CR into LF", async () => {
    const result = await extractCvText("cv.txt", bytes("a\r\nb\rc\nd æøå"));
    expect(result).toEqual({
      ok: true,
      value: { text: "a\nb\nc\nd æøå", noText: false },
    });
  });

  it("removes a byte order mark", async () => {
    const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...bytes("Hei")]);
    const result = await extractCvText("cv.txt", withBom);
    expect(result).toEqual({ ok: true, value: { text: "Hei", noText: false } });
  });

  it("treats an empty or whitespace-only TXT as noText", async () => {
    expect(await extractCvText("a.txt", bytes(""))).toEqual({
      ok: true,
      value: { text: "", noText: true },
    });
    expect(await extractCvText("a.txt", bytes(" \r\n\t "))).toEqual({
      ok: true,
      value: { text: "", noText: true },
    });
  });

  it("judges the type by the extension, case-insensitively", async () => {
    expect((await extractCvText("CV.TXT", bytes("Hei"))).ok).toBe(true);
    expect(await extractCvText("cv.docx", bytes("Hei"))).toEqual({
      ok: false,
      error: "FILE_TYPE",
    });
  });

  it("answers FILE_TYPE for bytes that are not a PDF, or a PDF that cannot be opened", async () => {
    expect(await extractCvText("cv.pdf", bytes("not a pdf"))).toEqual({
      ok: false,
      error: "FILE_TYPE",
    });
    expect(await extractCvText("cv.pdf", bytes("%PDF-1.4 broken"))).toEqual({
      ok: false,
      error: "FILE_TYPE",
    });
  });
});
