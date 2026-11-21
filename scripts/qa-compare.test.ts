import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { answerKeySchema } from "@/shared/core/answer-key";
import { vocabularySchema } from "@/shared/core/vocabulary";
import { compareAll, evaluateGaps, formatReport } from "./qa-compare";

const EXAMPLE = "example-nordic-digital";
const dir = `data/fixtures/${EXAMPLE}`;
const answerKey = answerKeySchema.parse(
  JSON.parse(readFileSync(`${dir}/answer-key.json`, "utf8")),
);
const cvText = readFileSync(`${dir}/cv.txt`, "utf8");
const planted = (name: string) =>
  JSON.parse(readFileSync(`data/fixtures/_planted/${name}.json`, "utf8"));

const vocabulary = vocabularySchema.parse(
  JSON.parse(readFileSync("data/vocabulary/nb.json", "utf8")),
);
const NURSING = "nursing-sarvurdering";
const nursingKey = answerKeySchema.parse(
  JSON.parse(readFileSync(`data/fixtures/${NURSING}/answer-key.json`, "utf8")),
);
const nursingCv = readFileSync(`data/fixtures/${NURSING}/cv.txt`, "utf8");
const nursing = (name: string) =>
  evaluateGaps({
    answerKey: nursingKey,
    cvText: nursingCv,
    output: planted(name).data,
    vocabulary,
  });

const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

describe("G2 qa-compare evaluateGaps on planted outputs", () => {
  it("reports a must-never-suggest keyword that is Rewordable with a citation that is in the CV", () => {
    const evaluation = evaluateGaps({
      answerKey,
      cvText,
      output: planted("gaps-g2-rest-api-rewordable").data,
    });
    expect(evaluation.g2Failures).toEqual(["REST-API"]);
    expect(evaluation.g2Caught).toEqual([]);
    expect(evaluation.downgraded).toBe(0);
    expect(evaluation.gaps.map((gap) => gap.kind)).toEqual([
      "real",
      "rewordable",
      "real",
      "real",
      "real",
    ]);
  });

  it("does not count a Rewordable that FR-15 caught as a failure, but names it", () => {
    const evaluation = evaluateGaps({
      answerKey,
      cvText,
      output: planted("gaps-g2-rest-api-invented-citation").data,
    });
    expect(evaluation.g2Failures).toEqual([]);
    expect(evaluation.g2Caught).toEqual(["REST-API"]);
    expect(evaluation.downgraded).toBe(1);
  });

  it("finds no failure when every must-never-suggest keyword is Real", () => {
    const evaluation = evaluateGaps({
      answerKey,
      cvText,
      output: planted("gaps-citation-exact-case-and-line-breaks").data,
    });
    expect(evaluation.g2Failures).toEqual([]);
    expect(evaluation.g2Caught).toEqual([]);
  });

  it("treats an item for a keyword the Missing list does not spell that way as skipped, so a template Real gap", () => {
    const output = planted("gaps-g2-rest-api-rewordable").data;
    output.gaps[1].keyword = "REST API-er";
    const evaluation = evaluateGaps({ answerKey, cvText, output });
    expect(evaluation.g2Failures).toEqual([]);
    expect(evaluation.gaps[1]?.kind).toBe("real");
  });

  it("refuses an output that is not a Gaps answer", () => {
    expect(() =>
      evaluateGaps({ answerKey, cvText, output: { nope: 1 } }),
    ).toThrow("no list of gaps");
  });
});

