import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Vocabulary } from "@/shared/core/vocabulary";
import { loadVocabulary } from "@/shared/server/data-files";
import { type CheckableGap, checkCitation } from "./check-citation";
import { checkLetter } from "./check-letter";
import { UPGRADE_WORDS } from "./word-lists";

const vocabulary: Vocabulary = {
  vocabularyVersion: "v1-00000000",
  terms: ["TypeScript", "REST-API", "React"],
  aliases: {},
};

const CV = "Jeg skrev komponenter i React og lærte Git.";

function check(
  letter: string,
  overrides: Partial<Parameters<typeof checkLetter>[0]> = {},
) {
  return checkLetter({
    letter,
    cvText: CV,
    jobTitle: "Frontendutvikler",
    employer: "Nordic Digital",
    missing: [{ term: "TypeScript" }, { term: "REST-API" }],
    gaps: null,
    vocabulary,
    ...overrides,
  });
}

const slice = (text: string, span: { start: number; end: number }) =>
  text.slice(span.start, span.end);

describe("FR-11 checkLetter: Unsupported claims", () => {
  it("flags a Missing keyword in the Letter, with its spans", () => {
    const letter = "Hei.\n\nJeg kan TypeScript godt.";
    const flags = check(letter);
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      kind: "UNSUPPORTED_CLAIM",
      term: "TypeScript",
      word: "TypeScript",
    });
    expect(flags[0]?.spans.map((span) => slice(letter, span))).toEqual([
      "TypeScript",
    ]);
  });

  it("gives one flag with two spans for the same word twice, word as first written", () => {
    const letter = "typescript her.\nOg TypeScript der.";
    const flags = check(letter);
    expect(flags).toHaveLength(1);
    expect(flags[0]?.word).toBe("typescript");
    expect(flags[0]?.spans.map((span) => slice(letter, span))).toEqual([
      "typescript",
      "TypeScript",
    ]);
  });

  it("counts CRLF and lone CR as one character in the offsets", () => {
    const letter = "Hei\r\nog\rTypeScript";
    const flags = check(letter);
    expect(flags[0]?.spans).toEqual([{ start: 7, end: 17 }]);
    expect(letter.replace(/\r\n?/g, "\n").slice(7, 17)).toBe("TypeScript");
  });

  it("does not flag a Keyword that is not Missing", () => {
    expect(check("Jeg kan React.")).toEqual([]);
  });

  it("skips the job title, the employer and the sign-off, even when they hold a Missing keyword", () => {
    const flags = check(
      "Til Nordic TypeScript Digital\n\nSøknad som TypeScript-utvikler\n\nMed hilsen\n{{SIGNATUR}}",
      {
        jobTitle: "typescript-utvikler",
        employer: "Nordic  TypeScript\nDigital",
        missing: [{ term: "TypeScript" }],
      },
    );
    expect(flags).toEqual([]);
  });

  it("keeps offsets after a blanked name", () => {
    const letter = "Nordic Digital liker TypeScript.";
    const flags = check(letter);
    expect(slice(letter, flags[0]?.spans[0] ?? { start: 0, end: 0 })).toBe(
      "TypeScript",
    );
  });

  it("FR-5b flags a Missing keyword that is not in the vocabulary, as an AI-proposed one is", () => {
    const flags = check("Jeg kan Rust.", { missing: [{ term: "Rust" }] });
    expect(flags.map((flag) => flag.term)).toEqual(["Rust"]);
    expect(flags[0]?.spans).toEqual([{ start: 8, end: 12 }]);
  });
});

