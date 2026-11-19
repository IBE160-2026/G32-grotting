import { describe, expect, it } from "vitest";
import { normaliseLetter } from "./normalise-letter";

const TOKEN = "{{SIGNATUR}}";
const body = "Hei Nordic Digital,\n\nJeg søker stillingen.";
const count = (text: string) => text.split(TOKEN).length - 1;

describe("FR-12 normaliseLetter", () => {
  it("keeps a closing phrase and the token the AI wrote", () => {
    expect(normaliseLetter(`${body}\n\nMed vennlig hilsen\n${TOKEN}`)).toBe(
      `${body}\n\nMed vennlig hilsen\n${TOKEN}`,
    );
  });

  it("drops a written name after the closing phrase", () => {
    const result = normaliseLetter(`${body}\n\nHilsen\nOla Nordmann`);
    expect(result).toBe(`${body}\n\nHilsen\n${TOKEN}`);
    expect(result).not.toContain("Ola Nordmann");
  });

  it("drops a name on the same line as the closing phrase", () => {
    expect(normaliseLetter(`${body}\n\nMvh Ola Nordmann`)).toBe(
      `${body}\n\nMvh\n${TOKEN}`,
    );
  });

  it("drops several lines after the closing phrase", () => {
    expect(
      normaliseLetter(
        `${body}\n\nMed vennleg hilsen,\nOla Nordmann\nTlf 123\nOslo`,
      ),
    ).toBe(`${body}\n\nMed vennleg hilsen,\n${TOKEN}`);
  });

  it("adds «Med vennlig hilsen» and the token when there is no sign-off", () => {
    expect(normaliseLetter(body)).toBe(
      `${body}\n\nMed vennlig hilsen\n${TOKEN}`,
    );
  });

  it("leaves exactly one token when the AI wrote two", () => {
    const result = normaliseLetter(
      `${body}\n\nMed vennlig hilsen\n${TOKEN}\n${TOKEN}`,
    );
    expect(result).not.toBeNull();
    expect(count(result ?? "")).toBe(1);
    expect(result?.endsWith(TOKEN)).toBe(true);
  });

  it("removes a token in the middle of the text", () => {
    const result = normaliseLetter(`Hei ${TOKEN} du.\n\nMvh`);
    expect(result).toBe(`Hei  du.\n\nMvh\n${TOKEN}`);
  });

  it("finds a closing phrase in any case and ignores a word that only starts with one", () => {
    expect(normaliseLetter(`${body}\n\nVENNLIG HILSEN\nOla`)).toBe(
      `${body}\n\nVENNLIG HILSEN\n${TOKEN}`,
    );
    expect(normaliseLetter("Mvhxyz er ikke en hilsen.")).toBe(
      `Mvhxyz er ikke en hilsen.\n\nMed vennlig hilsen\n${TOKEN}`,
    );
  });

  it("ignores a closing phrase more than 6 lines from the end", () => {
    const lines = ["Hilsen", "a", "b", "c", "d", "e", "f"].join("\n");
    const result = normaliseLetter(lines);
    expect(result).toBe(`${lines}\n\nMed vennlig hilsen\n${TOKEN}`);
  });

  it("reads Windows line endings", () => {
    expect(normaliseLetter("Hei.\r\n\r\nHilsen\r\nOla")).toBe(
      `Hei.\n\nHilsen\n${TOKEN}`,
    );
  });

  it("treats «Med hilsen» and «Høflig hilsen» as closing phrases", () => {
    expect(normaliseLetter(`${body}\n\nMed hilsen\nOla Nordmann`)).toBe(
      `${body}\n\nMed hilsen\n${TOKEN}`,
    );
    expect(normaliseLetter(`${body}\n\nHøflig hilsen\nOla Nordmann`)).toBe(
      `${body}\n\nHøflig hilsen\n${TOKEN}`,
    );
  });

  it("uses the last closing line, not a body line that starts with «Hilsen»", () => {
    const text = `Hei.\n\nHilsen fra Oslo har jeg med meg erfaring.\nJeg liker faget.\n\nMed vennlig hilsen\nOla Nordmann`;
    expect(normaliseLetter(text)).toBe(
      `Hei.\n\nHilsen fra Oslo har jeg med meg erfaring.\nJeg liker faget.\n\nMed vennlig hilsen\n${TOKEN}`,
    );
  });

  it("removes token variants in any case and spacing", () => {
    for (const variant of [
      "{{SIGNATURE}}",
      "{{ SIGNATUR }}",
      "{{signatur}}",
      "{{Signatur }}",
    ]) {
      const result = normaliseLetter(`${body}\n\nMvh\n${variant}\nOla`);
      expect(result).toBe(`${body}\n\nMvh\n${TOKEN}`);
    }
  });

  it("returns null for blank text or a lone token", () => {
    expect(normaliseLetter("")).toBeNull();
    expect(normaliseLetter("  \n ")).toBeNull();
    expect(normaliseLetter(` ${TOKEN} `)).toBeNull();
    expect(normaliseLetter("{{ signature }}")).toBeNull();
  });
});