describe("G4 qa-compare evaluateGaps on planted outputs (Story 5.4, SM-5)", () => {
  it("counts an expected Rewordable gap whose suggestion passed FR-17", () => {
    const evaluation = nursing("gaps-fr17-kept-no-upgrade");
    expect(evaluation.g4Expected).toEqual(
      nursingKey.gaps.rewordable.map((gap) => gap.keyword),
    );
    expect(evaluation.g4Expected).toHaveLength(7);
    expect(evaluation.g4Found).toEqual(["sårvurdering"]);
    expect(evaluation.discarded).toBe(0);
    expect(evaluation.g2Failures).toEqual([]);
  });

  it("does not count a suggestion FR-17 discarded for an Upgrade word the CV entry lacks, though the gap stays Rewordable", () => {
    const evaluation = nursing("gaps-fr17-upgrade-exam-paper-as-research");
    expect(evaluation.g4Found).toEqual([]);
    expect(evaluation.discarded).toBe(1);
    const gap = evaluation.gaps.find((item) => item.keyword === "sårvurdering");
    expect(gap?.kind).toBe("rewordable");
    expect(gap?.suggestion).toBeNull();
    expect(gap?.citation).not.toBeNull();
  });

  it("does not count a suggestion that names another Missing keyword", () => {
    const evaluation = nursing("gaps-fr17-names-other-missing-keyword");
    expect(evaluation.g4Found).toEqual([]);
    expect(evaluation.discarded).toBe(1);
  });

  it("does not count a Rewordable gap with no suggestion, or one FR-15 downgraded", () => {
    const output = planted("gaps-fr17-kept-no-upgrade").data;
    output.gaps[0].suggestion = null;
    expect(
      evaluateGaps({ answerKey: nursingKey, cvText: nursingCv, output })
        .g4Found,
    ).toEqual([]);
    const invented = evaluateGaps({
      answerKey,
      cvText,
      output: planted("gaps-g2-rest-api-invented-citation").data,
    });
    expect(invented.g4Found).toEqual([]);
    expect(invented.downgraded).toBe(1);
  });

  it("counts only the Answer key's expected Rewordable gaps: a Rewordable gap that is must-never-suggest is a G2 failure and no G4 hit", () => {
    const evaluation = evaluateGaps({
      answerKey,
      cvText,
      output: planted("gaps-g2-rest-api-rewordable").data,
    });
    expect(evaluation.g2Failures).toEqual(["REST-API"]);
    expect(evaluation.g4Expected).toEqual([
      "pull requests",
      "testing",
      "responsive nettsider",
    ]);
    expect(evaluation.g4Found).toEqual([]);
  });

  it("holds a suggestion against a keyword that only the output asks about, so G4 is not flattered", () => {
    const output = planted("gaps-fr17-kept-no-upgrade").data;
    output.gaps.push({
      keyword: "dokumentasjon",
      kind: "real",
      explanation: "Annonsen ber om dokumentasjon. CV-en viser ikke dette.",
      citation: null,
      suggestion: null,
    });
    output.gaps[0].suggestion = "Kompetanse i sårvurdering og dokumentasjon";
    const evaluation = evaluateGaps({
      answerKey: nursingKey,
      cvText: nursingCv,
      output,
      vocabulary,
    });
    expect(evaluation.g4Found).toEqual([]);
    expect(evaluation.discarded).toBe(1);
  });
});

