import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { type Vocabulary, vocabularySchema } from "@/shared/core/vocabulary";
import { extractKeywords, type Keyword } from "./extract";
import { stem } from "./stem";
import { splitParagraphs, tokenise } from "./tokenise";

const VERSION = "v1-00000000";
const FILLERS = ["Alfa", "Beta", "Gamma"];
const FILLER_AD = `\n\n${FILLERS.join(" ")}`;

// Extraction needs 3 Keywords (FR-4). The fillers are added to the vocabulary
// and to the end of the ad, then left out of the answer, so a test can look at
// one term.
function found(
  ad: string,
  terms: string[],
  aliases: Record<string, string[]> = {},
): Keyword[] {
  const vocabulary: Vocabulary = {
    vocabularyVersion: VERSION,
    terms: [...terms, ...FILLERS],
    aliases,
  };
  const result = extractKeywords(ad + FILLER_AD, vocabulary);
  if (!result.ok) throw new Error("unexpected TOO_FEW_KEYWORDS");
  return result.value.filter((keyword) => !FILLERS.includes(keyword.term));
}

// The text each position points at, read from the paragraph itself.
function slices(ad: string, keyword: Keyword): string[] {
  const paragraphs = splitParagraphs(ad + FILLER_AD);
  return keyword.positions.map((position) =>
    paragraphs[position.paragraph].slice(position.start, position.end),
  );
}

describe("FR-5 extractKeywords: stages", () => {
  it("finds an inflected form once, as inflection", () => {
    const ad = "Du jobber med prosjektlederen vår.";
    const [keyword, ...rest] = found(ad, ["prosjektleder"]);
    expect(rest).toEqual([]);
    expect(keyword.term).toBe("prosjektleder");
    expect(keyword.stage).toBe("inflection");
    expect(keyword.positions).toHaveLength(1);
    expect(slices(ad, keyword)).toEqual(["prosjektlederen"]);
  });

  it.each([["front-end"], ["front end"], ["frontend"], ["Front‑End"]])(
    "finds «%s» for the term «frontend» as exact",
    (written) => {
      const ad = `Vi trenger ${written} og mer.`;
      const [keyword, ...rest] = found(ad, ["frontend"]);
      expect(rest).toEqual([]);
      expect(keyword.stage).toBe("exact");
      expect(slices(ad, keyword)).toEqual([written]);
    },
  );

  it("finds «data analyse» for «dataanalyse» as exact", () => {
    const ad = "Du kan data analyse.";
    const [keyword] = found(ad, ["dataanalyse"]);
    expect(keyword.term).toBe("dataanalyse");
    expect(keyword.stage).toBe("exact");
    expect(slices(ad, keyword)).toEqual(["data analyse"]);
  });

  it("finds the inflected form of a multi-word term, word by word", () => {
    const ad = "Du skriver pull request hver dag.";
    const [keyword] = found(ad, ["pull requests"]);
    expect(keyword.stage).toBe("inflection");
    expect(slices(ad, keyword)).toEqual(["pull request"]);
  });

  it("finds a split and inflected compound as compound", () => {
    const ad = "Du har erfaring med prosjekt-ledelsen her.";
    const [keyword] = found(ad, ["prosjektledelse"]);
    expect(keyword.stage).toBe("compound");
    expect(slices(ad, keyword)).toEqual(["prosjekt-ledelsen"]);
  });

  it("finds a Keyword through an alias, as alias", () => {
    const ad = "Vi jobber smidig her.";
    const [keyword, ...rest] = found(ad, ["Agile"], { Agile: ["smidig"] });
    expect(rest).toEqual([]);
    expect(keyword.term).toBe("Agile");
    expect(keyword.stage).toBe("alias");
    expect(slices(ad, keyword)).toEqual(["smidig"]);
  });

  it("calls a term form that is also an alias match exact, not alias", () => {
    const [keyword] = found("Vi bruker Agile.", ["Agile"], {
      Agile: ["smidig", "agile"],
    });
    expect(keyword.stage).toBe("exact");
  });

  it("takes the stage of the first position", () => {
    const ad = "Vi jobber smidig.\n\nVi bruker Agile.";
    const [keyword] = found(ad, ["Agile"], { Agile: ["smidig"] });
    expect(keyword.stage).toBe("alias");
    expect(keyword.positions).toHaveLength(2);
  });

  it("keeps a trailing + or # on C++ and C#", () => {
    const ad = "Du kan C++ og C#, men ikke C.";
    const keywords = found(ad, ["C++", "C#"]);
    expect(keywords.map((keyword) => keyword.term)).toEqual(["C++", "C#"]);
    expect(slices(ad, keywords[0])).toEqual(["C++"]);
    expect(slices(ad, keywords[1])).toEqual(["C#"]);
  });
});

