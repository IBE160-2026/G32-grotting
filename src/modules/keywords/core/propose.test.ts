import { describe, expect, it } from "vitest";
import type { Vocabulary } from "@/shared/core/vocabulary";
import { proposeKeywords } from "./propose";
import { splitParagraphs } from "./tokenise";

const vocabulary: Vocabulary = {
  vocabularyVersion: "v1-00000000",
  terms: ["Excel", "Power BI"],
  aliases: { Excel: ["regneark"] },
};

const AD = [
  "Vi søker en regnskapsmedarbeider.",
  "Du kan Altinn, mva-oppgjør og lønnskjøring. Erfaring med Excel er en fordel.",
  "Du kjenner Altinn godt.",
].join("\n\n");

const termsOf = (proposed: string[]) =>
  proposeKeywords(AD, proposed, vocabulary).map(({ term }) => term);

describe("FR-5b proposeKeywords", () => {
  it("keeps a proposed term the ad contains, including one outside the vocabulary", () => {
    expect(termsOf(["Altinn", "mva-oppgjør"])).toEqual([
      "Altinn",
      "mva-oppgjør",
    ]);
  });

  it("drops a proposed term the ad does not contain", () => {
    expect(termsOf(["Altinn", "Kubernetes", "Python"])).toEqual(["Altinn"]);
  });

  it("drops a term that only shares part of a longer word", () => {
    expect(termsOf(["Altin", "regnskap"])).toEqual([]);
  });

  it("counts a duplicate once, ignoring case and spacing", () => {
    expect(termsOf(["Altinn", " altinn ", "ALTINN"])).toEqual(["Altinn"]);
  });

  it("uses the vocabulary's spelling and aliases for a term it holds", () => {
    const kept = proposeKeywords(
      "Du bruker regneark hver dag. Jobbe i Excel og Altinn.",
      ["excel", "Altinn"],
      vocabulary,
    );
    expect(kept.map(({ term }) => term)).toEqual(["Excel", "Altinn"]);
    expect(kept[0].stage).toBe("alias");
  });

  it("orders by first position in the ad, not by the order proposed", () => {
    expect(termsOf(["Excel", "lønnskjøring", "Altinn"])).toEqual([
      "Altinn",
      "lønnskjøring",
      "Excel",
    ]);
  });

  it("gives the same list for the same proposal in another order (NFR-6)", () => {
    expect(termsOf(["Excel", "Altinn", "mva-oppgjør"])).toEqual(
      termsOf(["mva-oppgjør", "Altinn", "Excel"]),
    );
  });

  it("gives every position of a term, pointing at its words in the paragraph", () => {
    const [altinn] = proposeKeywords(AD, ["Altinn"], vocabulary);
    const paragraphs = splitParagraphs(AD);
    expect(altinn.positions).toHaveLength(2);
    expect(
      altinn.positions.map((p) =>
        paragraphs[p.paragraph].slice(p.start, p.end),
      ),
    ).toEqual(["Altinn", "Altinn"]);
  });

  it("drops blank, over-long and unreadable proposals without throwing", () => {
    expect(termsOf(["", "   ", "###", "a ".repeat(60)])).toEqual([]);
    expect(termsOf([])).toEqual([]);
  });

  it("does not read «constructor» from the prototype as an alias key", () => {
    expect(
      proposeKeywords(
        "Vi bruker constructor.",
        ["constructor"],
        vocabulary,
      ).map(({ term }) => term),
    ).toEqual(["constructor"]);
  });
});
