import { describe, expect, it } from "vitest";
import { NAME_PLACEHOLDER, renderLetter } from "./render-letter";

const text = "Hei.\n\nMed vennlig hilsen\n{{SIGNATUR}}";

describe("FR-12 renderLetter", () => {
  it("puts the trimmed name in place of the token", () => {
    expect(renderLetter(text, "  Ola Nordmann ")).toBe(
      "Hei.\n\nMed vennlig hilsen\nOla Nordmann",
    );
  });

  it("shows the placeholder for a null or blank name", () => {
    expect(NAME_PLACEHOLDER).toBe("[Navnet ditt]");
    expect(renderLetter(text, null)).toContain("[Navnet ditt]");
    expect(renderLetter(text, "   ")).toContain("[Navnet ditt]");
    expect(renderLetter(text, "")).not.toContain("{{SIGNATUR}}");
  });

  it("keeps $ patterns in a name as typed", () => {
    expect(renderLetter(text, "A$&B $1 $$")).toBe(
      "Hei.\n\nMed vennlig hilsen\nA$&B $1 $$",
    );
  });

  it("keeps æøå in a name", () => {
    expect(renderLetter(text, "Åse Ærlig")).toContain("Åse Ærlig");
  });
});
