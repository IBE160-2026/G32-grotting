import { existsSync, readdirSync, realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { aiResultMetaSchema } from "@/modules/ai/contracts";
import { stripContactDetails } from "@/modules/ai/core/strip-contact";
import type { Gap } from "@/modules/gaps/contracts";
import {
  checkGapCitations,
  checkGapSuggestions,
  structureGaps,
} from "@/modules/gaps/server/analyse";
import { gapsOutputSchema } from "@/modules/gaps/server/prompts/gaps";
import { normalise } from "@/modules/keywords/core";
import { type AnswerKey, answerKeySchema } from "@/shared/core/answer-key";
import { type Vocabulary, vocabularySchema } from "@/shared/core/vocabulary";

// The G2 check of the Gap output (docs/qa, Story 4.3, FR-13): given a set of
// live Gaps outputs, it reports every must-never-suggest keyword of the Answer
// key that became Rewordable, per Fixture. «Became Rewordable» is judged the
// way the app does it: the raw answer goes through the structure step and the
// FR-15 citation check, and a keyword that is still Rewordable afterwards is a
// G2 failure (the Student would be told the CV shows it). A keyword the model
// called Rewordable that FR-15 caught is reported as well, as a «caught» line:
// the safety net held, but the prompt did not. It never edits an Answer key or
// a prompt, and it makes no request.
// Usage: npm run qa:compare [-- --dir <folder>]
// The folder holds `<fixture-id>/gaps.json` or `<fixture-id>/cached/gaps.json`;
// it is `data/fixtures` when no folder is given.
//
// It also counts G4 (SM-5, Story 5.4): how many of the Answer key's expected
// Rewordable gaps the app found and showed with a suggestion that passed FR-17.
// «Showed» is judged the way the app does it, with rewording on: structure
// step, FR-15, then FR-17 (`checkGapSuggestions`). G4 is a count to read, not a
// verdict: only a G2 failure (or an unreadable output) makes the run fail.

const FIXTURES_DIR = fileURLToPath(
  new URL("../data/fixtures", import.meta.url),
);
const VOCABULARY_FILE = fileURLToPath(
  new URL("../data/vocabulary/nb.json", import.meta.url),
);

export type GapsEvaluation = {
  // The Gaps the Student would see: structure step, then FR-15.
  readonly gaps: readonly Gap[];
  // Gaps FR-15 turned into the template.
  readonly downgraded: number;
  // Must-never-suggest keywords that are Rewordable in `gaps`.
  readonly g2Failures: readonly string[];
  // Must-never-suggest keywords the model called Rewordable and FR-15 caught.
  readonly g2Caught: readonly string[];
  // Suggestions FR-17 discarded (the Gap stays Rewordable, with no suggestion).
  readonly discarded: number;
  // G4: the Answer key's expected Rewordable gaps, and those of them that the
  // Student would see as Rewordable with a suggestion that passed FR-17.
  readonly g4Expected: readonly string[];
  readonly g4Found: readonly string[];
};

/**
 * Judges one Fixture's raw Gaps output against its Answer key. The Missing
 * keywords are the Answer key's, in its order, as the recorder asked for them.
 * Suggestions are read with rewording on, as in the app: structure step, FR-15,
 * then FR-17. FR-17 holds a suggestion against the whole Missing list the AI
 * was asked about: the Answer key's, plus any other keyword the output answers
 * (the recorder adds the ones phase 1 finds in Test mode). A longer list can
 * only discard more, so G4 is never flattered. Throws when the output is not a
 * Gaps answer.
 */
export function evaluateGaps(input: {
  readonly answerKey: AnswerKey;
  readonly cvText: string;
  readonly output: unknown;
  // The Keyword vocabulary, so FR-17 finds a Missing keyword by its aliases
  // too, as the app does. Without it a keyword is found by its own words.
  readonly vocabulary?: Vocabulary;
}): GapsEvaluation {
  const { answerKey } = input;
  const parsed = gapsOutputSchema.safeParse(input.output);
  if (!parsed.success) throw new Error("The output has no list of gaps");
  const missing = answerKey.keywords.missing;
  const structured = structureGaps(missing, parsed.data.gaps, true);
  // Citations and suggestions are checked against the CV text the model was
  // sent.
  const sentCvText = stripContactDetails(input.cvText);
  const checked = checkGapCitations(structured, sentCvText);
  const askedAbout = [...missing];
  for (const { keyword } of parsed.data.gaps) {
    const key = normalise(keyword);
    if (key !== "" && !askedAbout.some((term) => normalise(term) === key)) {
      askedAbout.push(keyword);
    }
  }
  const guarded = checkGapSuggestions(
    checked.gaps,
    askedAbout,
    sentCvText,
    input.vocabulary,
  );
  const shown = (keyword: string) =>
    guarded.gaps.some(
      (gap) =>
        gap.kind === "rewordable" &&
        gap.suggestion !== null &&
        normalise(gap.keyword) === normalise(keyword),
    );
  const expected = answerKey.gaps.rewordable.map(({ keyword }) => keyword);
  const rewordable = (gaps: readonly Gap[], keyword: string) =>
    gaps.some(
      (gap) =>
        gap.kind === "rewordable" &&
        normalise(gap.keyword) === normalise(keyword),
    );
  const never = answerKey.mustNeverSuggest.map(({ keyword }) => keyword);
  return {
    gaps: guarded.gaps,
    downgraded: checked.downgraded,
    discarded: guarded.discarded,
    g4Expected: expected,
    g4Found: expected.filter(shown),
    g2Failures: never.filter((keyword) => rewordable(checked.gaps, keyword)),
    g2Caught: never.filter(
      (keyword) =>
        rewordable(structured, keyword) && !rewordable(checked.gaps, keyword),
    ),
  };
}

export type FixtureReport = {
  readonly id: string;
  readonly evaluation: GapsEvaluation;
  readonly meta: { readonly promptVersion: string; readonly model: string };
};

/** The report as text: one block per Fixture, Fixture and keyword per failure. */
export function formatReport(
  reports: readonly FixtureReport[],
  skipped: readonly string[],
  unreadable: readonly string[] = [],
): string {
  const lines: string[] = [];
  for (const { id, evaluation, meta } of reports) {
    const { gaps } = evaluation;
    const count = (kind: Gap["kind"]) =>
      gaps.filter((gap) => gap.kind === kind).length;
    lines.push(
      `${id}: ${gaps.length} gaps, ${count("rewordable")} rewordable, ${count("real")} real, ${evaluation.downgraded} downgraded by FR-15, ${evaluation.discarded} suggestion${evaluation.discarded === 1 ? "" : "s"} discarded by FR-17 (${meta.promptVersion}, ${meta.model})`,
    );
    for (const keyword of evaluation.g2Failures) {
      lines.push(`  G2 FAIL ${id}: «${keyword}» is Rewordable`);
    }
    for (const keyword of evaluation.g2Caught) {
      lines.push(
        `  G2 caught by FR-15 ${id}: «${keyword}» was called Rewordable, its citation is not in the CV`,
      );
    }
    const missed = evaluation.g4Expected.filter(
      (keyword) => !evaluation.g4Found.includes(keyword),
    );
    lines.push(
      `  G4 ${id}: ${evaluation.g4Found.length} of ${evaluation.g4Expected.length} expected Rewordable gaps shown with a suggestion that passed FR-17`,
    );
    for (const keyword of missed) {
      lines.push(`  G4 not shown ${id}: «${keyword}»`);
    }
  }
  for (const id of skipped) lines.push(`${id}: no gaps output found, skipped`);
  for (const id of unreadable) {
    lines.push(
      `${id}: the gaps output could not be read, so it is not compared`,
    );
  }
  const failures = reports.reduce(
    (sum, report) => sum + report.evaluation.g2Failures.length,
    0,
  );
  lines.push(
    reports.length === 0
      ? "G2: no output was compared"
      : failures === 0
        ? "G2: no must-never-suggest keyword is Rewordable"
        : `G2: ${failures} failure${failures === 1 ? "" : "s"}`,
  );
  if (reports.length > 0) {
    const found = reports.reduce(
      (sum, report) => sum + report.evaluation.g4Found.length,
      0,
    );
    const expected = reports.reduce(
      (sum, report) => sum + report.evaluation.g4Expected.length,
      0,
    );
    lines.push(
      `G4: ${found} of ${expected} expected Rewordable gaps found and shown with a suggestion that passed FR-17 (${expected === 0 ? 0 : Math.round((100 * found) / expected)} %; a count, not a verdict; SM-5 asks for at least 70 %)`,
    );
  }
  return `${lines.join("\n")}\n`;
}

async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await readFile(file, "utf8"));
}