describe("FR-11 checkLetter: skipped names are whole words", () => {
  it("does not blank a longer Letter word that holds a short title or employer", () => {
    const letter = "Datasystemer i Frontendutvikler-rollen med TypeScript.";
    const flags = check(letter, {
      jobTitle: "Data",
      employer: "Utvikler",
      missing: [{ term: "TypeScript" }],
    });
    expect(flags.map((flag) => flag.term)).toEqual(["TypeScript"]);
    expect(flags[0]?.spans[0]).toEqual({ start: 43, end: 53 });
  });

  it("still skips a title that stands alone, also next to punctuation", () => {
    expect(
      check("Stilling: (TypeScript). Hei.", {
        jobTitle: "TypeScript",
        missing: [{ term: "TypeScript" }],
      }),
    ).toEqual([]);
  });

  it("hides a flag in a longer word no more: «Datasystemer» is checked", () => {
    const flags = check("Jeg kan Datasystemer.", {
      jobTitle: "Data",
      missing: [{ term: "Datasystemer" }],
      vocabulary: { ...vocabulary, terms: ["Datasystemer"] },
    });
    expect(flags).toHaveLength(1);
  });
});

describe("FR-11 checkLetter: Upgrade words", () => {
  it("flags «ledet» when the CV has no form of «lede»", () => {
    const letter = "Jeg ledet gruppen.";
    const flags = check(letter);
    expect(flags).toEqual([
      {
        kind: "UPGRADE_WORD",
        term: "ledet",
        word: "ledet",
        spans: [{ start: 4, end: 9 }],
      },
    ]);
  });

  it("is cleared by another form of the word in the CV", () => {
    expect(check("Jeg ledet gruppen.", { cvText: "Jeg er leder." })).toEqual(
      [],
    );
    expect(
      check("Jeg ledet gruppen.", { cvText: "Jeg leder en gruppe." }),
    ).toEqual([]);
  });

  it("is not cleared by a different word that shares letters", () => {
    expect(
      check("Jeg ledet gruppen.", { cvText: "Ledelse av grupper." }),
    ).toHaveLength(1);
  });

  it("matches a phrase by stems, and the CV holding the phrase clears it", () => {
    const letter = "Jeg var ansvarlig for tester.";
    const flags = check(letter);
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      kind: "UPGRADE_WORD",
      term: "ansvarlig for",
      word: "ansvarlig for",
    });
    expect(
      check(letter, { cvText: "Jeg var ansvarlig for skjemaene." }),
    ).toEqual([]);
    expect(
      check("Jeg var ansvarlig  for tester.", {
        cvText: "Jeg var ansvarlig for skjemaene.",
      }),
    ).toEqual([]);
  });

  it("does not match a phrase split by punctuation or a line break", () => {
    expect(check("Jeg var ansvarlig, for tester.")).toEqual([]);
    expect(check("Jeg var ansvarlig\nfor tester.")).toEqual([]);
  });

  it("gives one flag with all spans for a word used twice", () => {
    const letter = "Jeg forsket på dette.\nVi forsket mer.";
    const flags = check(letter);
    expect(flags).toHaveLength(1);
    expect(flags[0]?.spans.map((span) => slice(letter, span))).toEqual([
      "forsket",
      "forsket",
    ]);
  });

  it("skips an Upgrade word inside the job title or the employer", () => {
    expect(
      check("Rollen ledet.\n\nGrunnla Digital.", {
        jobTitle: "Rollen ledet",
        employer: "Grunnla Digital",
      }),
    ).toEqual([]);
  });

  it("clears «ansvarlig for» when the CV says «ansvar for», and flags it when the CV has neither", () => {
    const letter = "Jeg var ansvarlig for tester.";
    expect(
      check(letter, { cvText: "Jeg hadde ansvar for skjemaene." }),
    ).toEqual([]);
    expect(check(letter, { cvText: "Jeg skrev skjemaene." })).toHaveLength(1);
  });

  it("keeps the list short", () => {
    expect(UPGRADE_WORDS.length).toBeLessThanOrEqual(8);
  });
});

describe("FR-11 checkLetter: order and clean Letters", () => {
  it("orders the flags of both kinds by their first span", () => {
    const flags = check("Jeg ledet.\n\nJeg kan TypeScript.\n\nJeg forsket.");
    expect(flags.map((flag) => flag.term)).toEqual([
      "ledet",
      "TypeScript",
      "forsket",
    ]);
  });

  it("returns no flags for a clean Letter and does not change it", () => {
    const letter = "Hei.\n\nJeg kan React.\n\nMed hilsen\n{{SIGNATUR}}";
    const copy = String(letter);
    expect(check(letter)).toEqual([]);
    expect(letter).toBe(copy);
  });
});

