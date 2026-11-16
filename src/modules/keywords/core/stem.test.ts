import { describe, expect, it } from "vitest";
import { sameWord, stem } from "./stem";

const sameGroups: string[][] = [
  ["utvikler", "utviklere", "utviklerne", "utvikleren", "Utviklerens"],
  ["prosjektleder", "prosjektlederen", "prosjektledere", "prosjektlederne"],
  ["front-end", "front end", "frontend", "Front\u2011End"],
  ["data analyse", "dataanalyse", "Data-analyse"],
  ["SÅRVURDERING", "s\u00E5rvurdering", "sa\u030Arvurdering"],
  ["ledelse", "ledelsen", "ledelser", "ledelsene", "ledelses", "ledelsens"],
  ["prosjektledelse", "prosjektledelsen", "prosjektledelser"],
];

const differentPairs: [string, string][] = [
  ["ledelse", "leder"],
  ["prosjektledelse", "prosjektleder"],
  ["data", "dataanalyse"],
  ["analyse", "analytiker"],
  ["utvikling", "utvikler"],
  ["sårvurdering", "saarvurdering"],
];

describe("FR-6 stem", () => {
  for (const group of sameGroups) {
    it(`stems alike: ${group.join(", ")}`, () => {
      const stems = new Set(group.map(stem));
      expect([...stems]).toHaveLength(1);
      for (const a of group) {
        for (const b of group) {
          expect(sameWord(a, b)).toBe(true);
        }
      }
    });
  }

  for (const [a, b] of differentPairs) {
    it(`keeps «${a}» and «${b}» apart`, () => {
      expect(stem(a)).not.toBe(stem(b));
      expect(sameWord(a, b)).toBe(false);
    });
  }

  it("falls back from agent-noun plurals to the «-er» form before Snowball", () => {
    expect(stem("utviklere")).toBe(stem("utvikler"));
    expect(stem("utviklerne")).toBe(stem("utvikler"));
  });

  it("marks «-else» nouns so they differ from «-er» nouns", () => {
    expect(stem("ledelse")).not.toBe(stem("leder"));
    expect(stem("prosjektledelse")).not.toBe(stem("prosjektleder"));
  });

  it("gives an empty string for empty or blank input without throwing", () => {
    expect(stem("")).toBe("");
    expect(stem("  ")).toBe("");
    expect(sameWord("", "  ")).toBe(true);
  });

  it("stems a term with a space next to a digit word by word", () => {
    expect(stem("ISO 27001")).toBe("iso 27001");
    expect(stem("C++ utviklere")).toBe(stem("c++ utvikler"));
  });

  it("is deterministic: same input, same output, run twice", () => {
    const words = sameGroups.flat().concat(differentPairs.flat());
    const first = words.map(stem);
    const second = words.map(stem);
    expect(second).toEqual(first);
  });
});