describe("G2 qa-compare compareAll", () => {
  // A folder of live outputs in the layout `<id>/gaps.json`.
  function outputsWith(name: string): string {
    const root = mkdtempSync(join(tmpdir(), "qa-compare-"));
    folders.push(root);
    mkdirSync(join(root, EXAMPLE));
    cpSync(
      `data/fixtures/_planted/${name}.json`,
      join(root, EXAMPLE, "gaps.json"),
    );
    return root;
  }

  it("reports Fixture and keyword per G2 failure, skips Fixtures with no output, and fails", async () => {
    const { text, failed } = await compareAll({
      outputsDir: outputsWith("gaps-g2-rest-api-rewordable"),
    });
    expect(failed).toBe(true);
    expect(text).toContain(`G2 FAIL ${EXAMPLE}: «REST-API» is Rewordable`);
    expect(text).toContain(
      `${EXAMPLE}: 5 gaps, 1 rewordable, 4 real, 0 downgraded by FR-15`,
    );
    expect(text).toContain("held-out-regnskap-kvale: no gaps output found");
    expect(text).toContain("G2: 1 failure");
  });

  it("reports the G4 count in the same report as the G2 failures, and G4 alone does not fail the run", async () => {
    const failing = await compareAll({
      outputsDir: outputsWith("gaps-g2-rest-api-rewordable"),
    });
    expect(failing.failed).toBe(true);
    expect(failing.text).toContain(`G2 FAIL ${EXAMPLE}: «REST-API»`);
    expect(failing.text).toContain(
      `G4 ${EXAMPLE}: 0 of 3 expected Rewordable gaps shown with a suggestion that passed FR-17`,
    );
    expect(failing.text).toContain(`G4 not shown ${EXAMPLE}: «testing»`);
    expect(failing.text).toContain(
      "G4: 0 of 3 expected Rewordable gaps found and shown with a suggestion that passed FR-17",
    );

    const root = mkdtempSync(join(tmpdir(), "qa-compare-"));
    folders.push(root);
    mkdirSync(join(root, NURSING));
    cpSync(
      "data/fixtures/_planted/gaps-fr17-kept-no-upgrade.json",
      join(root, NURSING, "gaps.json"),
    );
    const passing = await compareAll({ outputsDir: root });
    expect(passing.failed).toBe(false);
    expect(passing.text).toContain(
      `G4 ${NURSING}: 1 of 7 expected Rewordable gaps shown with a suggestion that passed FR-17`,
    );
    expect(passing.text).toContain("0 suggestions discarded by FR-17");
    expect(passing.text).toContain("G2: no must-never-suggest keyword is");
    expect(passing.text).toContain("G4: 1 of 7 expected Rewordable gaps found");
  });

  it("counts a discarded suggestion and does not count it as found", async () => {
    const root = mkdtempSync(join(tmpdir(), "qa-compare-"));
    folders.push(root);
    mkdirSync(join(root, NURSING));
    cpSync(
      "data/fixtures/_planted/gaps-fr17-upgrade-exam-paper-as-research.json",
      join(root, NURSING, "gaps.json"),
    );
    const { text } = await compareAll({ outputsDir: root });
    expect(text).toContain("1 suggestion discarded by FR-17");
    expect(text).toContain(`G4 ${NURSING}: 0 of 7`);
    expect(text).toContain(`G4 not shown ${NURSING}: «sårvurdering»`);
  });

  it("reads the Cached Gaps of the Example pair and counts its 3 expected Rewordable gaps", async () => {
    const { text } = await compareAll({});
    // The exact counts are pinned on planted outputs above; the Cached Gaps
    // change with a re-recording.
    expect(text).toMatch(
      /G4 example-nordic-digital: \d of 3 expected Rewordable gaps shown with a suggestion that passed FR-17/,
    );
    expect(text).toMatch(/G4: \d+ of \d+ expected Rewordable gaps found/);
  });

  it("passes when no must-never-suggest keyword is Rewordable", async () => {
    const { text, failed } = await compareAll({
      outputsDir: outputsWith("gaps-citation-exact-case-and-line-breaks"),
    });
    expect(failed).toBe(false);
    expect(text).toContain("G2: no must-never-suggest keyword is Rewordable");
  });

  it("names a Rewordable that FR-15 caught without failing the run", async () => {
    const { text, failed } = await compareAll({
      outputsDir: outputsWith("gaps-g2-rest-api-invented-citation"),
    });
    expect(failed).toBe(false);
    expect(text).toContain(`G2 caught by FR-15 ${EXAMPLE}: «REST-API»`);
  });

  it("names a Fixture whose output cannot be read, still compares the others, and fails", async () => {
    const root = outputsWith("gaps-g2-rest-api-rewordable");
    mkdirSync(join(root, "nursing-sarvurdering"));
    writeFileSync(join(root, "nursing-sarvurdering", "gaps.json"), "not json");
    const { text, failed } = await compareAll({ outputsDir: root });
    expect(failed).toBe(true);
    expect(text).toContain(
      "nursing-sarvurdering: the gaps output could not be read",
    );
    expect(text).toContain(`G2 FAIL ${EXAMPLE}: «REST-API» is Rewordable`);
    expect(text).not.toContain("not json");
  });

  it("fails when there is no output at all", async () => {
    const root = mkdtempSync(join(tmpdir(), "qa-compare-"));
    folders.push(root);
    const { failed } = await compareAll({ outputsDir: root });
    expect(failed).toBe(true);
  });

  it("formats the summary line for several failures", () => {
    const evaluation = evaluateGaps({
      answerKey,
      cvText,
      output: planted("gaps-g2-rest-api-rewordable").data,
    });
    const meta = { promptVersion: "gaps-2", model: "m" };
    const text = formatReport(
      [
        { id: "a", evaluation, meta },
        { id: "b", evaluation, meta },
      ],
      [],
    );
    expect(text).toContain("G2 FAIL a: «REST-API»");
    expect(text).toContain("G2 FAIL b: «REST-API»");
    expect(text).toContain("G2: 2 failures");
  });
});
