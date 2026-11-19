import { describe, expect, it } from "vitest";
import { letterFileName } from "./file-name";

const meta = { employer: "Nordic Digital", year: 2026 };

describe("FR-12 letterFileName", () => {
  it("has no name part for a null name", () => {
    expect(letterFileName(meta, null)).toBe(
      "soknadsbrev-nordic-digital-2026.docx",
    );
  });

  it("spells æøå out and puts the name first", () => {
    expect(letterFileName(meta, "Åse Ærlig")).toBe(
      "ase-aerlig-soknadsbrev-nordic-digital-2026.docx",
    );
    expect(letterFileName({ employer: "Bjørk & Sønn", year: 2026 }, null)).toBe(
      "soknadsbrev-bjork-sonn-2026.docx",
    );
  });

  it("strips other diacritics and collapses other characters to one hyphen", () => {
    expect(
      letterFileName({ employer: "  Café Müller -- AS! ", year: 2027 }, null),
    ).toBe("soknadsbrev-cafe-muller-as-2027.docx");
  });

  it("leaves out an empty employer or name part", () => {
    expect(letterFileName({ employer: "???", year: 2026 }, "  ")).toBe(
      "soknadsbrev-2026.docx",
    );
    expect(letterFileName({ employer: "日本", year: 2026 }, "Ola")).toBe(
      "ola-soknadsbrev-2026.docx",
    );
  });

  it("spells out ß, ł, đ, ð, þ and œ", () => {
    expect(letterFileName(meta, "Paweł Straße")).toBe(
      "pawel-strasse-soknadsbrev-nordic-digital-2026.docx",
    );
    expect(
      letterFileName({ employer: "Đorđe Ðór Þór Cœur", year: 2026 }, null),
    ).toBe("soknadsbrev-dorde-dor-thor-coeur-2026.docx");
  });

  it("caps the name and employer parts at 40 characters, without a trailing hyphen", () => {
    const long = letterFileName(
      { employer: "a".repeat(200), year: 2026 },
      "b".repeat(200),
    );
    expect(long).toBe(
      `${"b".repeat(40)}-soknadsbrev-${"a".repeat(40)}-2026.docx`,
    );
    expect(long.length).toBeLessThan(120);
    const cut = letterFileName(
      { employer: `${"a".repeat(39)} bbbb`, year: 2026 },
      null,
    );
    expect(cut).toBe(`soknadsbrev-${"a".repeat(39)}-2026.docx`);
  });

  it("is ASCII only with no leading or trailing hyphen", () => {
    const name = letterFileName(
      { employer: "—Ünï©ødé—", year: 2026 },
      "Zoë Ångström",
    );
    expect(name).toMatch(/^[a-z0-9][a-z0-9.-]*\.docx$/);
    expect(name).not.toMatch(/--/);
  });
});