describe("FR-5 extractKeywords: positions", () => {
  it("gives one Keyword with every place and correct offsets", () => {
    const ad = "Du kan React og React.\n\nNoen sier react.";
    const [keyword, ...rest] = found(ad, ["React"]);
    expect(rest).toEqual([]);
    expect(keyword.positions).toEqual([
      { paragraph: 0, start: 7, end: 12 },
      { paragraph: 0, start: 16, end: 21 },
      { paragraph: 1, start: 10, end: 15 },
    ]);
    expect(slices(ad, keyword)).toEqual(["React", "React", "react"]);
  });

  it("gives the same offsets for CRLF and LF text", () => {
    const lf = "Du kan React.\n\nOg Git.";
    const crlf = lf.replace(/\n/g, "\r\n");
    expect(found(crlf, ["React", "Git"])).toEqual(found(lf, ["React", "Git"]));
  });

  it("lists Keywords in order of first position, not vocabulary order", () => {
    const ad = "Først Git, så React, så Git.";
    expect(found(ad, ["React", "Git"]).map((k) => k.term)).toEqual([
      "Git",
      "React",
    ]);
  });

  it("does not match across paragraphs", () => {
    const ad = "Vi vil ha universell\n\nutforming.";
    expect(found(ad, ["universell utforming"])).toEqual([]);
  });
});

describe("FR-5 extractKeywords: what must stay apart", () => {
  it("does not find «prosjektledelse» or «leder» from «ledelse» alone", () => {
    const ad = "Du har ledelse og ledelsen.";
    expect(found(ad, ["prosjektledelse", "leder"])).toEqual([]);
  });

  it("does not find «leder» in «ledelse», nor «ledelse» in «leder»", () => {
    expect(found("Du blir leder.", ["ledelse"])).toEqual([]);
    expect(found("Du har ledelse.", ["leder"])).toEqual([]);
  });

  it("does not find a term in a longer unrelated word", () => {
    expect(found("Du kan Javascript-tekst.", ["Java"])).toEqual([]);
  });
});