describe("FR-11 the planted Letter (Example pair)", () => {
  const dir = "data/fixtures/example-nordic-digital";
  const meta = JSON.parse(readFileSync(`${dir}/meta.json`, "utf8")) as {
    jobTitle: string;
    employer: string;
  };
  const key = JSON.parse(readFileSync(`${dir}/answer-key.json`, "utf8")) as {
    keywords: { missing: string[] };
  };
  const planted = (
    JSON.parse(
      readFileSync("data/fixtures/_planted/letter-flags.json", "utf8"),
    ) as { data: { text: string } }
  ).data.text;

  it("flags the Real-gap Keyword and the Upgrade word, and nothing else", async () => {
    const flags = checkLetter({
      letter: planted,
      cvText: readFileSync(`${dir}/cv.txt`, "utf8"),
      jobTitle: meta.jobTitle,
      employer: meta.employer,
      missing: key.keywords.missing.map((term) => ({ term })),
      gaps: null,
      vocabulary: await loadVocabulary(),
    });
    expect(flags.map((flag) => [flag.kind, flag.term, flag.word])).toEqual([
      ["UNSUPPORTED_CLAIM", "TypeScript", "TypeScript"],
      ["UPGRADE_WORD", "ledet", "ledet"],
    ]);
    expect(flags[0]?.spans).toHaveLength(2);
    for (const flag of flags) {
      expect(flag.word).toBe(
        planted.slice(flag.spans[0]?.start, flag.spans[0]?.end),
      );
      for (const span of flag.spans) {
        expect(planted.slice(span.start, span.end)).not.toContain("\n");
      }
    }
    // The job title, the employer and the sign-off are in the Letter, unflagged.
    expect(planted).toContain(meta.jobTitle);
    expect(planted).toContain(meta.employer);
    expect(planted).toContain("{{SIGNATUR}}");
  });
});

describe("FR-11 the Example pair's Cached Letters", () => {
  const dir = "data/fixtures/example-nordic-digital";
  const meta = JSON.parse(readFileSync(`${dir}/meta.json`, "utf8")) as {
    jobTitle: string;
    employer: string;
  };
  const key = JSON.parse(readFileSync(`${dir}/answer-key.json`, "utf8")) as {
    keywords: { missing: string[] };
  };

  it.each(["formell", "personlig", "direkte"])(
    "the %s Letter has no flag at all",
    async (tone) => {
      const letter = (
        JSON.parse(
          readFileSync(`${dir}/cached/letter-${tone}.json`, "utf8"),
        ) as {
          data: { text: string };
        }
      ).data.text;
      const flags = checkLetter({
        letter,
        cvText: readFileSync(`${dir}/cv.txt`, "utf8"),
        jobTitle: meta.jobTitle,
        employer: meta.employer,
        missing: key.keywords.missing.map((term) => ({ term })),
        gaps: null,
        vocabulary: await loadVocabulary(),
      });
      expect(flags).toEqual([]);
    },
  );
});

