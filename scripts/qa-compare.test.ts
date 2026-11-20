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
import { compareAll, evaluateGaps, formatReport } from "./qa-compare";

const EXAMPLE = "example-nordic-digital";
const dir = `data/fixtures/${EXAMPLE}`;
const answerKey = answerKeySchema.parse(
  JSON.parse(readFileSync(`${dir}/answer-key.json`, "utf8")),
);
const cvText = readFileSync(`${dir}/cv.txt`, "utf8");
const planted = (name: string) =>
  JSON.parse(readFileSync(`data/fixtures/_planted/${name}.json`, "utf8"));

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