describe("FR-5 extractKeywords: spans", () => {
  it("does not join tokens across a sentence end or a line break", () => {
    expect(found("Vi kan data. Analyse er bra.", ["dataanalyse"])).toEqual([]);
    expect(found("Vi kan data\nanalyse.", ["dataanalyse"])).toEqual([]);
    expect(found("Vi kan data, analyse.", ["dataanalyse"])).toEqual([]);
  });

  it("joins tokens across spaces and dashes", () => {
    const ad = "Vi kan data analyse og data-analyse og data – analyse.";
    const [keyword] = found(ad, ["dataanalyse"]);
    expect(slices(ad, keyword)).toEqual([
      "data analyse",
      "data-analyse",
      "data – analyse",
    ]);
  });

  it("joins tokens across a lone dot or slash, as in «Node.js»", () => {
    const ad = "Vi bruker Node.js og CI/CD.";
    const keywords = found(ad, ["Node.js", "CI/CD"]);
    expect(keywords.map((keyword) => slices(ad, keyword)[0])).toEqual([
      "Node.js",
      "CI/CD",
    ]);
  });

  it("does not let a short word glue on to a match", () => {
    const ad = "Solbakken sykehjem er et sted.";
    const [keyword] = found(ad, ["sykehjem"]);
    expect(slices(ad, keyword)).toEqual(["sykehjem"]);
  });

  it("finds both terms in «HTML+CSS»", () => {
    const ad = "Du kan HTML+CSS.";
    const keywords = found(ad, ["HTML", "CSS"]);
    expect(keywords.map((keyword) => keyword.term)).toEqual(["HTML", "CSS"]);
    expect(keywords.map((keyword) => slices(ad, keyword)[0])).toEqual([
      "HTML",
      "CSS",
    ]);
  });

  it("joins across an opening parenthesis after a space, not a closing one", () => {
    expect(
      found("Vi vil ha Power (BI) her.", ["Power BI"]).map((k) => k.term),
    ).toEqual(["Power BI"]);
    expect(found("Vi vil ha Power) BI her.", ["Power BI"])).toEqual([]);
  });

  it("keeps the whole phrase, with stage exact, over its own alias", () => {
    const [keyword] = found(
      "Du dokumenterer i pasientjournal.",
      ["dokumenterer i pasientjournal"],
      { "dokumenterer i pasientjournal": ["pasientjournal"] },
    );
    expect(keyword.stage).toBe("exact");
    expect(keyword.positions).toHaveLength(1);
  });

  it("matches a 5-token term but never a 6-token one", () => {
    const five = found("Vi vil ha en to tre fire fem.", ["en to tre fire fem"]);
    expect(five.map((keyword) => keyword.term)).toEqual(["en to tre fire fem"]);
    expect(
      found("Vi vil ha en to tre fire fem seks.", ["en to tre fire fem seks"]),
    ).toEqual([]);
  });

  it("finds an NFD ad text for an NFC term, with offsets in the ad as written", () => {
    const written = "sa\u030Arvurdering";
    const ad = `Du kan ${written} her.`;
    const [keyword] = found(ad, ["sårvurdering"]);
    expect(keyword.stage).toBe("exact");
    expect(slices(ad, keyword)).toEqual([written]);
  });

  it("finds an alias in an inflected form, as alias", () => {
    const ad = "Du jobber med prosjektlederen vår.";
    const [keyword] = found(ad, ["Prosjekt"], { Prosjekt: ["prosjektleder"] });
    expect(keyword.term).toBe("Prosjekt");
    expect(keyword.stage).toBe("alias");
    expect(slices(ad, keyword)).toEqual(["prosjektlederen"]);
  });

  it("does not read an alias key such as «constructor» from the prototype", () => {
    const vocabulary: Vocabulary = {
      vocabularyVersion: VERSION,
      terms: ["constructor", "toString", "Alfa", "Beta"],
      aliases: {},
    };
    const result = extractKeywords(
      "constructor toString Alfa Beta",
      vocabulary,
    );
    expect(result.ok && result.value.map((k) => k.term)).toEqual([
      "constructor",
      "toString",
      "Alfa",
      "Beta",
    ]);
  });
});

describe("FR-5 extractKeywords: overlaps", () => {
  it("keeps the longest span", () => {
    const ad = "Du bryr deg om universell utforming.";
    const keywords = found(ad, ["utforming", "universell utforming"]);
    expect(keywords.map((keyword) => keyword.term)).toEqual([
      "universell utforming",
    ]);
    expect(slices(ad, keywords[0])).toEqual(["universell utforming"]);
  });

  it("still finds the shorter term where the longer one is absent", () => {
    const ad = "Utforming betyr mye. Universell utforming også.";
    const keywords = found(ad, ["utforming", "universell utforming"]);
    expect(keywords.map((keyword) => keyword.term).sort()).toEqual([
      "universell utforming",
      "utforming",
    ]);
    const shorter = keywords.find((keyword) => keyword.term === "utforming");
    expect(shorter?.positions).toHaveLength(1);
    expect(slices(ad, shorter as Keyword)).toEqual(["Utforming"]);
  });

  it("lets the earlier of two equally long overlapping spans win", () => {
    const vocabulary: Vocabulary = {
      vocabularyVersion: VERSION,
      terms: ["beta gamma", "alfa beta", "Delta", "Epsilon"],
      aliases: {},
    };
    const result = extractKeywords(
      "Vi bruker alfa beta gamma.\n\nDelta Epsilon",
      vocabulary,
    );
    expect(result.ok && result.value.map((k) => k.term)).toEqual([
      "alfa beta",
      "Delta",
      "Epsilon",
    ]);
  });

  it("breaks a tie on the same span by vocabulary order", () => {
    const vocabulary: Vocabulary = {
      vocabularyVersion: VERSION,
      terms: ["Delta", "Epsilon", "Zeta", "Eta"],
      aliases: { Eta: ["epsilon"] },
    };
    const result = extractKeywords("Delta Epsilon Zeta", vocabulary);
    expect(result.ok && result.value.map((k) => k.term)).toEqual([
      "Delta",
      "Epsilon",
      "Zeta",
    ]);
  });
});