/**
 * Compares every Fixture that has a Gaps output under `outputsDir`. A Fixture
 * without one is skipped and named. `failed` is true on any G2 failure, or when
 * no Fixture had an output at all.
 */
export async function compareAll(options: {
  readonly fixturesDir?: string;
  readonly outputsDir?: string;
}): Promise<{ text: string; failed: boolean }> {
  const fixturesDir = options.fixturesDir ?? FIXTURES_DIR;
  const outputsDir = options.outputsDir ?? fixturesDir;
  const ids = readdirSync(fixturesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .sort();
  const vocabulary = vocabularySchema.parse(await readJson(VOCABULARY_FILE));
  const reports: FixtureReport[] = [];
  const skipped: string[] = [];
  const unreadable: string[] = [];
  for (const id of ids) {
    const file = [
      join(outputsDir, id, "gaps.json"),
      join(outputsDir, id, "cached", "gaps.json"),
    ].find((candidate) => existsSync(candidate));
    if (file === undefined) {
      skipped.push(id);
      continue;
    }
    try {
      const [answerKey, cvText, output] = await Promise.all([
        readJson(join(fixturesDir, id, "answer-key.json")).then((json) =>
          answerKeySchema.parse(json),
        ),
        readFile(join(fixturesDir, id, "cv.txt"), "utf8"),
        readJson(file),
      ]);
      const meta = aiResultMetaSchema.parse(
        (output as { meta?: unknown } | null)?.meta,
      );
      const data = (output as { data?: unknown } | null)?.data;
      reports.push({
        id,
        evaluation: evaluateGaps({
          answerKey,
          cvText,
          output: data,
          vocabulary,
        }),
        meta: { promptVersion: meta.promptVersion, model: meta.model },
      });
    } catch {
      // One bad file must not hide the other Fixtures' failures. Only the
      // Fixture is named, never the file's content.
      unreadable.push(id);
    }
  }
  const failed =
    reports.length === 0 ||
    unreadable.length > 0 ||
    reports.some((report) => report.evaluation.g2Failures.length > 0);
  return { text: formatReport(reports, skipped, unreadable), failed };
}

function isEntryPoint(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isEntryPoint()) {
  try {
    const args = process.argv.slice(2);
    const flag = args.indexOf("--dir");
    const outputsDir = flag === -1 ? undefined : args[flag + 1];
    if (flag !== -1 && outputsDir === undefined) {
      throw new Error("--dir takes a folder");
    }
    const { text, failed } = await compareAll({ outputsDir });
    process.stdout.write(text);
    if (failed) process.exitCode = 1;
  } catch (error) {
    // A file's content is never echoed: only the kind of failure.
    process.stderr.write(
      `qa-compare failed (${error instanceof Error ? error.name : "unknown error"})\n`,
    );
    process.exitCode = 1;
  }
}
