import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { buildLetterDocx, letterParagraphs } from "./build-docx";

const text =
  "Hei Nordic Digital,\n\nJeg søker <jobben> & mer.\n\nMed vennlig hilsen\n{{SIGNATUR}}";

describe("FR-12 the .docx builder", () => {
  it("splits the rendered Letter into paragraphs, with the sign-off as the placeholder", () => {
    expect(letterParagraphs(text)).toEqual([
      "Hei Nordic Digital,",
      "Jeg søker <jobben> & mer.",
      "Med vennlig hilsen\n[Navnet ditt]",
    ]);
  });

  it("builds a Word file whose body holds every paragraph, and no token", async () => {
    const blob = await buildLetterDocx(text);
    expect(blob.type).toContain("wordprocessingml.document");
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    const xml = strFromU8(files["word/document.xml"] ?? new Uint8Array());
    expect(xml).toContain("Hei Nordic Digital,");
    expect(xml).toContain("Jeg søker &lt;jobben&gt; &amp; mer.");
    expect(xml).toContain("Med vennlig hilsen");
    expect(xml).toContain("[Navnet ditt]");
    expect(xml).not.toContain("SIGNATUR");
    // One paragraph per block, and a line break inside the sign-off.
    expect(xml.match(/<w:p[ >]/g)).toHaveLength(3);
    expect(xml).toContain("<w:br/>");
  });
});

describe("Story 6.6 the .docx with a name", () => {
  it("signs the last paragraph with the name", () => {
    expect(letterParagraphs(text, "Violet Hansen")).toEqual([
      "Hei Nordic Digital,",
      "Jeg søker <jobben> & mer.",
      "Med vennlig hilsen\nViolet Hansen",
    ]);
  });

  it("keeps the placeholder for no name or a blank one", () => {
    for (const name of [undefined, null, "   "]) {
      expect(letterParagraphs(text, name).at(-1)).toBe(
        "Med vennlig hilsen\n[Navnet ditt]",
      );
    }
  });

  it("builds a Word file that holds the name and no placeholder", async () => {
    const blob = await buildLetterDocx(text, "Violet Hansen");
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    const xml = strFromU8(files["word/document.xml"] ?? new Uint8Array());
    expect(xml).toContain("Violet Hansen");
    expect(xml).not.toContain("[Navnet ditt]");
    expect(xml).not.toContain("SIGNATUR");
  });
});