describe("FR-11 checkLetter: Rewordable gaps the CV supports (Example pair)", () => {
  const dir = "data/fixtures/example-nordic-digital";
  const cvText = readFileSync(`${dir}/cv.txt`, "utf8");
  const meta = JSON.parse(readFileSync(`${dir}/meta.json`, "utf8")) as {
    jobTitle: string;
    employer: string;
  };
  const key = JSON.parse(readFileSync(`${dir}/answer-key.json`, "utf8")) as {
    keywords: { missing: string[] };
  };
  type PlantedGaps = { data: { gaps: CheckableGap[] } };
  const read = (path: string) =>
    (JSON.parse(readFileSync(path, "utf8")) as PlantedGaps).data.gaps;
  // The recorded Cached Gaps: «testing» is Rewordable with a citation that
  // stands in the CV; the planted «one word changed» response has the same
  // Keyword Rewordable with a citation that does not.
  const cached = read(`${dir}/cached/gaps.json`);
  const failing = read(
    "data/fixtures/_planted/gaps-citation-one-word-changed.json",
  );
  const planted = (
    JSON.parse(
      readFileSync("data/fixtures/_planted/letter-flags.json", "utf8"),
    ) as { data: { text: string } }
  ).data.text;
  // The planted Letter, with one more sentence that names «testing».
  const letter = planted.replace(
    "\n\nMed vennlig hilsen",
    "\n\nJeg har skrevet tester for skjemaer, og testing liker jeg.\n\nMed vennlig hilsen",
  );

  async function flagsWith(gaps: readonly CheckableGap[] | null) {
    return checkLetter({
      letter,
      cvText,
      jobTitle: meta.jobTitle,
      employer: meta.employer,
      missing: key.keywords.missing.map((term) => ({ term })),
      gaps,
      vocabulary: await loadVocabulary(),
    });
  }
  const terms = (flags: { term: string }[]) => flags.map((flag) => flag.term);

  it("the fixture holds what the tests lean on", () => {
    expect(letter).not.toBe(planted);
    const passing = cached.find((gap) => gap.keyword === "testing");
    const bad = failing.find((gap) => gap.keyword === "testing");
    expect(passing?.kind).toBe("rewordable");
    expect(bad?.kind).toBe("rewordable");
    expect(checkCitation(passing as CheckableGap, cvText)).toBe(true);
    expect(checkCitation(bad as CheckableGap, cvText)).toBe(false);
  });

  it("flags «testing» as an Unsupported claim without Gap analysis", async () => {
    expect(terms(await flagsWith(null))).toEqual([
      "TypeScript",
      "ledet",
      "testing",
    ]);
  });

  it("does not flag «testing» when it is a Rewordable gap whose citation passes again", async () => {
    expect(terms(await flagsWith(cached))).toEqual(["TypeScript", "ledet"]);
  });

  it("flags «testing» when the same Keyword is Rewordable with a citation that fails", async () => {
    expect(terms(await flagsWith(failing))).toEqual([
      "TypeScript",
      "ledet",
      "testing",
    ]);
  });

  it("keeps the Real-gap Keyword, the Upgrade word and the job title as without Gap analysis", async () => {
    const flags = await flagsWith(cached);
    expect(flags.map((flag) => [flag.kind, flag.term])).toEqual([
      ["UNSUPPORTED_CLAIM", "TypeScript"],
      ["UPGRADE_WORD", "ledet"],
    ]);
    expect(planted).toContain(meta.jobTitle);
  });

  it("flags a Real gap even when it carries a citation that stands in the CV", async () => {
    const forged = cached.map((gap) =>
      gap.keyword === "TypeScript"
        ? { ...gap, citation: "Jeg skrev enkle tester for skjemaene våre." }
        : gap,
    );
    expect(terms(await flagsWith(forged))).toContain("TypeScript");
  });

  it("flags a Rewordable gap with no or an empty citation, and one for another Keyword", async () => {
    const none = cached.map((gap) =>
      gap.keyword === "testing" ? { ...gap, citation: null } : gap,
    );
    const empty = cached.map((gap) =>
      gap.keyword === "testing" ? { ...gap, citation: "" } : gap,
    );
    const other = cached.map((gap) =>
      gap.keyword === "testing" ? { ...gap, keyword: "enhetstesting" } : gap,
    );
    for (const gaps of [none, empty, other]) {
      expect(terms(await flagsWith(gaps))).toContain("testing");
    }
  });

  it("clears the Keyword for a citation that differs only in case and white space", async () => {
    const reflowed = cached.map((gap) =>
      gap.keyword === "testing"
        ? { ...gap, citation: "JEG skrev  enkle\ntester for skjemaene våre." }
        : gap,
    );
    expect(terms(await flagsWith(reflowed))).not.toContain("testing");
  });
});
