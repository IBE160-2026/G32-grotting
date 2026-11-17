import { describe, expect, it } from "vitest";
import type { Vocabulary } from "@/shared/core/vocabulary";
import { findKeyword } from "./find";

function vocabularyOf(
  terms: string[],
  aliases: Record<string, string[]> = {},
): Vocabulary {
  return { vocabularyVersion: "v1-00000000", terms, aliases };
}

const hit = (
  text: string,
  term: string,
  aliases: Record<string, string[]> = {},
) => findKeyword(text, { term }, vocabularyOf([term], aliases));

// The text a hit points at.
const slice = (h: { text: string; start: number; end: number }) =>
  h.text.slice(h.start, h.end);

describe("FR-6 findKeyword: stages and Evidence", () => {
  it("finds an inflection with its line number and offsets", () => {
    const cv = "Praksis\n- Utførte sårstellene til beboerne.\nFerdigheter";
    const [found, ...rest] = hit(cv, "sårstell");
    expect(rest).toEqual([]);
    expect(found.stage).toBe("inflection");
    expect(found.line).toBe(2);
    expect(found.text).toBe("- Utførte sårstellene til beboerne.");
    expect(slice(found)).toBe("sårstellene");
  });

  it("finds a split compound as exact, and a split inflected one as compound", () => {
    const [split] = hit("- Data analyse: Utforskende analyse.", "dataanalyse");
    expect(split.stage).toBe("exact");
    expect(slice(split)).toBe("Data analyse");
    expect(split.line).toBe(1);

    const [spaced] = hit("Jeg tok prosjekt ledelse.", "prosjektledelse");
    expect(spaced.stage).toBe("exact");

    const [inflected] = hit("Data analysene var fine.", "dataanalyse");
    expect(inflected.stage).toBe("compound");
  });

  it("finds a hyphen variant as exact", () => {
    const [found] = hit("Jobbet med front-end.", "frontend");
    expect(found.stage).toBe("exact");
  });

  it("finds an alias, also in another form, as alias", () => {
    const aliases = { Agile: ["smidig"] };
    expect(hit("Vi jobbet smidig i gruppa.", "Agile", aliases)[0].stage).toBe(
      "alias",
    );
    expect(hit("Smidige metoder.", "Agile", aliases)[0].stage).toBe("alias");
  });

  it("ignores case", () => {
    const [found] = hit("Kunnskap om REACT.", "React");
    expect(found.stage).toBe("exact");
    expect(slice(found)).toBe("REACT");
  });

  it("finds a term across parentheses, as in «norsk (morsmål)»", () => {
    const [found] = hit("Språk: norsk (morsmål), engelsk.", "norskkunnskaper", {
      norskkunnskaper: ["norsk morsmål"],
    });
    expect(found.stage).toBe("alias");
    expect(slice(found)).toBe("norsk (morsmål");
  });

  it("gives every hit in text order", () => {
    const cv = "Git her\n\nIngenting\nOg Git igjen, git til slutt";
    const hits = hit(cv, "Git");
    expect(hits.map((h) => [h.line, slice(h)])).toEqual([
      [1, "Git"],
      [4, "Git"],
      [4, "git"],
    ]);
  });

  it("gives the same lines and offsets for CRLF and LF", () => {
    const lf = "Navn\nProfil\nJeg bruker Git og React.\n";
    const crlf = lf.replace(/\n/g, "\r\n");
    expect(hit(crlf, "React")).toEqual(hit(lf, "React"));
    expect(hit(crlf, "React")[0].line).toBe(3);
    expect(hit(lf.replace(/\n/g, "\r"), "React")[0].line).toBe(3);
  });

  it("counts blank lines in the line number", () => {
    expect(hit("a\n\n\nGit", "Git")[0].line).toBe(4);
  });

  it("finds a word with a soft hyphen or zero-width space inside", () => {
    for (const code of [0xad, 0x200b]) {
      const mark = String.fromCharCode(code);
      expect(hit(`Jeg kan Re${mark}act.`, "React")).toHaveLength(1);
    }
  });
});

describe("FR-6 findKeyword: what must not match", () => {
  it("does not find «prosjektledelse» from «ledelse» alone", () => {
    expect(hit("Organisasjon og ledelse: team.", "prosjektledelse")).toEqual(
      [],
    );
  });

  it("does not find «ledelse» in «prosjektledelse»", () => {
    expect(hit("Jeg har prosjektledelse.", "ledelse")).toEqual([]);
  });

  it("does not find a term whose words are split by a line break", () => {
    expect(hit("Jeg kan Power\nBI godt.", "Power BI")).toEqual([]);
  });

  it("does not find a term in a longer unrelated word", () => {
    expect(hit("GitHub og JavaScript.", "Git")).toEqual([]);
  });

  it("does not use another term's aliases", () => {
    const vocabulary = vocabularyOf(["Agile", "Scrum"], {
      Agile: ["smidig"],
    });
    expect(
      findKeyword("Vi var smidige.", { term: "Scrum" }, vocabulary),
    ).toEqual([]);
  });

  it("gives nothing for a term that is not in the vocabulary", () => {
    expect(
      findKeyword("Git", { term: "Git" }, vocabularyOf(["React"])),
    ).toEqual([]);
  });

  it("gives nothing for an empty CV and does not throw", () => {
    expect(hit("", "Git")).toEqual([]);
    expect(hit("\n\n", "Git")).toEqual([]);
  });

  it("does not read an alias key such as «constructor» from the prototype", () => {
    expect(hit("Jeg kan constructor.", "Git")).toEqual([]);
  });
});