describe("FR-4 extractKeywords: too few Keywords", () => {
  const vocabulary: Vocabulary = {
    vocabularyVersion: VERSION,
    terms: ["Alfa", "Beta", "Gamma", "Delta"],
    aliases: {},
  };

  it("returns TOO_FEW_KEYWORDS for fewer than 3 distinct Keywords", () => {
    expect(extractKeywords("", vocabulary)).toEqual({
      ok: false,
      error: "TOO_FEW_KEYWORDS",
    });
    expect(extractKeywords("Alfa Beta", vocabulary)).toEqual({
      ok: false,
      error: "TOO_FEW_KEYWORDS",
    });
  });

  it("counts a repeated Keyword once", () => {
    expect(extractKeywords("Alfa Alfa Alfa Beta Beta", vocabulary).ok).toBe(
      false,
    );
  });

  it("returns the list for 3 distinct Keywords", () => {
    const result = extractKeywords("Alfa Beta Gamma", vocabulary);
    expect(result.ok && result.value).toHaveLength(3);
  });
});

describe("FR-5 vocabulary file", () => {
  const raw = readFileSync("data/vocabulary/nb.json", "utf8");
  const vocabulary = vocabularySchema.parse(JSON.parse(raw));

  const forms = vocabulary.terms.flatMap((term) => [
    { term, form: term },
    ...(Object.hasOwn(vocabulary.aliases, term)
      ? vocabulary.aliases[term]
      : []
    ).map((form) => ({ term, form })),
  ]);

  it("has a vocabularyVersion that matches its contents", () => {
    const hash = createHash("sha256")
      .update(
        JSON.stringify({
          terms: vocabulary.terms,
          aliases: vocabulary.aliases,
        }),
      )
      .digest("hex")
      .slice(0, 8);
    // On a failure the contents changed: set vocabularyVersion to this value.
    expect(vocabulary.vocabularyVersion).toBe(`v1-${hash}`);
  });

  it("is a curated list of about 250 terms", () => {
    expect(vocabulary.terms.length).toBeGreaterThanOrEqual(200);
    expect(vocabulary.terms.length).toBeLessThanOrEqual(320);
  });

  it("writes every term and alias with 1 to 5 tokens and more than a letter", () => {
    for (const { form } of forms) {
      const tokens = tokenise(form);
      expect(tokens.length, form).toBeGreaterThanOrEqual(1);
      expect(tokens.length, form).toBeLessThanOrEqual(5);
      expect(form.replace(/\s/g, "").length, form).toBeGreaterThan(1);
    }
  });

  it("has no two entries with the same stem form", () => {
    const owners = new Map<string, string>();
    const clashes: string[] = [];
    for (const { term, form } of forms) {
      const words = tokenise(form).map((token) => token.text);
      const keys = new Set([words.map(stem).join(" "), stem(words.join(" "))]);
      for (const key of keys) {
        const owner = owners.get(key);
        if (owner !== undefined) {
          clashes.push(`«${form}» (${term}) clashes with ${owner}`);
        }
        owners.set(key, `«${form}» (${term})`);
      }
    }
    expect(clashes).toEqual([]);
  });

  it("finds every term and alias again, as its own term", () => {
    const missing: string[] = [];
    for (const { term, form } of forms) {
      const ad = `Vi ser etter ${form} her.\n\nHTML CSS Git`;
      const result = extractKeywords(ad, vocabulary);
      const keywords = result.ok ? result.value : [];
      if (!keywords.some((keyword) => keyword.term === term)) {
        missing.push(`«${form}» (${term})`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe("NFR-6 Fixtures", () => {
  const vocabulary = vocabularySchema.parse(
    JSON.parse(readFileSync("data/vocabulary/nb.json", "utf8")),
  );
  const root = join("data", "fixtures");
  const ids = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name);

  it("has Fixtures to test", () => {
    expect(ids.length).toBeGreaterThanOrEqual(3);
  });

  // Terms clearly written in each ad, with the stage extraction gives them.
  const expected: Record<string, [string, string, string][]> = {
    "example-nordic-digital": [
      ["universell utforming", "exact", "universell utforming"],
      ["React", "exact", "React"],
      ["REST API", "exact", "REST API"],
      ["responsive nettsider", "exact", "responsive nettsider"],
      ["junior frontendutvikler", "exact", "Junior frontendutvikler"],
    ],
    "nursing-sarvurdering": [
      ["sårvurdering", "exact", "sårvurdering"],
      ["sykepleier", "exact", "Sykepleier"],
      ["legemiddelhåndtering", "exact", "legemiddelhåndtering"],
    ],
    "two-column-fjord-analytics": [
      ["prosjektledelse", "exact", "prosjektledelse"],
      ["Power BI", "exact", "Power BI"],
      ["SQL", "exact", "SQL"],
      ["bachelor i økonomi", "exact", "bachelor i økonomi"],
    ],
  };

  // The keys of a written form: token-wise stems and the stem of the joined text.
  const keysOf = (text: string) => {
    const words = tokenise(text).map((token) => token.text);
    return [words.map(stem).join(" "), stem(words.join(" "))];
  };

  for (const id of ids) {
    it(`finds the terms written in ${id} at the right place, as text`, () => {
      const ad = readFileSync(join(root, id, "ad.txt"), "utf8");
      const result = extractKeywords(ad, vocabulary);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const paragraphs = splitParagraphs(ad);
      const textOf = (keyword: Keyword) =>
        keyword.positions.map(({ paragraph, start, end }) =>
          paragraphs[paragraph].slice(start, end),
        );

      for (const [term, stage, firstText] of expected[id] ?? []) {
        const keyword = result.value.find((found) => found.term === term);
        expect(keyword, term).toBeDefined();
        expect(keyword?.stage, term).toBe(stage);
        expect(textOf(keyword as Keyword)[0], term).toBe(firstText);
      }

      // Every position reads as one of the term's own forms.
      for (const keyword of result.value) {
        const forms = [
          keyword.term,
          ...(Object.hasOwn(vocabulary.aliases, keyword.term)
            ? vocabulary.aliases[keyword.term]
            : []),
        ].flatMap(keysOf);
        for (const text of textOf(keyword)) {
          expect(text, keyword.term).not.toBe("");
          expect(text, keyword.term).not.toMatch(/[.,;:!?\n]/);
          expect(
            keysOf(text).some((key) => forms.includes(key)),
            `${keyword.term}: «${text}»`,
          ).toBe(true);
        }
      }
    });

    it(`extracts the same list twice from ${id}, with positions in the ad`, () => {
      const ad = readFileSync(join(root, id, "ad.txt"), "utf8");
      const first = extractKeywords(ad, vocabulary);
      const second = extractKeywords(ad, vocabulary);
      expect(first).toEqual(second);
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      expect(first.value.length).toBeGreaterThanOrEqual(3);

      const paragraphs = splitParagraphs(ad);
      const terms = first.value.map((keyword) => keyword.term);
      expect(new Set(terms).size).toBe(terms.length);
      for (const keyword of first.value) {
        expect(keyword.positions.length).toBeGreaterThanOrEqual(1);
        for (const { paragraph, start, end } of keyword.positions) {
          expect(paragraphs[paragraph]).toBeDefined();
          expect(start).toBeGreaterThanOrEqual(0);
          expect(end).toBeGreaterThan(start);
          expect(end).toBeLessThanOrEqual(paragraphs[paragraph].length);
        }
      }
    });
  }
});
