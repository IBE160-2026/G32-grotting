import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  extractCvText,
  FIXTURES_DIR,
  fixtureIds,
} from "../../../scripts/extract-fixture-cv";
import { answerKeySchema, fixtureMetaSchema } from "./answer-key";
import { canon } from "./canon";

const ids = await fixtureIds();

const read = (folder: string, file: string) =>
  readFile(join(folder, file), "utf8").catch(() => undefined);

// Everything wrong with one Fixture folder, as readable lines (FR-28, AD-15).
async function problems(folder: string): Promise<string[]> {
  const found: string[] = [];
  const files = {
    cv: await read(folder, "cv.txt"),
    ad: await read(folder, "ad.txt"),
    meta: await read(folder, "meta.json"),
    key: await read(folder, "answer-key.json"),
  };
  for (const [name, content] of Object.entries({
    "cv.txt": files.cv,
    "ad.txt": files.ad,
    "meta.json": files.meta,
    "answer-key.json": files.key,
  })) {
    if (content === undefined) found.push(`${name} is missing`);
  }

  if (files.meta !== undefined) {
    if (!fixtureMetaSchema.safeParse(JSON.parse(files.meta)).success) {
      found.push("meta.json is invalid");
    }
  }
  if (files.key !== undefined) {
    const key = answerKeySchema.safeParse(JSON.parse(files.key));
    if (!key.success) {
      found.push(
        `answer-key.json is invalid: ${JSON.stringify(key.error.issues)}`,
      );
    } else if (files.cv !== undefined) {
      const cv = canon(files.cv).toLowerCase();
      for (const gap of key.data.gaps.rewordable) {
        if (!cv.includes(canon(gap.evidence).toLowerCase())) {
          found.push(`evidence for «${gap.keyword}» is not in cv.txt`);
        }
      }
    }
  }

  const pdf = await readFile(join(folder, "cv.pdf")).catch(() => undefined);
  if (pdf !== undefined && files.cv !== undefined) {
    if (files.cv !== (await extractCvText(pdf))) {
      found.push("cv.txt differs from cv.pdf: run npm run fixtures:extract");
    }
  }
  return found;
}

// A one-page PDF with the given text lines, made by hand for these tests.
function tinyPdf(lines: string[]): Buffer {
  const content = `BT /F1 12 Tf 72 720 Td ${lines
    .map((line) => `(${line}) Tj 0 -16 Td`)
    .join(" ")} ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets = objects.map((object, index) => {
    const offset = out.length;
    out += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${out.indexOf("xref\n")}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

describe("FR-28 Fixtures on disk", () => {
  it("include the Example pair", () => {
    expect(ids).toContain("example-nordic-digital");
  });

  it.each(ids)("%s has nothing wrong (SM-2)", async (id) => {
    expect(await problems(join(FIXTURES_DIR, id))).toEqual([]);
  });
});

describe("FR-28 Fixture checks", () => {
  const created: string[] = [];
  afterEach(async () => {
    await Promise.all(
      created.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
    );
  });

  // A made-up Fixture, valid unless a test changes one file.
  async function madeUp(changes: Record<string, string | Buffer> = {}) {
    const dir = await mkdtemp(join(tmpdir(), "fixture-"));
    created.push(dir);
    const files: Record<string, string | Buffer> = {
      "cv.txt": "Line one\nLine two\n",
      "ad.txt": "An ad",
      "meta.json": '{ "jobTitle": "A", "employer": "B" }',
      "answer-key.json": JSON.stringify({
        keywords: { matched: ["Alpha"], missing: ["Beta"] },
        score: 50,
        mustNotMatch: [],
        gaps: {
          rewordable: [{ keyword: "Beta", evidence: "line TWO" }],
          real: [],
        },
        mustNeverSuggest: [],
      }),
      ...changes,
    };
    await mkdir(dir, { recursive: true });
    for (const [name, content] of Object.entries(files)) {
      await writeFile(join(dir, name), content);
    }
    return dir;
  }

  it("passes a valid Fixture", async () => {
    expect(await problems(await madeUp())).toEqual([]);
  });

  it("names a missing file", async () => {
    const dir = await madeUp();
    await rm(join(dir, "ad.txt"));
    expect(await problems(dir)).toEqual(["ad.txt is missing"]);
  });

  it("fails an invalid Answer key", async () => {
    const dir = await madeUp({ "answer-key.json": "{}" });
    expect((await problems(dir))[0]).toContain("answer-key.json is invalid");
  });

  it("fails evidence that is not in cv.txt", async () => {
    const dir = await madeUp({ "cv.txt": "Something else\n" });
    expect(await problems(dir)).toEqual([
      "evidence for «Beta» is not in cv.txt",
    ]);
  });

  it("fails a cv.txt that differs from cv.pdf, and passes once they agree", async () => {
    const pdf = tinyPdf(["Line one", "Line two", "Line three"]);
    const dir = await madeUp({ "cv.pdf": pdf });
    expect(await problems(dir)).toEqual([
      "cv.txt differs from cv.pdf: run npm run fixtures:extract",
    ]);
    await writeFile(join(dir, "cv.txt"), await extractCvText(pdf));
    expect(await problems(dir)).toEqual([]);
  });
});
